use crate::error::{AppError, CommandError};
use crate::integrations::norisk_packs::NoriskModEntryDefinition;
use crate::utils::file_utils;
use crate::utils::path_utils;
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri_plugin_opener::OpenerExt;
use tokio::fs;

/// Sets a file as enabled or disabled by adding or removing the .disabled extension
#[tauri::command]
pub async fn set_file_enabled(file_path: String, enabled: bool) -> Result<(), CommandError> {
    // file_path is expected to be the "base" path, e.g., "shader.zip", not "shader.zip.disabled"
    let base_path = PathBuf::from(&file_path);
    info!(
        "Attempting to set file (base name) '{}' to enabled={}",
        base_path.display(),
        enabled
    );

    let path_as_is = base_path.clone();
    let path_disabled = PathBuf::from(format!("{}.disabled", file_path));

    let current_path: PathBuf;
    let is_currently_disabled: bool;

    if path_as_is.exists() {
        current_path = path_as_is;
        is_currently_disabled = false;
        debug!("Found file as is: {}", current_path.display());
    } else if path_disabled.exists() {
        current_path = path_disabled;
        is_currently_disabled = true;
        debug!("Found file with .disabled extension: {}", current_path.display());
    } else {
        let error_message = format!(
            "File not found: {} (or its .disabled version)",
            base_path.display()
        );
        log::error!("{}", error_message);
        return Err(CommandError::from(AppError::Other(error_message)));
    }

    // Correctly determine if the FOUND current_path is in a disabled state based on its actual name
    let current_filename_str_cow = current_path.file_name().unwrap_or_default().to_string_lossy();
    let current_filename_str = current_filename_str_cow.as_ref(); // Get &str
    let is_file_actually_disabled = current_filename_str.ends_with(".disabled");

    // Determine the base name of the file (without .disabled) from the FOUND current_path
    let current_true_base_name = if is_file_actually_disabled {
        current_filename_str.strip_suffix(".disabled").unwrap_or(current_filename_str).to_string()
    } else {
        current_filename_str.to_string()
    };
    
    // Check if the file is already in the desired state, using the accurately determined is_file_actually_disabled
    if is_file_actually_disabled == !enabled {
        debug!(
            "File '{}' is already in the desired state (is_disabled: {}, target_enabled: {}). No action needed.",
            current_path.display(),
            is_file_actually_disabled,
            enabled
        );
        return Ok(());
    }

    let parent = match current_path.parent() {
        Some(p) => p,
        None => {
            // This should be rare given path.exists() checks passed, but good for safety.
            let error_message = format!(
                "Could not determine parent directory for existing file: {}",
                current_path.display()
            );
            log::error!("{}", error_message);
            return Err(CommandError::from(AppError::Other(error_message)));
        }
    };

    // Determine the new file name based on the 'enabled' parameter and the original base file name.
    // The base_path.file_name() gives us the intended final name if enabled, or base for .disabled.
    // We should use current_true_base_name derived from the actual found file.
    let new_file_name = if enabled {
        // Target state is enabled, so the name should be the true base name derived from the found file.
        current_true_base_name
    } else {
        // Target state is disabled, so add .disabled to the true base name derived from the found file.
        format!("{}.disabled", current_true_base_name)
    };

    let new_path = parent.join(new_file_name);
    debug!(
        "Renaming file from '{}' to '{}'",
        current_path.display(),
        new_path.display()
    );

    // Rename the file
    fs::rename(&current_path, &new_path)
        .await
        .map_err(|e| {
            log::error!("Failed to rename file from '{}' to '{}': {}", current_path.display(), new_path.display(), e);
            CommandError::from(AppError::Io(e))
        })?;

    info!(
        "Successfully set file '{}' (now at '{}') to enabled={}",
        base_path.display(), // Log original base name for clarity
        new_path.display(),  // Log the new actual path
        enabled
    );
    Ok(())
}

/// Deletes a file from the filesystem
#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<(), CommandError> {
    let path = PathBuf::from(&file_path);
    info!("Deleting file: {}", path.display());

    if !path.exists() {
        return Err(CommandError::from(AppError::Other(format!(
            "File not found: {}",
            path.display()
        ))));
    }

    // Check if it's a file or directory
    let metadata = fs::metadata(&path)
        .await
        .map_err(|e| CommandError::from(AppError::Io(e)))?;

    if metadata.is_dir() {
        debug!("Deleting directory: {}", path.display());
        fs::remove_dir_all(&path)
            .await
            .map_err(|e| CommandError::from(AppError::Io(e)))?;
    } else {
        debug!("Deleting file: {}", path.display());
        fs::remove_file(&path)
            .await
            .map_err(|e| CommandError::from(AppError::Io(e)))?;
    }

    info!("Successfully deleted: {}", path.display());
    Ok(())
}

/// Opens the directory containing a file
#[tauri::command]
pub async fn open_file_directory(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<(), CommandError> {
    let path = PathBuf::from(&file_path);
    info!("Opening directory for file: {}", path.display());

    if !path.exists() {
        return Err(CommandError::from(AppError::Other(format!(
            "File not found: {}",
            path.display()
        ))));
    }

    // Get the parent directory
    let parent_dir = match path.parent() {
        Some(parent) => parent,
        None => {
            return Err(CommandError::from(AppError::Other(
                "Could not determine parent directory".to_string(),
            )))
        }
    };

    debug!("Opening directory: {}", parent_dir.display());

    // Open the directory with the system file browser
    match app_handle
        .opener()
        .open_path(parent_dir.to_string_lossy(), None::<&str>)
    {
        Ok(_) => {
            info!("Successfully opened directory: {}", parent_dir.display());
            Ok(())
        }
        Err(e) => {
            info!("Failed to open directory {}: {}", parent_dir.display(), e);
            Err(CommandError::from(AppError::Other(format!(
                "Failed to open directory: {}",
                e
            ))))
        }
    }
}

/// Fetches the first PNG icon found within a list of archive files (.zip, .jar) as Base64 strings.
///
/// # Arguments
///
/// * `archive_paths` - A vector of strings representing the paths to the archive files.
///
/// # Returns
///
/// A `Result` containing a `HashMap` where keys are the original file paths
/// and values are `Option<String>`. The value is `Some(base64_string)` if a PNG
/// was found, and `None` otherwise (or if an error occurred for that specific file).
#[tauri::command]
pub async fn get_icons_for_archives(
    archive_paths: Vec<String>,
) -> Result<HashMap<String, Option<String>>, CommandError> {
    info!("Fetching icons for {} archives...", archive_paths.len());
    let mut results_map: HashMap<String, Option<String>> = HashMap::new();

    for path_str in archive_paths {
        let archive_path = Path::new(&path_str);
        let result = file_utils::find_first_png_in_archive_as_base64(archive_path).await;

        match result {
            Ok(base64_icon) => {
                debug!("Icon found for: {}", path_str);
                results_map.insert(path_str, Some(base64_icon));
            }
            Err(AppError::PngNotFoundInArchive(_)) => {
                debug!("No PNG icon found in archive: {}", path_str);
                results_map.insert(path_str, None);
            }
            Err(AppError::FileNotFound(_)) => {
                warn!("Archive file not found: {}", path_str);
                results_map.insert(path_str, None); // File not found is not an error, just no icon
            }
            Err(AppError::ArchiveReadError(msg)) => {
                error!("Error reading archive {}: {}", path_str, msg);
                results_map.insert(path_str, None); // Insert None on error for this specific file
            }
            Err(e) => {
                error!("Unexpected error processing archive {}: {}", path_str, e);
                results_map.insert(path_str, None); // Insert None on unexpected error
            }
        }
    }

    info!(
        "Finished fetching icons. Returning {} results.",
        results_map.len()
    );
    Ok(results_map)
}

/// Fetches the first PNG icon found within Norisk Pack mods as Base64 strings.
///
/// # Arguments
///
/// * `mods` - A vector of NoriskModEntryDefinition structs
/// * `minecraft_version` - The Minecraft version to use for compatibility check
/// * `loader` - The mod loader (fabric/forge) to use for compatibility check
///
/// # Returns
///
/// A `Result` containing a `HashMap` where keys are the mod IDs
/// and values are `Option<String>`. The value is `Some(base64_string)` if a PNG
/// was found, and `None` otherwise (or if an error occurred for that specific mod).
#[tauri::command]
pub async fn get_icons_for_norisk_mods(
    mods: Vec<NoriskModEntryDefinition>,
    minecraft_version: String,
    loader: String,
) -> Result<HashMap<String, Option<String>>, CommandError> {
    info!("Fetching icons for {} Norisk Pack mods...", mods.len());
    let mut results_map: HashMap<String, Option<String>> = HashMap::new();

    // Sammle alle Mod-Cache-Pfade
    let mut mod_paths: Vec<(String, String)> = Vec::new(); // (mod_id, file_path)

    for mod_entry in &mods {
        match path_utils::get_norisk_mod_cache_path(mod_entry, &minecraft_version, &loader) {
            Ok(path) => {
                mod_paths.push((mod_entry.id.clone(), path.to_string_lossy().to_string()));
            }
            Err(e) => {
                warn!("Could not get cache path for mod {}: {}", mod_entry.id, e);
                results_map.insert(mod_entry.id.clone(), None); // Mod nicht gefunden, kein Icon
            }
        }
    }

    // Extrahiere Icons für jeden Mod aus dem Cache
    for (mod_id, path_str) in mod_paths {
        let archive_path = Path::new(&path_str);
        let result = file_utils::find_first_png_in_archive_as_base64(archive_path).await;

        match result {
            Ok(base64_icon) => {
                debug!("Icon found for mod {}", mod_id);
                results_map.insert(mod_id, Some(base64_icon));
            }
            Err(AppError::PngNotFoundInArchive(_)) => {
                debug!("No PNG icon found in archive for mod {}", mod_id);
                results_map.insert(mod_id, None);
            }
            Err(AppError::FileNotFound(_)) => {
                warn!("Archive file not found for mod {}: {}", mod_id, path_str);
                results_map.insert(mod_id, None);
            }
            Err(e) => {
                error!("Error processing archive for mod {}: {}", mod_id, e);
                results_map.insert(mod_id, None);
            }
        }
    }

    info!(
        "Finished fetching Norisk mod icons. Returning {} results.",
        results_map.len()
    );
    Ok(results_map)
}

/// Opens a specified file using the system's default application.
/// Requires appropriate scope permissions in capabilities.
#[tauri::command]
pub async fn open_file(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<(), CommandError> {
    let path = PathBuf::from(&file_path);
    info!("Attempting to open file: {}", path.display());

    // Check if the path exists and is a file
    if !path.exists() {
        error!("File not found: {}", path.display());
        return Err(CommandError::from(AppError::FileNotFound(path)));
    }
    if !path.is_file() {
        error!("Path is not a file: {}", path.display());
        return Err(CommandError::from(AppError::Other(format!(
            "Path is not a file: {}",
            path.display()
        ))));
    }

    // Open the file using the opener plugin
    match app_handle
        .opener()
        .open_path(path.to_string_lossy(), None::<&str>)
    {
        Ok(_) => {
            info!("Successfully requested opening file: {}", path.display());
            Ok(())
        }
        Err(e) => {
            // Log the specific error from the opener plugin
            error!("Failed to open file {} using opener: {}", path.display(), e);
            // Check for permission denied error specifically if possible (depends on plugin error type)
            // For now, return a generic error
            Err(CommandError::from(AppError::Other(format!(
                "Failed to open file: {}. Check permissions.",
                e // Include the original error message
            ))))
        }
    }
}

/// Reads the content of a file as raw bytes.
#[tauri::command]
pub async fn read_file_bytes(file_path: String) -> Result<Vec<u8>, CommandError> {
    let path = PathBuf::from(&file_path);
    debug!("Reading bytes from file: {}", path.display());

    if !path.exists() {
        error!("File not found for reading bytes: {}", path.display());
        return Err(CommandError::from(AppError::FileNotFound(path)));
    }
    if !path.is_file() {
        error!("Path is not a file for reading bytes: {}", path.display());
        return Err(CommandError::from(AppError::Other(format!(
            "Path is not a file: {}",
            path.display()
        ))));
    }

    // Read the file content into a vector of bytes
    fs::read(&path).await.map_err(|e| {
        error!("Failed to read file bytes {}: {}", path.display(), e);
        CommandError::from(AppError::Io(e))
    })
}
