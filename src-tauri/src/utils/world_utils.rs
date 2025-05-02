use std::path::{Path, PathBuf};
use uuid::Uuid;
use log::{info, warn, error};
use tokio::fs;
use fs_extra::dir::{copy as copy_dir, CopyOptions};
use crate::error::{Result, AppError};
use crate::state::State;

/// Copies a singleplayer world directory from a source profile to a target profile.
///
/// # Arguments
///
/// * `source_profile_id` - UUID of the profile containing the source world.
/// * `source_world_folder` - The name of the world folder within the source profile's 'saves' directory.
/// * `target_profile_id` - UUID of the profile where the world should be copied to.
/// * `target_world_folder` - The desired name for the world folder in the target profile. This name must not already exist.
///
/// # Returns
///
/// Returns `Ok(())` on success, or an `AppError` variant on failure.
/// Possible errors include profile not found, world not found, target world already exists,
/// I/O errors during copying, or if the source world is currently locked (in use by Minecraft).
pub async fn copy_world_directory(
    source_profile_id: Uuid,
    source_world_folder: &str,
    target_profile_id: Uuid,
    target_world_folder: &str,
) -> Result<()> {
    info!(
        "Attempting to copy world '{}' from profile {} to profile {} as '{}'",
        source_world_folder, source_profile_id, target_profile_id, target_world_folder
    );

    // Sanitize folder names (basic check)
    if source_world_folder.is_empty() || target_world_folder.is_empty() || 
       source_world_folder.contains('/') || source_world_folder.contains('\\') ||
       target_world_folder.contains('/') || target_world_folder.contains('\\') {
        error!("Invalid world folder name provided.");
        return Err(AppError::InvalidInput("World folder names cannot be empty or contain slashes.".to_string()));
    }

    let state = State::get().await?;
    let profile_manager = &state.profile_manager;

    // --- Calculate Paths ---
    let source_instance_path = profile_manager.get_profile_instance_path(source_profile_id).await?;
    let source_saves_path = source_instance_path.join("saves");
    let source_world_path = source_saves_path.join(source_world_folder);

    let target_instance_path = profile_manager.get_profile_instance_path(target_profile_id).await?;
    let target_saves_path = target_instance_path.join("saves");
    let target_world_path = target_saves_path.join(target_world_folder);

    info!("Source world path: {}", source_world_path.display());
    info!("Target world path: {}", target_world_path.display());

    // --- Validate Source and Target ---
    if !source_world_path.is_dir() {
        error!("Source world directory not found: {}", source_world_path.display());
        return Err(AppError::WorldNotFound {
            profile_id: source_profile_id,
            world_folder: source_world_folder.to_string(),
        });
    }
    // Check specifically for level.dat as a stronger indicator of a valid world
    if !source_world_path.join("level.dat").is_file() {
        error!("Source world directory exists but level.dat is missing: {}", source_world_path.display());
         return Err(AppError::WorldNotFound { // Or maybe a different error type?
            profile_id: source_profile_id,
            world_folder: source_world_folder.to_string(),
        });
    }


    if target_world_path.exists() {
        error!("Target world directory already exists: {}", target_world_path.display());
        return Err(AppError::WorldAlreadyExists {
            profile_id: target_profile_id,
            world_folder: target_world_folder.to_string(),
        });
    }

    // --- TODO: Implement Session Lock Check for source_world_path ---
    // Example placeholder - Needs proper implementation
    // if is_world_locked(&source_world_path).await? {
    //     error!("Source world '{}' is currently in use.", source_world_folder);
    //     return Err(AppError::WorldLocked {
    //         profile_id: source_profile_id,
    //         world_folder: source_world_folder.to_string(),
    //     });
    // }


    // --- Ensure Target Directory Exists ---
    info!("Ensuring target saves directory exists: {}", target_saves_path.display());
    fs::create_dir_all(&target_saves_path).await.map_err(|e| {
        error!("Failed to create target saves directory: {}", e);
        AppError::Io(e)
    })?;

    // --- Copy Directory ---
    info!("Starting directory copy...");
    let options = CopyOptions {
        overwrite: false,
        skip_exist: true, // Should be redundant due to check above, but safe
        copy_inside: false, // Copy the source folder *itself* into target_saves_path
        content_only: true, // Copy the *content* of source_world_path into target_world_path
        ..Default::default()
    };

    // fs_extra::copy_items needs Vec<&Path>
    // fs_extra::dir::copy copies a single directory
    // We want to copy the *contents* of source_world_path into the newly created target_world_path
    
    // Correction: target_world_path is the *new* directory, copy_inside should be used with source_world_path and target_saves_path
    // Let's rethink: we want the equivalent of `cp -r /path/to/source_world /path/to/target_saves/` 
    // which creates `/path/to/target_saves/source_world`
    // Then rename `/path/to/target_saves/source_world` to `/path/to/target_saves/target_world`
    
    // OR: fs_extra::dir::copy the source_world_path to target_world_path with content_only=true ?
    // Let's test fs_extra::dir::copy with content_only=true. It should copy the *contents* of source_world_path
    // directly into target_world_path (which must exist first).

    fs::create_dir(&target_world_path).await.map_err(|e| { // Create the empty target dir first
         error!("Failed to create target world directory shell: {}", e);
         AppError::Io(e)
    })?;

    match copy_dir(&source_world_path, &target_world_path, &options) {
        Ok(bytes_copied) => {
            info!(
                "Successfully copied world directory ({} bytes) from {} to {}",
                bytes_copied,
                source_world_path.display(),
                target_world_path.display()
            );
        }
        Err(e) => {
            error!(
                "Failed to copy world directory from {} to {}: {}",
                source_world_path.display(),
                target_world_path.display(),
                e
            );
             // Attempt to clean up the potentially partially created target directory
            let _ = fs::remove_dir_all(&target_world_path).await; // Ignore cleanup error
            return Err(AppError::FsExtra(e)); // Use the FsExtra error variant
        }
    }
    
    // --- TODO: Implement level.dat modification ---
    // read target level.dat
    // decompress
    // parse NBT
    // modify LevelName
    // serialize NBT
    // compress
    // write target level.dat


    info!("World copy process completed successfully.");
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
