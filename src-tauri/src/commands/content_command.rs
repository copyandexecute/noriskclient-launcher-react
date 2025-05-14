use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use tokio::fs;

use crate::error::{AppError, CommandError};
use crate::state::profile_state::ModSource;
use crate::state::state_manager::State as AppStateManager;
use crate::utils::hash_utils; // For calculate_sha1

#[derive(Serialize, Deserialize, Debug)]
pub struct UninstallContentPayload {
    profile_id: Uuid,
    sha1_hash: Option<String>,
    // Add other parameters here later if needed, e.g., content_type (mod, resourcepack, etc.)
}

async fn uninstall_content_by_sha1_internal(
    profile_id: Uuid,
    sha1_to_delete: &str,
    state_manager: &Arc<AppStateManager>,
) -> crate::error::Result<(usize, usize, bool, bool)> {
    let profile = state_manager
        .profile_manager
        .get_profile(profile_id)
        .await?;

    // Part 1: Remove Modrinth mod entries
    let mut mod_ids_to_remove: Vec<Uuid> = Vec::new();
    for mod_entry in &profile.mods {
        if let ModSource::Modrinth { file_hash_sha1: Some(mod_hash), .. } = &mod_entry.source {
            if mod_hash == sha1_to_delete {
                mod_ids_to_remove.push(mod_entry.id);
                log::debug!(
                    "Internal: Found Modrinth entry for deletion by SHA1: ID={}, ProfileID={}, SHA1={}",
                    mod_entry.id, profile_id, sha1_to_delete
                );
            }
        }
    }

    let mut mod_entries_deleted_count = 0;
    let mut mod_entry_deletion_errors_occurred = false;
    if !mod_ids_to_remove.is_empty() {
        for mod_id in mod_ids_to_remove {
            if let Err(e) = state_manager
                .profile_manager
                .delete_mod(profile_id, mod_id)
                .await
            {
                log::error!(
                    "Internal: Failed to remove Modrinth entry {} (SHA1: {}) from profile {}: {}",
                    mod_id, sha1_to_delete, profile_id, e
                );
                mod_entry_deletion_errors_occurred = true;
            } else {
                mod_entries_deleted_count += 1;
            }
        }
    }

    // Part 2: Delete physical files from asset directories
    let mut asset_files_deleted_count = 0;
    let mut asset_file_deletion_errors_occurred = false;
    match state_manager.profile_manager.get_profile_instance_path(profile_id).await {
        Ok(profile_instance_path) => {
            let asset_dirs_to_scan = vec!["shaders", "resourcepacks", "datapacks"];
            for dir_name in asset_dirs_to_scan {
                let asset_dir_path = profile_instance_path.join(dir_name);
                if asset_dir_path.is_dir() {
                    match fs::read_dir(&asset_dir_path).await {
                        Ok(mut entries) => {
                            while let Some(entry_result) = entries.next_entry().await.map_err(AppError::Io)? {
                                let file_path = entry_result.path();
                                if file_path.is_file() {
                                    match hash_utils::calculate_sha1(&file_path).await {
                                        Ok(file_sha1) => {
                                            if file_sha1 == sha1_to_delete {
                                                if let Err(e) = fs::remove_file(&file_path).await {
                                                    log::error!("Internal: Failed to delete asset file {:?}: {}", file_path, e);
                                                    asset_file_deletion_errors_occurred = true;
                                                } else {
                                                    asset_files_deleted_count += 1;
                                                }
                                            }
                                        }
                                        Err(e) => log::warn!("Internal: Could not calculate SHA1 for file {:?}: {}. Skipping.", file_path, e),
                                    }
                                }
                            }
                        }
                        Err(e) => log::warn!("Internal: Could not read asset directory {:?}: {}. Skipping.", asset_dir_path, e),
                    }
                }
            }
        }
        Err(e) => {
            log::error!("Internal: Failed to get profile instance path for {} to scan asset dirs: {}. Asset file deletion will be skipped.", profile_id, e);
            asset_file_deletion_errors_occurred = true; // Mark as error if path retrieval fails
        }
    }
    Ok((
        mod_entries_deleted_count,
        asset_files_deleted_count,
        mod_entry_deletion_errors_occurred,
        asset_file_deletion_errors_occurred,
    ))
}

#[tauri::command]
pub async fn uninstall_content_from_profile(
    payload: UninstallContentPayload,
) -> Result<(), CommandError> {
    log::info!(
        "Uninstall command received: profile_id={}, sha1_hash={:?}",
        payload.profile_id,
        payload.sha1_hash
    );

    let state_manager = AppStateManager::get().await.map_err(|e| {
        log::error!("Failed to get AppStateManager: {}", e);
        CommandError::from(AppError::Other(format!("Failed to get internal state: {}", e)))
    })?;

    if let Some(sha1_hash_to_delete) = payload.sha1_hash {
        log::info!(
            "Proceeding with uninstallation by SHA1: {}",
            sha1_hash_to_delete
        );

        match uninstall_content_by_sha1_internal(
            payload.profile_id, 
            &sha1_hash_to_delete, 
            &state_manager
        ).await {
            Ok((mod_count, asset_count, mod_errors, asset_errors)) => {
                if mod_count == 0 && asset_count == 0 {
                    log::warn!(
                        "No Modrinth entries or asset files found with SHA1 hash '{}' in profile {}.",
                        sha1_hash_to_delete, payload.profile_id
                    );
                    return Err(CommandError::from(AppError::Other(format!(
                        "No content found with SHA1 hash '{}' for profile {}.",
                        sha1_hash_to_delete, payload.profile_id
                    ))));
                }
                if mod_errors || asset_errors {
                    log::error!(
                        "One or more errors occurred during SHA1 uninstallation for profile {}. ModOK: {}, AssetOK: {}. ModErr: {}, AssetErr: {}", 
                        payload.profile_id, mod_count > 0 && !mod_errors, asset_count > 0 && !asset_errors, mod_errors, asset_errors
                    );
                    return Err(CommandError::from(AppError::Other(format!(
                        "Errors occurred while uninstalling content by SHA1 for profile {}. Check logs.",
                        payload.profile_id
                    ))));
                }
                log::info!(
                    "SHA1 uninstallation for profile {} completed. Mod entries removed: {}. Asset files removed: {}.", 
                    payload.profile_id, mod_count, asset_count
                );
                Ok(())
            }
            Err(e) => {
                log::error!("Error during SHA1 uninstallation for profile {}: {}", payload.profile_id, e);
                Err(CommandError::from(e))
            }
        }
    } else {
        // Handle other uninstall criteria in the future or return error
        log::warn!("No SHA1 hash provided and no other uninstall criteria met for profile {}.", payload.profile_id);
        Err(CommandError::from(AppError::Other(
            "No valid uninstallation criteria provided.".to_string(),
        )))
    }
} 