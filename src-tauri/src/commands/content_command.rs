use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;
use tokio::fs;

use crate::error::{AppError, CommandError};
use crate::state::profile_state::ModSource;
use crate::state::state_manager::State as AppStateManager;
use crate::utils::hash_utils; // For calculate_sha1
use crate::utils::{shaderpack_utils, resourcepack_utils, datapack_utils, profile_utils};

// Updated InstallContentPayload struct
#[derive(Serialize, Deserialize, Debug)]
pub struct InstallContentPayload {
    profile_id: Uuid,
    project_id: String,
    version_id: String,
    file_name: String,
    download_url: String,
    file_hash_sha1: Option<String>,
    content_name: Option<String>,       // Used as mod_name for mods
    version_number: Option<String>,
    content_type: profile_utils::ContentType, // Use ContentType from profile_utils
    loaders: Option<Vec<String>>,             // Added loaders
    game_versions: Option<Vec<String>>,       // Added game_versions
}

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
            let asset_dirs_to_scan = vec!["shaderpacks", "resourcepacks", "datapacks"];
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
                                        Err(e) => log::warn!("Internal: Could not calculate SHA1 for asset file {:?}: {}. Skipping deletion.", file_path, e),
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
            asset_file_deletion_errors_occurred = true; 
        }
    }
    Ok((
        mod_entries_deleted_count,
        asset_files_deleted_count,
        mod_entry_deletion_errors_occurred,
        asset_file_deletion_errors_occurred,
    ))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ToggleContentPayload {
    profile_id: Uuid,
    sha1_hash: Option<String>,
    enabled: bool,
    norisk_mod_identifier: Option<crate::state::profile_state::NoriskModIdentifier>,
    content_type: Option<profile_utils::ContentType>, // Added for targeted toggling
}

/// Helper function to toggle a single asset file (shader, resourcepack, datapack)
async fn toggle_single_asset_file(
    asset_path_str: &str,
    asset_filename_str: &str, // Base name, e.g., "coolpack.zip"
    asset_is_disabled: bool,
    target_enabled_state: bool,
    asset_type_name: &str, // For logging, e.g., "shader pack"
) -> Result<(), AppError> {
    let asset_path = PathBuf::from(asset_path_str);
    log::debug!(
        "Processing {} to toggle: {:?} (current_disabled: {}, target_enabled: {}).",
        asset_type_name,
        asset_path,
        asset_is_disabled,
        target_enabled_state
    );

    // If current disabled state is the inverse of target enabled state, it's already correct.
    // e.g., asset_is_disabled = true, target_enabled_state = false -> already disabled
    // e.g., asset_is_disabled = false, target_enabled_state = true -> already enabled
    if asset_is_disabled == !target_enabled_state {
        log::info!(
            "{} {:?} is already in the desired state (enabled: {}).",
            asset_type_name,
            asset_path,
            target_enabled_state
        );
        return Ok(()); // Already in desired state
    }

    let new_path = if target_enabled_state {
        // To enable: ensure filename does NOT end with .disabled
        // Use the base asset_filename_str. strip_suffix on it is for robustness if it somehow had .disabled
        asset_path.with_file_name(asset_filename_str.strip_suffix(".disabled").unwrap_or(asset_filename_str))
    } else {
        // To disable: ensure filename DOES end with .disabled
        asset_path.with_file_name(format!("{}.disabled", asset_filename_str))
    };

    log::info!(
        "Toggling {}: {:?} -> {:?}",
        asset_type_name,
        asset_path,
        new_path
    );

    fs::rename(&asset_path, &new_path).await.map_err(|e| {
        log::error!(
            "Failed to toggle {} {:?}: {}",
            asset_type_name,
            asset_path,
            e
        );
        AppError::Io(e) // Or a more specific error type if created
    })
}

#[tauri::command]
pub async fn toggle_content_from_profile(
    payload: ToggleContentPayload,
) -> Result<(), CommandError> {
    log::info!(
        "Attempting to toggle content state: profile_id={}, sha1_hash={:?}, enabled={}, norisk_mod_identifier={:?}, content_type={:?}",
        payload.profile_id,
        payload.sha1_hash,
        payload.enabled,
        payload.norisk_mod_identifier,
        payload.content_type
    );

    let state_manager = AppStateManager::get().await.map_err(|e| {
        log::error!("Failed to get AppStateManager: {}", e);
        CommandError::from(AppError::Other(format!("Failed to get internal state: {}", e)))
    })?;

    // Handle NoRisk Pack item toggling if the identifier is provided
    if let Some(norisk_mod_identifier) = payload.norisk_mod_identifier {
        log::info!(
            "Toggling NoRisk Pack item state: profile={}, pack={}, mod={}, disabled={}",
            payload.profile_id,
            norisk_mod_identifier.pack_id,
            norisk_mod_identifier.mod_id,
            !payload.enabled
        );
        
        // Clone the fields needed for logging
        let pack_id = norisk_mod_identifier.pack_id.clone();
        let mod_id = norisk_mod_identifier.mod_id.clone();
        
        // Call set_norisk_mod_status with the appropriate parameters
        match state_manager
            .profile_manager
            .set_norisk_mod_status(
                payload.profile_id,
                norisk_mod_identifier.pack_id,
                norisk_mod_identifier.mod_id,
                norisk_mod_identifier.game_version,
                norisk_mod_identifier.loader,
                !payload.enabled, // Note: disabled = !enabled
            )
            .await
        {
            Ok(_) => {
                log::info!(
                    "Successfully toggled NoRisk Pack item state for pack_id={}, mod_id={} to enabled={}",
                    pack_id,
                    mod_id,
                    payload.enabled
                );
                return Ok(());
            }
            Err(e) => {
                log::error!(
                    "Failed to toggle NoRisk Pack item state: {}",
                    e
                );
                return Err(CommandError::from(e));
            }
        }
    }

    // Continue with SHA1-based content toggling if not a NoRisk Pack item
    let current_sha1_hash = match payload.sha1_hash {
        Some(ref hash) => hash.clone(),
        None => {
            log::warn!("SHA1 hash is required for the current toggle implementation when not toggling a NoRisk Pack item.");
            return Err(CommandError::from(AppError::Other(
                "SHA1 hash is required for this toggle operation when not toggling a NoRisk Pack item.".to_string(),
            )));
        }
    };

    let profile = state_manager
        .profile_manager
        .get_profile(payload.profile_id)
        .await
        .map_err(CommandError::from)?;

    let mut mod_entries_toggled_count = 0;
    let mut mod_entry_toggle_errors = false;
    let mut asset_files_toggled_count = 0;
    let mut asset_file_toggle_errors = false;

    // --- Phase 1: Toggle Modrinth Mod Entries (in profile.mods list) ---
    // Always check mods if SHA1 is provided, as it's a primary place for managed content.
    // If content_type is explicitly Mod, we'd primarily expect a hit here.
    // If content_type is an asset, a mod might still share a SHA1 if manually placed or due to other reasons.
    for mod_entry in profile.mods.iter() { 
        if let ModSource::Modrinth { file_hash_sha1: Some(mod_hash), .. } = &mod_entry.source {
            if mod_hash == &current_sha1_hash {
                if mod_entry.enabled == payload.enabled {
                    log::info!("Mod entry {} in profile {} is already state enabled={}. Skipping DB update.", mod_entry.id, payload.profile_id, payload.enabled);
                    mod_entries_toggled_count += 1; // Count as processed even if no change needed
                    continue;
                }
                match state_manager
                    .profile_manager
                    .set_mod_enabled(payload.profile_id, mod_entry.id, payload.enabled)
                    .await
                {
                    Ok(_) => {
                        log::info!("Successfully toggled Modrinth entry {} in profile {} to enabled={}.", mod_entry.id, payload.profile_id, payload.enabled);
                        mod_entries_toggled_count += 1;
                    }
                    Err(e) => {
                        log::error!("Failed to toggle Modrinth entry {} (SHA1: {}) in profile {}: {}", mod_entry.id, current_sha1_hash, payload.profile_id, e);
                        mod_entry_toggle_errors = true;
                    }
                }
            }
        }
    }
    
    // --- Phase 2: Toggle Asset Files (ShaderPacks, ResourcePacks, DataPacks) ---
    // Only proceed with asset file toggling if a specific asset content_type is given,
    // or if content_type is None (in which case, for safety, we might scan all - though for optimization, we avoid this if possible).
    // For this optimization: if content_type is Some(AssetType), only scan that type.
    // If content_type is Some(Mod) or None, and a mod was already toggled above, we might stop to avoid asset scans.
    // However, if a mod was NOT found by SHA1, and type is None, we might fall back to scanning assets.
    //
    // Revised logic for Phase 2:
    // Only enter this phase if payload.content_type targets an asset type.
    match payload.content_type {
        Some(profile_utils::ContentType::ShaderPack) => {
            log::debug!("Targeted toggle for ShaderPacks with SHA1: {}", current_sha1_hash);
            match shaderpack_utils::get_shaderpacks_for_profile(&profile).await {
                Ok(shader_packs) => {
                    for pack_info in shader_packs {
                        if pack_info.sha1_hash.as_deref() == Some(&current_sha1_hash) {
                            match toggle_single_asset_file(
                                &pack_info.path,
                                &pack_info.filename,
                                pack_info.is_disabled,
                                payload.enabled,
                                "shader pack"
                            ).await {
                                Ok(_) => asset_files_toggled_count += 1,
                                Err(_) => asset_file_toggle_errors = true,
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Failed to list shader packs for profile {}: {}. Skipping shader toggle.", payload.profile_id, e);
                    asset_file_toggle_errors = true;
                }
            }
        }
        Some(profile_utils::ContentType::ResourcePack) => {
            log::debug!("Targeted toggle for ResourcePacks with SHA1: {}", current_sha1_hash);
            match resourcepack_utils::get_resourcepacks_for_profile(&profile, true, false).await {
                Ok(resource_packs) => {
                    for pack_info in resource_packs {
                        if pack_info.sha1_hash.as_deref() == Some(&current_sha1_hash) {
                            match toggle_single_asset_file(
                                &pack_info.path,
                                &pack_info.filename,
                                pack_info.is_disabled,
                                payload.enabled,
                                "resource pack"
                            ).await {
                                Ok(_) => asset_files_toggled_count += 1,
                                Err(_) => asset_file_toggle_errors = true,
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Failed to list resource packs for profile {}: {}. Skipping resource pack toggle.", payload.profile_id, e);
                    asset_file_toggle_errors = true;
                }
            }
        }
        Some(profile_utils::ContentType::DataPack) => {
            log::debug!("Targeted toggle for DataPacks with SHA1: {}", current_sha1_hash);
            match datapack_utils::get_datapacks_for_profile(&profile).await {
                Ok(data_packs) => {
                    for pack_info in data_packs {
                        if pack_info.sha1_hash.as_deref() == Some(&current_sha1_hash) {
                            match toggle_single_asset_file(
                                &pack_info.path,
                                &pack_info.filename,
                                pack_info.is_disabled,
                                payload.enabled,
                                "datapack"
                            ).await {
                                Ok(_) => asset_files_toggled_count += 1,
                                Err(_) => asset_file_toggle_errors = true,
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Failed to list datapacks for profile {}: {}. Skipping datapack toggle.", payload.profile_id, e);
                    asset_file_toggle_errors = true;
                }
            }
        }
        Some(profile_utils::ContentType::Mod) => {
            // Mod type was handled in Phase 1. If mod_entries_toggled_count is 0 here, it means no mod matched.
            // No further asset scanning is done if ContentType::Mod was specified.
            log::debug!("ContentType::Mod specified, mod processing already done in Phase 1.");
            if mod_entries_toggled_count == 0 {
                 log::warn!(
                    "ContentType::Mod specified, but no Modrinth entry found with SHA1 '{}' in profile {} to toggle.",
                    current_sha1_hash, payload.profile_id
                );
                // We don't return an error here yet, as the final check below will handle it if nothing at all was toggled.
            }
        }
        None => {
            // ContentType is None. This case is tricky for optimization.
            // Current "safe" behavior without content_type was to scan all.
            // For this optimization, if mods were checked (Phase 1) and nothing was found,
            // and no specific asset type was given, we might log a warning or error.
            // If a mod WAS found and toggled in Phase 1, we likely don't need to scan assets.
            // However, if a mod was NOT found and no content type was given, we might log a warning or error.
            if mod_entries_toggled_count > 0 {
                 log::debug!("ContentType is None, but a mod was found and toggled by SHA1. Skipping asset scans.");
            } else {
                // No mod found by SHA1, and no content type specified.
                // This implies the SHA1 might belong to an unmanaged asset or an asset whose type isn't known by the frontend.
                // To maintain previous exhaustive behavior (at the cost of performance for this specific call),
                // one *could* scan all asset types here as a fallback.
                // However, for the purpose of this specific optimization task, if type is None and no mod matched,
                // we'll assume the frontend should have provided a type if it was an asset.
                // For now, we'll log and the final check will determine if an error is returned.
                log::warn!(
                    "ContentType is None and no Modrinth entry found with SHA1 '{}'. \
                    For targeted asset toggling, provide content_type. \
                    No asset folders will be scanned in this specific optimized path if a mod wasn't found.",
                    current_sha1_hash
                );
            }
        }
    }
    
    // --- Datapacks: Toggling not yet implemented by SHA1, as they are often not single files with clear SHA1s from Modrinth directly in profile list ---
    // Future: Could scan datapacks directory if needed, similar to uninstall, but toggling implies individual file identity.

    if mod_entries_toggled_count == 0 && asset_files_toggled_count == 0 {
        log::warn!(
            "No Modrinth entries, shader packs, resource packs, or datapacks found with SHA1 '{}' in profile {} to toggle.",
            current_sha1_hash, payload.profile_id
        );
        return Err(CommandError::from(AppError::Other(format!(
            "No content with SHA1 '{}' found in profile {} to toggle (mods, shaders, resourcepacks, datapacks).",
            current_sha1_hash, payload.profile_id
        ))));
    }

    if mod_entry_toggle_errors || asset_file_toggle_errors {
        log::error!(
            "One or more errors occurred while toggling content for SHA1 '{}' in profile {}. ModToggleOK: {}, AssetToggleOK: {}. ModToggleErr: {}, AssetToggleErr: {}", 
            current_sha1_hash, payload.profile_id, 
            mod_entries_toggled_count > 0 && !mod_entry_toggle_errors, 
            asset_files_toggled_count > 0 && !asset_file_toggle_errors, 
            mod_entry_toggle_errors, asset_file_toggle_errors
        );
        return Err(CommandError::from(AppError::Other(format!(
            "Errors occurred while toggling content for profile {}. Check logs.", 
            payload.profile_id
        ))));
    }
    
    log::info!(
        "Content toggle for SHA1 '{}' in profile {} processed. Modrinth entries processed: {}. Asset files (shaders, rpacks, datapacks) processed: {}.", 
        current_sha1_hash, payload.profile_id, mod_entries_toggled_count, asset_files_toggled_count
    );
    Ok(())
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

#[tauri::command]
pub async fn install_content_to_profile(payload: InstallContentPayload) -> Result<(), CommandError> {
    log::info!(
        "Executing install_content_to_profile for profile {} with content type {:?}",
        payload.profile_id,
        payload.content_type
    );

    match payload.content_type {
        profile_utils::ContentType::Mod => {
            log::info!("Attempting to install mod using profile_command::add_modrinth_mod_to_profile");
            crate::commands::profile_command::add_modrinth_mod_to_profile(
                payload.profile_id,
                payload.project_id,
                payload.version_id,
                payload.file_name,
                payload.download_url,
                payload.file_hash_sha1,
                payload.content_name, // Maps to mod_name
                payload.version_number,
                payload.loaders,      // Pass loaders
                payload.game_versions // Pass game_versions
            )
            .await
        }
        profile_utils::ContentType::ResourcePack => {
            profile_utils::add_modrinth_content_to_profile(
                payload.profile_id,
                payload.project_id,
                payload.version_id,
                payload.file_name,
                payload.download_url,
                payload.file_hash_sha1,
                payload.content_name,
                payload.version_number,
                profile_utils::ContentType::ResourcePack,
            )
            .await
            .map_err(CommandError::from)
        }
        profile_utils::ContentType::ShaderPack => {
            profile_utils::add_modrinth_content_to_profile(
                payload.profile_id,
                payload.project_id,
                payload.version_id,
                payload.file_name,
                payload.download_url,
                payload.file_hash_sha1,
                payload.content_name,
                payload.version_number,
                profile_utils::ContentType::ShaderPack,
            )
            .await
            .map_err(CommandError::from)
        }
        profile_utils::ContentType::DataPack => {
            profile_utils::add_modrinth_content_to_profile(
                payload.profile_id,
                payload.project_id,
                payload.version_id,
                payload.file_name,
                payload.download_url,
                payload.file_hash_sha1,
                payload.content_name,
                payload.version_number,
                profile_utils::ContentType::DataPack,
            )
            .await
            .map_err(CommandError::from)
        }
        // No default needed as ContentType from profile_utils is an enum and all variants are handled
    }
} 