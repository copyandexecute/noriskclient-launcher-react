use std::path::{Path, PathBuf};
use uuid::Uuid;
use log::{info, warn, error};
use tokio::fs;
use fs_extra::dir::{copy as copy_dir, CopyOptions};
use crate::error::{Result, AppError};
use crate::state::State;
use sanitize_filename;
use std::io::Cursor;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use fastnbt::{from_bytes, to_bytes, Value, error::Error as FastNbtError};

/// Generates a unique, sanitized folder name for a world within a given saves directory.
///
/// Takes a desired display name, sanitizes it for use as a folder name, and appends
/// a counter (e.g., " (1)") if a folder with that name already exists, until a unique
/// name is found.
///
/// # Arguments
/// * `target_saves_path` - The absolute path to the 'saves' directory where the world folder should reside.
/// * `desired_name` - The desired display name for the world.
///
/// # Returns
/// A `Result` containing the unique, sanitized folder name string, or an `AppError`.
pub async fn find_unique_world_folder_name(
    target_saves_path: &Path,
    desired_name: &str,
) -> Result<String> {
    info!(
        "Finding unique world folder name for '{}' in directory '{}'",
        desired_name, target_saves_path.display()
    );

    // Sanitize the desired name to create a base folder name
    let base_folder_name = sanitize_filename::sanitize(desired_name.trim());

    if base_folder_name.is_empty() {
        error!("Desired world name resulted in an empty sanitized folder name.");
        // Fallback to a default name if sanitization leads to empty string
        // This could happen with names consisting only of invalid characters.
        // Consider generating a UUID-based name or similar as a robust fallback.
        // For now, let's try a simple default.
        let default_base = "New_World".to_string();
         warn!("Falling back to default base folder name: {}", default_base);
         // We still need to ensure uniqueness for the default name
         // Box the recursive call to give it a known size
         return Box::pin(find_unique_world_folder_name(target_saves_path, &default_base)).await; 
    }

    let initial_path = target_saves_path.join(&base_folder_name);

    // Check the base name first
    match fs::try_exists(&initial_path).await {
        Ok(false) => {
            info!("Sanitized folder name '{}' is unique.", base_folder_name);
            return Ok(base_folder_name);
        }
        Ok(true) => {
            info!("Path '{}' already exists, starting counter.", initial_path.display());
        }
        Err(e) => {
            error!("Error checking path existence for '{}': {}", initial_path.display(), e);
            return Err(AppError::Io(e));
        }
    }

    // If base name exists, append counter
    let mut counter = 1u32;
    loop {
        // Create suffixed name like "Base Name (1)"
        let suffixed_folder_name = format!("{} ({})", base_folder_name, counter);
        let candidate_path = target_saves_path.join(&suffixed_folder_name);
        // info!("Checking candidate path: {}", candidate_path.display()); // Reduce log verbosity

        match fs::try_exists(&candidate_path).await {
            Ok(false) => {
                info!("Found unique folder name: '{}'", suffixed_folder_name);
                return Ok(suffixed_folder_name);
            }
            Ok(true) => {
                counter = counter.checked_add(1).ok_or_else(|| {
                    error!("Counter overflow finding unique folder name for '{}'", base_folder_name);
                    AppError::Other(format!("Counter overflow for base name '{}'", base_folder_name))
                })?;

                // Safety limit
                if counter > 1000 {
                    error!("Could not find unique folder name for '{}' after {} attempts.", base_folder_name, counter);
                    return Err(AppError::Other(format!(
                        "Too many folders with similar names starting '{}'", base_folder_name
                    )));
                }
            }
            Err(e) => {
                error!("Error checking candidate path '{}': {}", candidate_path.display(), e);
                return Err(AppError::Io(e));
            }
        }
    }
}

/// Copies a singleplayer world directory from a source profile to a target profile.
///
/// # Arguments
///
/// * `source_profile_id` - UUID of the profile containing the source world.
/// * `source_world_folder` - The name of the world folder within the source profile's 'saves' directory.
/// * `target_profile_id` - UUID of the profile where the world should be copied to.
/// * `target_world_name` - The desired display name for the world in the target profile. A unique folder name will be generated.
///
/// # Returns
///
/// Returns `Ok(String)` with the generated target folder name on success, or an `AppError` variant on failure.
pub async fn copy_world_directory(
    source_profile_id: Uuid,
    source_world_folder: &str,
    target_profile_id: Uuid,
    target_world_name: &str,
) -> Result<String> {
    info!(
        "Attempting to copy world '{}' from profile {} to profile {} with desired name '{}'",
        source_world_folder, source_profile_id, target_profile_id, target_world_name
    );

    // Sanitize folder names (basic check)
    if source_world_folder.is_empty() || target_world_name.is_empty() ||
       source_world_folder.contains('/') || source_world_folder.contains('\\') {
        error!("Invalid source world folder name or empty target name provided.");
        return Err(AppError::InvalidInput("Source folder name invalid or target name empty.".to_string()));
    }

    let state = State::get().await?;
    let profile_manager = &state.profile_manager;

    // --- Calculate Paths & Generate Target Folder Name ---
    let source_instance_path = profile_manager.get_profile_instance_path(source_profile_id).await?;
    let source_saves_path = source_instance_path.join("saves");
    let source_world_path = source_saves_path.join(source_world_folder);

    let target_instance_path = profile_manager.get_profile_instance_path(target_profile_id).await?;
    let target_saves_path = target_instance_path.join("saves");

    // Ensure target saves directory exists *before* finding unique name
    info!("Ensuring target saves directory exists: {}", target_saves_path.display());
    fs::create_dir_all(&target_saves_path).await.map_err(|e| {
        error!("Failed to create target saves directory: {}", e);
        AppError::Io(e)
    })?;

    // Find a unique folder name in the target saves directory
    let final_target_folder_name = find_unique_world_folder_name(&target_saves_path, target_world_name).await?;
    let target_world_path = target_saves_path.join(&final_target_folder_name);

    info!("Source world path: {}", source_world_path.display());
    info!("Target world path (generated folder): {}", target_world_path.display());

    // --- Validate Source (Target is implicitly validated by find_unique_world_folder_name) ---
    if !source_world_path.is_dir() {
        error!("Source world directory not found: {}", source_world_path.display());
        return Err(AppError::WorldNotFound {
            profile_id: source_profile_id,
            world_folder: source_world_folder.to_string(),
        });
    }
    if !source_world_path.join("level.dat").is_file() {
        error!("Source world level.dat not found: {}", source_world_path.display());
         return Err(AppError::WorldNotFound {
            profile_id: source_profile_id,
            world_folder: source_world_folder.to_string(),
        });
    }

    // --- TODO: Implement Session Lock Check for source_world_path ---
    // ...

    // --- Copy Directory ---
    info!("Starting directory copy for target folder '{}'...", final_target_folder_name);
    let options = CopyOptions {
        overwrite: false,
        skip_exist: false, // We explicitly want an error if the target exists, checked by find_unique
        content_only: true, // Copy the *content* of source_world_path into target_world_path
        ..Default::default()
    };

    // Create the empty target directory before copying content into it
    fs::create_dir(&target_world_path).await.map_err(|e| {
         error!("Failed to create target world directory '{}': {}", target_world_path.display(), e);
         if target_world_path.exists() {
             AppError::WorldAlreadyExists { profile_id: target_profile_id, world_folder: final_target_folder_name.clone() }
         } else {
             AppError::Io(e)
         }
    })?;

    match copy_dir(&source_world_path, &target_world_path, &options) {
        Ok(bytes_copied) => {
            info!(
                "Successfully copied world directory content ({} bytes) from {} to {}",
                bytes_copied,
                source_world_path.display(),
                target_world_path.display()
            );
        }
        Err(e) => {
            error!("Failed to copy world directory from {} to {}: {}", source_world_path.display(), target_world_path.display(), e);
            let _ = fs::remove_dir_all(&target_world_path).await; // Cleanup
            return Err(AppError::FsExtra(e));
        }
    }
    
    // --- Modify level.dat in Target Directory ---
    info!("Modifying level.dat in target directory: {}", target_world_path.display());
    let target_level_dat_path = target_world_path.join("level.dat");

    if let Err(e) = modify_level_dat_name(&target_level_dat_path, target_world_name).await {
        error!("Failed to modify level.dat name in target world '{}': {}. Cleaning up.", final_target_folder_name, e);
        // Cleanup the copied directory if modifying level.dat fails
        let _ = fs::remove_dir_all(&target_world_path).await;
        return Err(e);
    }

    info!("World copy process completed successfully for target folder: {}", final_target_folder_name);
    Ok(final_target_folder_name) // Return the generated folder name
}

/// Reads, modifies the LevelName tag, and writes back a level.dat file.
async fn modify_level_dat_name(level_dat_path: &Path, new_level_name: &str) -> Result<()> {
    // 1. Read the file
    let compressed_bytes = fs::read(level_dat_path).await.map_err(|e| {
        error!("Failed to read target level.dat at '{}': {}", level_dat_path.display(), e);
        AppError::Io(e)
    })?;

    // 2. Decompress
    let mut decoder = GzDecoder::new(&compressed_bytes[..]);
    let mut decompressed_bytes = Vec::new();
    if let Err(e) = std::io::Read::read_to_end(&mut decoder, &mut decompressed_bytes) {
        error!("Failed to decompress level.dat from '{}': {}", level_dat_path.display(), e);
        return Err(AppError::Io(e)); // Treat as IO error for now
    }

    // 3. Parse NBT
    let mut nbt_value: Value = from_bytes(&decompressed_bytes).map_err(|e| {
        error!("Failed to parse NBT from decompressed level.dat '{}': {}", level_dat_path.display(), e);
        AppError::Nbt(e)
    })?;

    // 4. Modify LevelName
    let mut modified = false;
    if let Value::Compound(root) = &mut nbt_value {
        if let Some(Value::Compound(data)) = root.get_mut("Data") {
            if let Some(level_name_tag) = data.get_mut("LevelName") {
                *level_name_tag = Value::String(new_level_name.to_string());
                modified = true;
                info!("Set LevelName to '{}' in {}", new_level_name, level_dat_path.display());
            } else {
                warn!("'LevelName' tag not found within 'Data' compound in {}", level_dat_path.display());
            }
        } else {
             warn!("'Data' compound not found in {}", level_dat_path.display());
        }
    } else {
         warn!("Root tag in level.dat is not a Compound: {}", level_dat_path.display());
    }

    if !modified {
        // If we couldn't modify it, maybe it's okay, but log a warning.
        // Alternatively, could return an error.
        warn!("Could not modify LevelName in {}. Proceeding without change.", level_dat_path.display());
        // Decide if this should be an error: return Err(AppError::Other(...));
    }

    // 5. Serialize NBT back to bytes
    let new_decompressed_bytes = to_bytes(&nbt_value).map_err(|e| {
         error!("Failed to serialize modified NBT for '{}': {}", level_dat_path.display(), e);
         AppError::Other(format!("NBT serialization error: {}", e)) // Use generic error for ser error
    })?;

    // 6. Compress
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    if let Err(e) = std::io::Write::write_all(&mut encoder, &new_decompressed_bytes) {
         error!("Failed to compress modified level.dat bytes for '{}': {}", level_dat_path.display(), e);
        return Err(AppError::Io(e));
    }
    let new_compressed_bytes = encoder.finish().map_err(|e| {
         error!("Failed finish compression for level.dat '{}': {}", level_dat_path.display(), e);
        AppError::Io(e)
    })?;

    // 7. Write back to file
    fs::write(level_dat_path, &new_compressed_bytes).await.map_err(|e| {
         error!("Failed to write modified level.dat back to '{}': {}", level_dat_path.display(), e);
         AppError::Io(e)
    })?;

    info!("Successfully modified and saved level.dat: {}", level_dat_path.display());
    Ok(())
}

// --- Error Enum Extension (add FsExtra and WorldLocked variants in error.rs) ---
// Need to add these to the main AppError enum in src-tauri/src/error.rs
// #[error("World '{world_folder}' in profile {profile_id} is currently locked (in use).")]
// WorldLocked {
//     profile_id: Uuid,
//     world_folder: String,
// },
// #[error("Filesystem operation error (fs_extra): {0}")]
// FsExtra(#[from] fs_extra::error::Error),
// #[error("World '{world_folder}' not found in profile {profile_id}.")]
// WorldNotFound {
//     profile_id: Uuid,
//     world_folder: String,
// },
// #[error("World '{world_folder}' already exists in profile {profile_id}.")]
// WorldAlreadyExists {
//     profile_id: Uuid,
//     world_folder: String,
// },

// --- TODO: Session Lock Helper Function ---
// async fn is_world_locked(world_path: &Path) -> Result<bool> { ... }
