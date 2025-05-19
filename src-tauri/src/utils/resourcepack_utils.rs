use crate::error::{AppError, Result};
use crate::integrations::modrinth;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;
use crate::utils::hash_utils;
use futures::future::join_all;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::sync::Semaphore;

/// Represents a resourcepack found in the profile directory
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResourcePackInfo {
    /// Filename of the resourcepack (e.g. "awesome_pack.zip")
    pub filename: String,
    /// Full path to the resourcepack file
    pub path: String,
    /// SHA1 hash of the file
    pub sha1_hash: Option<String>,
    /// File size in bytes
    pub file_size: u64,
    /// True if the resourcepack is disabled (.disabled extension)
    pub is_disabled: bool,
    /// Optional Modrinth information if the pack was found on Modrinth
    pub modrinth_info: Option<ResourcePackModrinthInfo>,
}

/// Modrinth information for a resourcepack
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResourcePackModrinthInfo {
    /// Modrinth project ID
    pub project_id: String,
    /// Modrinth version ID
    pub version_id: String,
    /// Name of the resourcepack on Modrinth
    pub name: String,
    /// Version string
    pub version_number: String,
    /// Download URL
    pub download_url: String,
}

/// Get all resourcepacks for a profile
pub async fn get_resourcepacks_for_profile(
    profile: &Profile,
    calculate_hashes: bool,
    fetch_modrinth_data: bool,
) -> Result<Vec<ResourcePackInfo>> {
    let state = State::get().await?;
    let io_semaphore = state.io_semaphore.clone();

    debug!(
        "Getting resourcepacks for profile: {} ({}), calculate_hashes: {}, fetch_modrinth_data: {}, using internal semaphore",
        profile.name,
        profile.id,
        calculate_hashes,
        fetch_modrinth_data
    );

    let resourcepacks_dir = get_resourcepacks_dir(profile).await?;
    if !resourcepacks_dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = fs::read_dir(&resourcepacks_dir)
        .await
        .map_err(|e| AppError::Other(format!("Failed to read resourcepacks directory: {}", e)))?;

    let mut resourcepacks = Vec::new();

    if !calculate_hashes {
        debug!("Skipping hash calculation for resource packs, returning basic info.");
        while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Other(format!("Failed to read resourcepack entry: {}", e)))? {
            let path = entry.path();
            if is_resourcepack_file(&path) {
                let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
                let is_disabled = filename.ends_with(".disabled");
                let base_filename = if is_disabled {
                    filename.strip_suffix(".disabled").unwrap_or(&filename).to_string()
                } else {
                    filename.clone()
                };
                let metadata = match fs::metadata(&path).await {
                    Ok(md) => md,
                    Err(e) => {
                        warn!("Failed to get metadata for {}: {}. Skipping pack.", path.display(), e);
                        continue;
                    }
                };
                let file_size = metadata.len();

                resourcepacks.push(ResourcePackInfo {
                    filename: base_filename,
                    path: path.to_string_lossy().into_owned(),
                    sha1_hash: None,
                    file_size,
                    is_disabled,
                    modrinth_info: None,
                });
            }
        }
        info!(
            "Found {} resourcepacks (basic info) for profile {}",
            resourcepacks.len(),
            profile.id
        );
        return Ok(resourcepacks);
    }

    let mut tasks = Vec::new();
    debug!("Scanning resourcepacks directory for valid resource packs and spawning hash tasks...");
    let mut file_count = 0;
    let mut valid_file_paths_for_hashing = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Other(format!("Failed to read resourcepack entry: {}", e)))? {
        file_count += 1;
        let path = entry.path();
        if is_resourcepack_file(&path) {
            valid_file_paths_for_hashing.push(path.clone());
            let semaphore_clone = Arc::clone(&io_semaphore);
            tasks.push(tokio::spawn(async move {
                let permit = semaphore_clone.acquire_owned().await.expect("Semaphore acquisition failed");
                let hash_result = hash_utils::calculate_sha1(&path).await;
                drop(permit); // Explicitly drop permit to release semaphore before task completes fully if needed, though it auto-drops at scope end.
                (path, hash_result)
            }));
        }
    }

    debug!("Awaiting {} hash calculation tasks...", tasks.len());
    let hash_results = join_all(tasks).await;
    debug!("All hash tasks completed.");

    let mut hashes_for_modrinth = Vec::new();
    let mut path_to_info_map: HashMap<String, ResourcePackInfo> = HashMap::new(); // Keyed by SHA1 to update with Modrinth info
    let mut packs_without_successful_hash = Vec::new();

    for (task_index, join_result) in hash_results.into_iter().enumerate() {
        match join_result {
            Ok((path, hash_calc_result)) => {
                let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
                let is_disabled = filename.ends_with(".disabled");
                let base_filename = if is_disabled {
                    filename.strip_suffix(".disabled").unwrap_or(&filename).to_string()
                } else {
                    filename.clone()
                };

                let metadata = match fs::metadata(&path).await {
                     Ok(md) => md,
                     Err(e) => {
                        warn!("Failed to get metadata for {}: {}. Skipping pack.", path.display(), e);
                        continue; // Skip this pack if metadata fails
                     }
                };
                let file_size = metadata.len();

                let current_sha1_hash = match hash_calc_result {
                    Ok(hash) => {
                        debug!("SHA1 hash for {}: {}", filename, hash);
                        hashes_for_modrinth.push(hash.clone());
                        Some(hash)
                    }
                    Err(e) => {
                        warn!("Failed to compute SHA1 hash for {}: {}", filename, e);
                        None
                    }
                };

                let info = ResourcePackInfo {
                    filename: base_filename,
                    path: path.to_string_lossy().into_owned(),
                    sha1_hash: current_sha1_hash.clone(),
                    file_size,
                    is_disabled,
                    modrinth_info: None,
                };

                if let Some(hash_val) = current_sha1_hash {
                    path_to_info_map.insert(hash_val, info);
                } else {
                    packs_without_successful_hash.push(info); // Collect packs that failed hashing
                }
            }
            Err(e) => {
                // This is a JoinError, meaning the task panicked.
                // It's good to log which task failed if possible, though task_index might not directly map to an identifiable file if paths weren't stored with it.
                // For now, just log the panic.
                warn!("Hash calculation task panicked (task index {}): {}", task_index, e);
            }
        }
    }
    
    debug!(
        "Processed {} files/directories, found {} valid resourcepacks for hashing.",
        file_count, valid_file_paths_for_hashing.len()
    );

    if fetch_modrinth_data && !hashes_for_modrinth.is_empty() {
        debug!(
            "Looking up {} resource packs on Modrinth by hash (fetch_modrinth_data is true)...",
            hashes_for_modrinth.len()
        );
        match modrinth::get_versions_by_hashes(hashes_for_modrinth.clone(), "sha1").await {
            Ok(version_map) => {
                debug!(
                    "Modrinth lookup returned {} matches out of {} requested",
                    version_map.len(),
                    hashes_for_modrinth.len()
                );
                for (hash, version) in version_map {
                    if let Some(info_to_update) = path_to_info_map.get_mut(&hash) {
                        if version.project_id.is_empty() || version.id.is_empty() {
                            debug!("Skipping invalid Modrinth data for hash {}: empty project_id or version_id", hash);
                            continue;
                        }
                        if let Some(primary_file) = version.files.iter().find(|f| f.primary) {
                            info_to_update.modrinth_info = Some(ResourcePackModrinthInfo {
                                project_id: version.project_id.clone(),
                                version_id: version.id.clone(),
                                name: version.name.clone(),
                                version_number: version.version_number.clone(),
                                download_url: primary_file.url.clone(),
                            });
                        } else {
                            debug!("No primary file found in Modrinth version for hash {}", hash);
                        }
                    } else {
                        debug!("Received Modrinth data for unknown hash: {}", hash);
                    }
                }
            }
            Err(e) => {
                warn!("Failed to lookup resourcepacks on Modrinth: {}", e);
            }
        }
    } else if !hashes_for_modrinth.is_empty() {
        debug!(
            "Skipping Modrinth lookup for {} resource packs as fetch_modrinth_data is false. Hashes were still computed.",
            hashes_for_modrinth.len()
        );
    } else {
        debug!("No resource pack hashes to lookup on Modrinth (or list was empty).");
    }

    // Combine the successfully hashed (and potentially Modrinth-updated) packs with those that failed hashing.
    resourcepacks.extend(path_to_info_map.into_values());
    resourcepacks.extend(packs_without_successful_hash);

    info!(
        "Found {} total resourcepacks for profile {} (calculate_hashes: {}, fetch_modrinth_data: {})",
        resourcepacks.len(),
        profile.id,
        calculate_hashes,
        fetch_modrinth_data
    );

    Ok(resourcepacks)
}

/// Get the path to the resourcepacks directory for a profile
pub async fn get_resourcepacks_dir(profile: &Profile) -> Result<PathBuf> {
    let state = State::get().await?;
    let base_profiles_dir = state
        .profile_manager
        .calculate_instance_path_for_profile(profile)?;
    let resourcepacks_dir = base_profiles_dir.join("resourcepacks");
    debug!(
        "Resourcepacks directory for profile {}: {}",
        profile.id,
        resourcepacks_dir.display()
    );
    Ok(resourcepacks_dir)
}

/// Check if a path is a resourcepack file
fn is_resourcepack_file(path: &Path) -> bool {
    if !path.is_file() {
        debug!("Skipping non-file path: {}", path.display());
        return false;
    }

    let file_name = match path.file_name().and_then(|s| s.to_str()) {
        Some(name) => name,
        None => {
            debug!("Path has no valid filename: {}", path.display());
            return false;
        }
    };

    // Check for .zip or .zip.disabled extension
    let is_zip = file_name.ends_with(".zip") || file_name.ends_with(".zip.disabled");
    if is_zip {
        debug!("File confirmed as resource pack (zip): {}", path.display());
    } else {
        debug!(
            "File is not a resource pack (not a zip): {}",
            path.display()
        );
    }
    return is_zip;
}

/// Update a resource pack from Modrinth to a new version
pub async fn update_resourcepack_from_modrinth(
    profile: &Profile,
    resourcepack: &ResourcePackInfo,
    new_version: &crate::integrations::modrinth::ModrinthVersion,
) -> Result<()> {
    info!(
        "Updating resource pack '{}' to version {} in profile {}",
        resourcepack.filename, new_version.version_number, profile.id
    );

    // Get the resourcepacks directory
    let resourcepacks_dir = get_resourcepacks_dir(profile).await?;

    // Check if the directory exists, create if not
    if !resourcepacks_dir.exists() {
        debug!(
            "Creating resourcepacks directory for profile: {}",
            profile.id
        );
        fs::create_dir_all(&resourcepacks_dir).await.map_err(|e| {
            AppError::Other(format!("Failed to create resourcepacks directory: {}", e))
        })?;
    }

    // Find and delete the old file (including .disabled variant)
    let old_path = resourcepacks_dir.join(&resourcepack.filename);
    let old_path_disabled = resourcepacks_dir.join(format!("{}.disabled", resourcepack.filename));

    let was_disabled = resourcepack.is_disabled;

    // Find the primary file in the new version
    let primary_file = new_version
        .files
        .iter()
        .find(|f| f.primary)
        .ok_or_else(|| {
            AppError::Other(format!(
                "No primary file found for Modrinth version {} (ID: {})",
                new_version.name, new_version.id
            ))
        })?;

    // Check and delete the old file
    if old_path.exists() {
        debug!("Removing old resource pack file: {}", old_path.display());
        fs::remove_file(&old_path).await.map_err(|e| {
            AppError::Other(format!("Failed to remove old resource pack file: {}", e))
        })?;
    } else if old_path_disabled.exists() {
        debug!(
            "Removing old disabled resource pack file: {}",
            old_path_disabled.display()
        );
        fs::remove_file(&old_path_disabled).await.map_err(|e| {
            AppError::Other(format!(
                "Failed to remove old disabled resource pack file: {}",
                e
            ))
        })?;
    } else {
        warn!(
            "Old resource pack file not found: {}",
            resourcepack.filename
        );
    }

    // Use the utility function to download the new content
    use crate::utils::profile_utils::{add_modrinth_content_to_profile, ContentType};

    // Download the new resource pack
    add_modrinth_content_to_profile(
        profile.id,
        new_version.project_id.clone(),
        new_version.id.clone(),
        primary_file.filename.clone(),
        primary_file.url.clone(),
        primary_file.hashes.sha1.clone(),
        Some(new_version.name.clone()),
        Some(new_version.version_number.clone()),
        ContentType::ResourcePack,
    )
    .await?;

    // If the old pack was disabled, disable the new one too
    if was_disabled {
        let new_path = resourcepacks_dir.join(&primary_file.filename);
        let new_path_disabled =
            resourcepacks_dir.join(format!("{}.disabled", primary_file.filename));

        debug!("Old pack was disabled, disabling new pack as well");
        fs::rename(&new_path, &new_path_disabled)
            .await
            .map_err(|e| AppError::Other(format!("Failed to disable new resource pack: {}", e)))?;
    }

    info!(
        "Successfully updated resource pack from '{}' to '{}'",
        resourcepack.filename, primary_file.filename
    );

    Ok(())
}
