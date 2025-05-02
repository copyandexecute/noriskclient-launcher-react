use crate::config::{LAUNCHER_DIRECTORY, ProjectDirsExt};
use crate::error::{AppError, Result};
use crate::minecraft::dto::piston_meta::AssetIndex;
use log::{debug, error, info, warn};
use std::path::PathBuf;
use tokio::fs;
use std::env;
use crate::state::event_state::{EventPayload, EventType};
use crate::state::State;
use uuid::Uuid;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::io::{Cursor, Read}; // Needed for reading NBT from bytes and decompression
use fastnbt::from_bytes; // NBT deserialization
use fastnbt::value::Value; // Access NBT values
use std::collections::HashMap; // To represent NBT Compound
use flate2::read::GzDecoder; // GZip decompression

// --- Struct for World Info ---
#[derive(Debug, Clone, serde::Serialize)]
pub struct WorldInfo {
    pub folder_name: String,
    pub display_name: Option<String>,
    pub last_played: Option<i64>,
    pub icon_path: Option<PathBuf>,
}

// --- NBT Structures (simplified for what we need) ---
#[derive(serde::Deserialize, Debug)]
struct LevelDat {
    #[serde(rename = "Data")]
    data: LevelData,
}

#[derive(serde::Deserialize, Debug)]
struct LevelData {
    #[serde(rename = "LevelName")]
    level_name: Option<String>,
    #[serde(rename = "LastPlayed")]
    last_played: Option<i64>,
    // Add other fields if needed later
}

/// Returns the path to the default .minecraft directory based on OS
pub fn get_default_minecraft_dir() -> PathBuf {
    if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\.minecraft
        match env::var("APPDATA") {
            Ok(app_data) => PathBuf::from(app_data).join(".minecraft"),
            Err(_) => {
                warn!("[MC Utils] Failed to get APPDATA environment variable");
                // Fallback to user profile directory
                match dirs::home_dir() {
                    Some(home) => home.join("AppData").join("Roaming").join(".minecraft"),
                    None => PathBuf::new(), // Empty path if we can't find it
                }
            }
        }
    } else if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/minecraft
        match dirs::home_dir() {
            Some(home) => home.join("Library").join("Application Support").join("minecraft"),
            None => PathBuf::new(),
        }
    } else {
        // Linux and others: ~/.minecraft
        match dirs::home_dir() {
            Some(home) => home.join(".minecraft"),
            None => PathBuf::new(),
        }
    }
}

/// Checks if standard Minecraft assets can be reused and copies them if possible
/// Returns Ok(true) if assets were copied, Ok(false) if they weren't
pub async fn try_reuse_minecraft_assets(asset_index: &AssetIndex) -> Result<bool> {
    try_reuse_minecraft_assets_with_progress(asset_index, Uuid::nil()).await
}

/// Version of try_reuse_minecraft_assets that reports progress events
pub async fn try_reuse_minecraft_assets_with_progress(asset_index: &AssetIndex, profile_id: Uuid) -> Result<bool> {
    // Try to get state for events
    let state = if profile_id != Uuid::nil() {
        match State::get().await {
            Ok(s) => Some(s),
            Err(e) => {
                warn!("[MC Utils] Couldn't get state for events: {}", e);
                None
            }
        }
    } else {
        None
    };
    
    // Send initial progress event
    if let Some(state_ref) = &state {
        emit_reuse_progress(
            state_ref,
            profile_id,
            &format!("Checking for existing Minecraft assets (index: {})", asset_index.id),
            0.01,
            None
        ).await?;
    }
    
    // Log what we're trying to do
    info!("[MC Utils] Checking for existing Minecraft assets (index: {})", asset_index.id);
    
    // Get paths
    let default_mc_dir = get_default_minecraft_dir();
    if !default_mc_dir.exists() {
        info!("[MC Utils] Default Minecraft directory not found at: {}", default_mc_dir.display());
        
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                "No existing Minecraft installation found, will download assets directly",
                0.05,
                None
            ).await?;
        }
        
        return Ok(false);
    }
    
    // Progress update
    if let Some(state_ref) = &state {
        emit_reuse_progress(
            state_ref,
            profile_id,
            &format!("Found Minecraft directory at: {}", default_mc_dir.display()),
            0.05,
            None
        ).await?;
    }
    
    let source_indexes_dir = default_mc_dir.join("assets").join("indexes");
    let source_index_file = source_indexes_dir.join(format!("{}.json", asset_index.id));
    
    // Check if the source index file exists
    if !source_index_file.exists() {
        info!("[MC Utils] Asset index file not found at: {}", source_index_file.display());
        
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                &format!("Asset index {} not found in existing Minecraft installation", asset_index.id),
                0.05,
                None
            ).await?;
        }
        
        return Ok(false);
    }
    
    // Get destination dirs
    let dest_assets_dir = LAUNCHER_DIRECTORY.meta_dir().join("assets");
    let dest_indexes_dir = dest_assets_dir.join("indexes");
    let dest_index_file = dest_indexes_dir.join(format!("{}.json", asset_index.id));
    
    // Check if we already have the assets
    if dest_index_file.exists() {
        debug!("[MC Utils] Asset index already exists in launcher directory");
        
        // Check if size matches
        match fs::metadata(&dest_index_file).await {
            Ok(metadata) => {
                if metadata.len() as i64 == asset_index.size {
                    info!("[MC Utils] Asset index already exists with correct size, no need to copy");
                    
                    if let Some(state_ref) = &state {
                        emit_reuse_progress(
                            state_ref,
                            profile_id,
                            "Asset index already exists with correct size, no need to copy",
                            0.1,
                            None
                        ).await?;
                    }
                    
                    return Ok(false); // Already have it with correct size
                }
                info!("[MC Utils] Asset index exists but size mismatch, will copy from default MC dir");
            },
            Err(e) => {
                warn!("[MC Utils] Failed to get metadata for existing asset index: {}", e);
            }
        }
    }
    
    // Progress update
    if let Some(state_ref) = &state {
        emit_reuse_progress(
            state_ref,
            profile_id,
            "Found existing Minecraft assets, preparing to copy",
            0.1,
            None
        ).await?;
    }
    
    // Create destination directories if they don't exist
    info!("[MC Utils] Creating asset directories if needed");
    fs::create_dir_all(&dest_indexes_dir).await?;
    fs::create_dir_all(dest_assets_dir.join("objects")).await?;
    
    // Copy the index file
    info!("[MC Utils] Copying asset index from: {}", source_index_file.display());
    match fs::copy(&source_index_file, &dest_index_file).await {
        Ok(_) => {
            info!("[MC Utils] Successfully copied asset index file");
            
            // Progress update
            if let Some(state_ref) = &state {
                emit_reuse_progress(
                    state_ref,
                    profile_id,
                    "Successfully copied asset index file",
                    0.15,
                    None
                ).await?;
            }
        },
        Err(e) => {
            error!("[MC Utils] Failed to copy asset index file: {}", e);
            
            // Error progress update
            if let Some(state_ref) = &state {
                emit_reuse_progress(
                    state_ref,
                    profile_id,
                    &format!("Failed to copy asset index file: {}", e),
                    0.15,
                    Some(e.to_string())
                ).await?;
            }
            
            return Err(AppError::Io(e));
        }
    }
    
    // Copy the assets (objects)
    let source_objects_dir = default_mc_dir.join("assets").join("objects");
    let dest_objects_dir = dest_assets_dir.join("objects");
    
    if !source_objects_dir.exists() {
        warn!("[MC Utils] Source objects directory not found at: {}", source_objects_dir.display());
        
        // Progress update
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                "Copied index but assets directory not found, will download assets directly",
                0.2,
                None
            ).await?;
        }
        
        // Still return Ok(true) because we copied the index file
        return Ok(true);
    }
    
    // Read index file to get list of objects
    let index_content = fs::read_to_string(&dest_index_file).await?;
    let index_json: serde_json::Value = serde_json::from_str(&index_content)?;
    
    // Extract the objects
    if let Some(objects) = index_json.get("objects").and_then(|o| o.as_object()) {
        let total_objects = objects.len();
        info!("[MC Utils] Found {} assets to copy", total_objects);
        
        // Progress update
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                &format!("Found {} assets to reuse from existing Minecraft installation", total_objects),
                0.2,
                None
            ).await?;
        }
        
        let mut copied_count = 0;
        let mut skipped_count = 0;
        let mut error_count = 0;
        
        // Use atomic counters for progress tracking
        let progress_counter = Arc::new(AtomicUsize::new(0));
        let total_count = objects.len();
        
        // Batch size for progress updates - update every 5% or 100 files, whichever is smaller
        let update_batch = (total_count / 20).max(1).min(100);
        
        for (asset_name, object) in objects {
            if let (Some(hash), Some(size)) = (object.get("hash").and_then(|h| h.as_str()), 
                                               object.get("size").and_then(|s| s.as_i64())) {
                // Create hash folder (first 2 chars of hash)
                let hash_prefix = &hash[0..2];
                let source_hash_dir = source_objects_dir.join(hash_prefix);
                let dest_hash_dir = dest_objects_dir.join(hash_prefix);
                
                // Create destination hash directory if it doesn't exist
                if !dest_hash_dir.exists() {
                    if let Err(e) = fs::create_dir_all(&dest_hash_dir).await {
                        error!("[MC Utils] Failed to create hash directory {}: {}", dest_hash_dir.display(), e);
                        error_count += 1;
                        continue;
                    }
                }
                
                let source_file = source_hash_dir.join(hash);
                let dest_file = dest_hash_dir.join(hash);
                
                // Skip if dest file already exists with correct size
                if dest_file.exists() {
                    match fs::metadata(&dest_file).await {
                        Ok(metadata) => {
                            if metadata.len() as i64 == size {
                                debug!("[MC Utils] Asset already exists with correct size: {}", hash);
                                skipped_count += 1;
                                
                                // Update progress counter
                                let progress = progress_counter.fetch_add(1, Ordering::SeqCst) + 1;
                                
                                // Report progress periodically
                                if let Some(state_ref) = &state {
                                    let percent_complete = progress as f64 / total_count as f64;
                                    let scaled_progress = 0.2 + (percent_complete * 0.7); // Scale from 20% to 90%
                                    
                                    emit_reuse_progress(
                                        state_ref,
                                        profile_id,
                                        &format!("Reusing Minecraft assets: {}/{} files processed", progress, total_count),
                                        scaled_progress,
                                        None
                                    ).await?;
                                }
                                
                                continue;
                            }
                        },
                        Err(e) => {
                            warn!("[MC Utils] Failed to get metadata for existing asset: {}", e);
                        }
                    }
                }
                
                // Copy the file
                if source_file.exists() {
                    match fs::copy(&source_file, &dest_file).await {
                        Ok(_) => {
                            debug!("[MC Utils] Copied asset: {} ({})", hash, asset_name);
                            copied_count += 1;
                        },
                        Err(e) => {
                            error!("[MC Utils] Failed to copy asset {}: {}", hash, e);
                            error_count += 1;
                        }
                    }
                } else {
                    debug!("[MC Utils] Source asset not found: {}", source_file.display());
                    error_count += 1;
                }
                
                // Update progress counter
                let progress = progress_counter.fetch_add(1, Ordering::SeqCst) + 1;
                
                // Report progress periodically
                if let Some(state_ref) = &state {
                    let percent_complete = progress as f64 / total_count as f64;
                    let scaled_progress = 0.2 + (percent_complete * 0.7); // Scale from 20% to 90%
                    
                    emit_reuse_progress(
                        state_ref,
                        profile_id,
                        &format!("Reusing Minecraft assets: {}/{} files processed", progress, total_count),
                        scaled_progress,
                        None
                    ).await?;
                }
            }
        }
        
        info!("[MC Utils] Assets copy summary: copied {}, skipped {}, errors {}", 
              copied_count, skipped_count, error_count);
              
        // Final progress update
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                &format!("Successfully reused Minecraft assets: copied {}, reused {}, errors {}", 
                    copied_count, skipped_count, error_count),
                0.95,
                None
            ).await?;
        }
    } else {
        warn!("[MC Utils] Failed to parse objects from asset index");
        
        // Error progress update
        if let Some(state_ref) = &state {
            emit_reuse_progress(
                state_ref,
                profile_id,
                "Failed to parse objects from asset index",
                0.5,
                Some("Parse error".to_string())
            ).await?;
        }
    }
    
    Ok(true)
}

/// Helper function to emit progress events for asset reuse
async fn emit_reuse_progress(
    state: &State,
    profile_id: Uuid,
    message: &str,
    progress: f64,
    error: Option<String>,
) -> Result<Uuid> {
    let event_id = Uuid::new_v4();
    state
        .emit_event(EventPayload {
            event_id,
            event_type: EventType::ReusingMinecraftAssets,
            target_id: Some(profile_id),
            message: message.to_string(),
            progress: Some(progress),
            error,
        })
        .await?;
    Ok(event_id)
}

// --- New Function to Get Profile Worlds ---
/// Lists the singleplayer worlds found in the profile's saves directory.
/// Currently only returns the folder name.
pub async fn get_profile_worlds(profile_id: Uuid) -> Result<Vec<WorldInfo>> {
    info!("[Worlds] Getting worlds for profile {}", profile_id);
    let state = State::get().await?;

    // Try to get the user profile first, or fall back to standard profile if ID matches
    let profile = match state.profile_manager.get_profile(profile_id).await {
        Ok(p) => {
            info!("[Worlds] Found user profile: {}", p.name);
            p // Found user profile
        }
        Err(AppError::ProfileNotFound(_)) => {
            // Not a user profile, check if it's a standard version
            match state.norisk_version_manager.get_profile_by_id(profile_id).await {
                Some(standard_profile) => {
                    info!("[Worlds] ID {} matches standard profile: {}. Proceeding with standard profile object.", profile_id, standard_profile.name);
                    standard_profile // Use the standard profile object
                }
                None => {
                    error!("[Worlds] Profile ID {} not found as user profile or standard profile.", profile_id);
                    return Err(AppError::ProfileNotFound(profile_id)); // ID not found anywhere
                }
            }
        }
        Err(e) => return Err(e), // Propagate other errors (e.g., IO errors loading profiles.json)
    };

    // Calculate the instance path (this might not be meaningful for standard profiles)
    let instance_path = state.profile_manager.calculate_instance_path_for_profile(&profile)?;
    let saves_path = instance_path.join("saves");
    info!("[Worlds] Checking saves directory: {}", saves_path.display());

    if !saves_path.is_dir() {
        // This will likely be true for standard profiles
        info!("[Worlds] Saves directory not found or not a directory for profile '{}' (path: {}). Returning empty list.", profile.name, saves_path.display());
        return Ok(Vec::new());
    }

    let mut worlds = Vec::new();
    let mut read_dir = fs::read_dir(&saves_path).await?;

    while let Some(entry_result) = read_dir.next_entry().await? {
        let entry_path = entry_result.path();
        // Check if it's a directory AND contains a level.dat file
        if entry_path.is_dir() {
            let level_dat_path = entry_path.join("level.dat");
            if level_dat_path.is_file() {
                if let Some(folder_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                    // Basic filtering: ignore folders starting with "."
                    if !folder_name.starts_with(".") {
                        let mut world_info = WorldInfo {
                            folder_name: folder_name.to_string(),
                            display_name: None,
                            last_played: None,
                            icon_path: None,
                        };

                        // Try to read and decompress level.dat
                        match fs::read(&level_dat_path).await {
                            Ok(compressed_bytes) => {
                                let mut decoder = GzDecoder::new(&compressed_bytes[..]);
                                let mut decompressed_bytes = Vec::new();
                                match decoder.read_to_end(&mut decompressed_bytes) {
                                    Ok(_) => {
                                        // Now parse the decompressed bytes
                                        match from_bytes::<LevelDat>(&decompressed_bytes) {
                                            Ok(level_dat) => {
                                                info!("[Worlds] Parsed level.dat for '{}': Name={:?}, LastPlayed={:?}", 
                                                    folder_name, level_dat.data.level_name, level_dat.data.last_played);
                                                world_info.display_name = level_dat.data.level_name;
                                                world_info.last_played = level_dat.data.last_played;
                                            }
                                            Err(e) => {
                                                warn!("[Worlds] Failed to parse decompressed NBT for '{}': {}. Path: {}", 
                                                    folder_name, e, level_dat_path.display());
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        warn!("[Worlds] Failed to decompress level.dat for '{}': {}. Path: {}", 
                                            folder_name, e, level_dat_path.display());
                                        // Optionally try parsing without decompression as a fallback?
                                        // match from_bytes::<LevelDat>(&compressed_bytes) { ... }
                                    }
                                }
                            }
                            Err(e) => {
                                warn!("[Worlds] Failed to read level.dat for '{}': {}. Path: {}", 
                                      folder_name, e, level_dat_path.display());
                            }
                        }

                        // Check for icon.png
                        let icon_path = entry_path.join("icon.png");
                        if icon_path.is_file() {
                            info!("[Worlds] Found icon.png for '{}'", folder_name);
                            world_info.icon_path = Some(icon_path);
                        }

                        worlds.push(world_info);
                    } else {
                        debug!("[Worlds] Skipping hidden folder: {}", folder_name);
                    }
                } else {
                     warn!("[Worlds] Skipping entry with non-UTF8 name in saves directory: {:?}", entry_path);
                }
            } else {
                 debug!("[Worlds] Skipping folder without level.dat: {}", entry_path.display());
            }
        }
    }

    // Sort worlds by last played descending (most recent first)
    worlds.sort_by(|a, b| b.last_played.cmp(&a.last_played));

    info!("[Worlds] Found {} valid world(s) for profile {}", worlds.len(), profile_id);
    Ok(worlds)
}

// --- NBT Structures for servers.dat ---
#[derive(serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")] // Match NBT naming convention
struct ServerListNbt {
    servers: Vec<ServerEntryNbt>,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")] // Match NBT naming convention
struct ServerEntryNbt {
    name: Option<String>,
    ip: Option<String>,
    icon: Option<String>, // Base64 encoded icon data
    #[serde(default)] // Handle cases where this field might be missing
    accept_textures: Option<u8>, // 0=prompt, 1=enabled, 2=disabled
    #[serde(default)]
    previews_chat: Option<u8>, // Seems to be boolean (0/1)
}

// --- Struct for Server Info (to be returned) ---
#[derive(Debug, Clone, serde::Serialize)]
pub struct ServerInfo {
    pub name: Option<String>,
    pub address: Option<String>, // Renamed from 'ip' for clarity
    pub icon_base64: Option<String>,
    pub accepts_textures: Option<u8>,
    pub previews_chat: Option<u8>,
}

/// Lists the multiplayer servers found in the profile's servers.dat file.
pub async fn get_profile_servers(profile_id: Uuid) -> Result<Vec<ServerInfo>> {
    info!("[Servers] Getting servers for profile {}", profile_id);
    let state = State::get().await?;

    // Try to get the user profile first, or fall back to standard profile if ID matches
    let profile = match state.profile_manager.get_profile(profile_id).await {
        Ok(p) => {
            info!("[Servers] Found user profile: {}", p.name);
            p // Found user profile
        }
        Err(AppError::ProfileNotFound(_)) => {
            // Not a user profile, check if it's a standard version
            match state.norisk_version_manager.get_profile_by_id(profile_id).await {
                Some(standard_profile) => {
                    info!("[Servers] ID {} matches standard profile: {}. Proceeding with standard profile object.", profile_id, standard_profile.name);
                    standard_profile // Use the standard profile object
                }
                None => {
                    error!("[Servers] Profile ID {} not found as user profile or standard profile.", profile_id);
                    return Err(AppError::ProfileNotFound(profile_id)); // ID not found anywhere
                }
            }
        }
        Err(e) => return Err(e), // Propagate other errors
    };

    // Calculate the instance path
    let instance_path = state.profile_manager.calculate_instance_path_for_profile(&profile)?;
    let servers_dat_path = instance_path.join("servers.dat");
    info!("[Servers] Looking for servers.dat at: {}", servers_dat_path.display());

    if !servers_dat_path.is_file() {
        info!("[Servers] servers.dat not found for profile '{}' (path: {}). Returning empty list.", profile.name, servers_dat_path.display());
        return Ok(Vec::new()); // No servers.dat means no servers saved
    }

    // Read the servers.dat file
    let servers_dat_bytes = match fs::read(&servers_dat_path).await {
        Ok(bytes) => bytes,
        Err(e) => {
            error!("[Servers] Failed to read servers.dat for profile '{}': {}. Path: {}",
                   profile.name, e, servers_dat_path.display());
            return Err(AppError::Io(e));
        }
    };

    // Parse the NBT data (servers.dat is typically *not* GZipped)
    let server_list_nbt: ServerListNbt = match from_bytes(&servers_dat_bytes) {
        Ok(data) => data,
        Err(e) => {
             // Try parsing with GZip decompression as a fallback (less common)
             let mut decoder = GzDecoder::new(&servers_dat_bytes[..]);
             let mut decompressed_bytes = Vec::new();
             if decoder.read_to_end(&mut decompressed_bytes).is_ok() {
                 match from_bytes::<ServerListNbt>(&decompressed_bytes) {
                     Ok(decompressed_data) => {
                         warn!("[Servers] Successfully parsed servers.dat for '{}' after GZip fallback.", profile.name);
                         decompressed_data
                     },
                     Err(decompressed_e) => {
                         error!("[Servers] Failed to parse NBT from servers.dat for '{}' (tried both raw and GZip): Raw Error: {}, GZip Error: {}. Path: {}",
                                profile.name, e, decompressed_e, servers_dat_path.display());
                         return Err(AppError::Nbt(decompressed_e)); // Return the decompression parse error
                     }
                 }
             } else {
                 error!("[Servers] Failed to parse NBT from servers.dat for '{}' and GZip decompression failed: {}. Path: {}",
                        profile.name, e, servers_dat_path.display());
                 return Err(AppError::Nbt(e)); // Return the original parse error
             }
        }
    };

    // Map the NBT structure to our ServerInfo structure
    let server_infos: Vec<ServerInfo> = server_list_nbt.servers.into_iter().map(|nbt_entry| {
        ServerInfo {
            name: nbt_entry.name,
            address: nbt_entry.ip, // Map 'ip' to 'address'
            icon_base64: nbt_entry.icon,
            accepts_textures: nbt_entry.accept_textures,
            previews_chat: nbt_entry.previews_chat,
        }
    }).collect();

    info!("[Servers] Found {} server entries in servers.dat for profile {}", server_infos.len(), profile_id);
    Ok(server_infos)
} 