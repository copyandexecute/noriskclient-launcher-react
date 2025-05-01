use crate::error::{AppError, CommandError};
use log::{debug, info, error, warn};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use tokio::fs;
use tauri_plugin_opener::OpenerExt;
use crate::utils::file_utils;
use crate::integrations::norisk_packs::NoriskModEntryDefinition;
use crate::utils::path_utils;

/// Sets a file as enabled or disabled by adding or removing the .disabled extension
#[tauri::command]
pub async fn set_file_enabled(file_path: String, enabled: bool) -> Result<(), CommandError> {
    let path = PathBuf::from(&file_path);
    info!("Setting file '{}' enabled={}", path.display(), enabled);

    if !path.exists() {
        return Err(CommandError::from(AppError::Other(format!(
            "File not found: {}",
            path.display()
        ))));
    }

    let file_name = match path.file_name().and_then(|name| name.to_str()) {
        Some(name) => name.to_string(),
        None => {
            return Err(CommandError::from(AppError::Other(
                "Invalid file name".to_string(),
            )))
        }
    };

    let parent = match path.parent() {
        Some(parent) => parent,
        None => {
            return Err(CommandError::from(AppError::Other(
                "Invalid file path".to_string(),
            )))
        }
    };

    // Check if the file is already in the desired state
    let is_disabled = file_name.ends_with(".disabled");
    if is_disabled == !enabled {
        debug!("File is already in the desired state: {}", path.display());
        return Ok(());
    }

    // Determine the new file name based on the 'enabled' parameter
    let new_file_name = if enabled {
        // Remove the .disabled extension
        if is_disabled {
            file_name
                .strip_suffix(".disabled")
                .unwrap_or(&file_name)
                .to_string()
        } else {
            file_name
        }
    } else {
        // Add the .disabled extension if it doesn't already have it
        if !is_disabled {
            format!("{}.disabled", file_name)
        } else {
            file_name
        }
    };

    let new_path = parent.join(new_file_name);
    debug!(
        "Renaming file from '{}' to '{}'",
        path.display(),
        new_path.display()
    );

    // Rename the file
    fs::rename(&path, &new_path)
        .await
        .map_err(|e| CommandError::from(AppError::Io(e)))?;

    info!(
        "Successfully set file '{}' enabled={}",
        path.display(),
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
    file_path: String
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

    info!("Finished fetching icons. Returning {} results.", results_map.len());
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
        match path_utils::get_norisk_mod_cache_path(
            mod_entry,
            &minecraft_version,
            &loader
        ) {
            Ok(path) => {
                mod_paths.push((mod_entry.id.clone(), path.to_string_lossy().to_string()));
            },
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

    info!("Finished fetching Norisk mod icons. Returning {} results.", results_map.len());
    Ok(results_map)
}
