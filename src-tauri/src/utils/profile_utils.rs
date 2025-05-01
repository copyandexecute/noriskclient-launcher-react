use crate::error::{AppError, Result};
use crate::integrations::modrinth::{ModrinthProjectType, ModrinthVersion};
use crate::state::profile_state::Profile;
use crate::state::profile_state::{Mod, ModSource};
use crate::utils::{resourcepack_utils, shaderpack_utils, datapack_utils, hash_utils};
use log::{debug, info, warn};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use serde_json;
use tempfile;
use async_zip::tokio::write::ZipFileWriter;
use async_zip::{Compression, ZipEntryBuilder};
use chrono;
use futures::future::BoxFuture;

/// Represents the type of content to be installed
pub enum ContentType {
    ResourcePack,
    ShaderPack,
    DataPack,
}

impl From<ModrinthProjectType> for ContentType {
    fn from(project_type: ModrinthProjectType) -> Self {
        match project_type {
            ModrinthProjectType::ResourcePack => ContentType::ResourcePack,
            ModrinthProjectType::Shader => ContentType::ShaderPack,
            ModrinthProjectType::Datapack => ContentType::DataPack,
            _ => panic!("Unsupported content type conversion"),
        }
    }
}

/// Adds Modrinth content (resourcepack, shaderpack, datapack) to a profile
pub async fn add_modrinth_content_to_profile(
    profile_id: Uuid,
    project_id: String,
    version_id: String,
    file_name: String,
    download_url: String,
    file_hash_sha1: Option<String>,
    content_name: Option<String>,
    version_number: Option<String>,
    content_type: ContentType,
) -> Result<()> {
    info!(
        "Adding Modrinth content to profile {}: {} ({})",
        profile_id,
        content_name.as_deref().unwrap_or(&file_name),
        content_type_to_string(&content_type)
    );

    // Get the profile
    let state = crate::state::state_manager::State::get().await?;
    let profile = state.profile_manager.get_profile(profile_id).await?;

    // Get the target directory based on content type
    let target_dir = get_content_directory(&profile, &content_type).await?;

    // Create the directory if it doesn't exist
    if !target_dir.exists() {
        debug!("Creating directory: {}", target_dir.display());
        fs::create_dir_all(&target_dir)
            .await
            .map_err(|e| AppError::Io(e))?;
    }

    // Construct the file path
    let file_path = target_dir.join(&file_name);
    debug!("Target file path: {}", file_path.display());

    // Download the file
    download_content(&download_url, &file_path, file_hash_sha1).await?;

    info!(
        "Successfully added {} '{}' to profile {}",
        content_type_to_string(&content_type),
        content_name.as_deref().unwrap_or(&file_name),
        profile_id
    );

    Ok(())
}

/// Helper function to download content from a URL
async fn download_content(
    url: &str,
    file_path: &Path,
    expected_sha1: Option<String>,
) -> Result<()> {
    info!(
        "Downloading content from {} to {}",
        url,
        file_path.display()
    );

    // Create a reqwest client
    let client = reqwest::Client::new();
    
    // Download the file
    let response = client
        .get(url)
        .header(
            "User-Agent",
            format!(
                "NoRiskClient-Launcher/{} (support@norisk.gg)",
                env!("CARGO_PKG_VERSION")
            ),
        )
        .send()
        .await
        .map_err(|e| AppError::Download(format!("Failed to download content: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Download(format!(
            "Failed to download content: HTTP {}",
            response.status()
        )));
    }

    // Get the bytes
    let bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::Download(format!("Failed to read content bytes: {}", e)))?;

    // Verify SHA1 hash if expected hash was provided
    if let Some(expected) = expected_sha1 {
        let hash = hash_utils::calculate_sha1_from_bytes(&bytes);
        
        if hash != expected {
            return Err(AppError::Download(format!(
                "SHA1 hash mismatch. Expected: {}, Got: {}",
                expected, hash
            )));
        }
        debug!("SHA1 hash verification successful");
    }

    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e))?;
        }
    }

    // Write the file
    let mut file = fs::File::create(file_path)
        .await
        .map_err(|e| AppError::Io(e))?;

    file.write_all(&bytes)
        .await
        .map_err(|e| AppError::Io(e))?;

    info!("Successfully downloaded content to {}", file_path.display());

    Ok(())
}

/// Helper function to get the correct directory for a specific content type
async fn get_content_directory(profile: &Profile, content_type: &ContentType) -> Result<PathBuf> {
    match content_type {
        ContentType::ResourcePack => resourcepack_utils::get_resourcepacks_dir(profile).await,
        ContentType::ShaderPack => shaderpack_utils::get_shaderpacks_dir(profile).await,
        ContentType::DataPack => datapack_utils::get_datapacks_dir(profile).await,
    }
}

/// Converts ContentType to a string representation
fn content_type_to_string(content_type: &ContentType) -> &'static str {
    match content_type {
        ContentType::ResourcePack => "Resource Pack",
        ContentType::ShaderPack => "Shader Pack",
        ContentType::DataPack => "Data Pack",
    }
}

/// Helper function to install a Modrinth content pack from a ModrinthVersion
pub async fn install_modrinth_content(
    profile_id: Uuid,
    version: &ModrinthVersion,
    content_type: ContentType,
) -> Result<()> {
    // Find the primary file
    let primary_file = version.files.iter().find(|f| f.primary).ok_or_else(|| {
        AppError::ModrinthPrimaryFileNotFound {
            version_id: version.id.clone(),
        }
    })?;

    // Get SHA1 hash if available
    let sha1_hash = primary_file.hashes.sha1.clone();

    // Add the content to the profile
    add_modrinth_content_to_profile(
        profile_id,
        version.project_id.clone(),
        version.id.clone(),
        primary_file.filename.clone(),
        primary_file.url.clone(),
        sha1_hash,
        Some(version.name.clone()),
        Some(version.version_number.clone()),
        content_type,
    )
    .await?;

    Ok(())
}

/// Checks if a specific Modrinth content item is installed in a given profile.
///
/// Currently focuses on checking mods. Can be extended for other content types.
/// At least one identifier (project_id, version_id, file_hash_sha1, file_name) must be provided.
///
/// # Arguments
///
/// * `profile_id` - The UUID of the profile to check.
/// * `project_id` - Optional Modrinth project ID.
/// * `version_id` - Optional Modrinth version ID.
/// * `file_hash_sha1` - Optional SHA1 hash of the content file.
/// * `file_name` - Optional filename of the content file.
/// * `project_type` - Optional type of content (e.g., "mod", "resourcepack"). Defaults to checking mods if None.
///
/// # Returns
///
/// Returns `Ok(true)` if the content is found matching all provided criteria, `Ok(false)` otherwise.
/// Returns `Err` if the profile cannot be loaded or other errors occur.
#[tauri::command]
pub async fn check_content_installed(
    profile_id: Uuid,
    project_id: Option<String>,
    version_id: Option<String>,
    file_hash_sha1: Option<String>,
    file_name: Option<String>,
    project_type: Option<String>, // TODO: Implement checks for other types
) -> Result<bool> {
    info!(
        "Checking installation status for content in profile {}: project_id={:?}, version_id={:?}, hash={:?}, filename={:?}, type={:?}",
        profile_id, project_id, version_id, file_hash_sha1.is_some(), file_name, project_type
    );

    // Ensure at least one identifier is provided
    if project_id.is_none() && version_id.is_none() && file_hash_sha1.is_none() && file_name.is_none() {
        return Err(AppError::Other("At least one identifier (project_id, version_id, file_hash_sha1, file_name) must be provided to check installation status.".to_string()));
    }

    // Get the profile
    let state = crate::state::state_manager::State::get().await?;
    let profile = state.profile_manager.get_profile(profile_id).await?;

    // --- Mod Checking Logic ---
    // TODO: Extend this to handle other project_types based on the input parameter
    let target_type = project_type.unwrap_or_else(|| "mod".to_string()); // Default to mod for now
    if target_type == "mod" {
        for installed_mod in &profile.mods { 

            // Default values if not a Modrinth mod or fields are missing
            let mut mod_project_id: Option<&str> = None;
            let mut mod_version_id: Option<&str> = None;
            let mut mod_sha1_hash: Option<&str> = None;
            let mut mod_file_name: Option<&str> = None;

            // Extract info only if it's a Modrinth mod
            if let ModSource::Modrinth { 
                project_id: pid, 
                version_id: vid, 
                file_hash_sha1: hash_opt, 
                file_name: fname, 
                .. 
            } = &installed_mod.source {
                mod_project_id = Some(pid);
                mod_version_id = Some(vid);
                mod_sha1_hash = hash_opt.as_deref(); // Convert Option<String> to Option<&str>
                mod_file_name = Some(fname);
            }

            let mut match_project = true;
            if let Some(pid) = &project_id {
                match_project = mod_project_id == Some(pid.as_str());
            }

            let mut match_version = true;
            if let Some(vid) = &version_id {
                match_version = mod_version_id == Some(vid.as_str());
            }

            let mut match_hash = true;
            if let Some(hash) = &file_hash_sha1 {
                 // Compare Option<&str> with Option<&str>
                match_hash = mod_sha1_hash == Some(hash.as_str());
            }

            let mut match_name = true;
            if let Some(name) = &file_name {
                 // Compare Option<&str> with Option<&str>
                match_name = mod_file_name == Some(name.as_str());
                 // Note: We are comparing against the filename stored in ModSource::Modrinth
                 // If you need to check against display_name as well/instead, that requires different logic:
                 // e.g., match_name = installed_mod.display_name.as_deref() == Some(name.as_str());
            }

            // If all provided criteria match, return true
            if match_project && match_version && match_hash && match_name {
                 // Use display_name for logging, but the match was based on source info
                info!(
                    "Found matching installed mod: {}", 
                    installed_mod.display_name.as_deref().unwrap_or("[Unknown Name]")
                );
                return Ok(true);
            }
        }
        // If loop completes without finding a match
        info!("No matching mod found installed in profile {}", profile_id);
        return Ok(false);
    } else {
        // --- Placeholder for other content types ---
        warn!("Checking installation for content type '{}' is not yet implemented.", target_type);
        // TODO: Implement checks for resourcepacks, shaderpacks, datapacks
        // Example for resource packs (requires similar structure in ResourcePackInfo):
        /*
        if target_type == "resourcepack" {
             let packs = resourcepack_utils::list_resourcepacks(&profile).await?;
             for pack in packs {
                 // Similar matching logic as above using pack.modrinth_info, pack.sha1_hash, pack.filename
                 let mut match_project = ...;
                 let mut match_version = ...;
                 let mut match_hash = ...;
                 let mut match_name = ...;
                 if match_project && match_version && match_hash && match_name {
                     return Ok(true);
                 }
             }
             return Ok(false);
         }
        */
        return Ok(false); // Return false for unimplemented types for now
    }
}

/// Exports a profile to a `.noriskpack` file
/// 
/// This creates a zip archive with the .noriskpack extension that contains:
/// - The profile data as JSON (sanitized to remove user-specific data)
/// - An "overrides" folder containing any files specified in `include_files`
/// 
/// @param profile_id: UUID of the profile to export
/// @param output_path: Optional path where the .noriskpack file should be saved
/// @param include_files: Optional list of files/directories to include in the overrides folder
/// @return: Result containing the path to the created .noriskpack file
pub async fn export_profile_to_noriskpack(
    profile_id: Uuid,
    output_path: Option<PathBuf>,
    include_files: Option<Vec<PathBuf>>,
) -> Result<PathBuf> {
    info!("Exporting profile {} to .noriskpack", profile_id);

    // Get the profile
    let state = crate::state::state_manager::State::get().await?;
    let profile = state.profile_manager.get_profile(profile_id).await?;
    
    // Create a sanitized copy of the profile for export
    let export_profile = sanitize_profile_for_export(&profile);
    
    // Create a temporary directory for the export structure
    let temp_dir = tempfile::tempdir().map_err(|e| AppError::Other(format!("Failed to create temporary directory: {}", e)))?;
    let temp_path = temp_dir.path();
    debug!("Created temporary directory for export: {}", temp_path.display());
    
    // Create the overrides directory
    let overrides_dir = temp_path.join("overrides");
    fs::create_dir_all(&overrides_dir).await.map_err(|e| AppError::Io(e))?;
    
    // Write the profile data to a JSON file
    let profile_json_path = temp_path.join("profile.json");
    let profile_json = serde_json::to_string_pretty(&export_profile)?;
    let mut profile_file = fs::File::create(&profile_json_path).await.map_err(|e| AppError::Io(e))?;
    profile_file.write_all(profile_json.as_bytes()).await.map_err(|e| AppError::Io(e))?;
    
    // Copy files to the overrides directory if specified
    if let Some(files) = include_files {
        for file_path in files {
            if !file_path.exists() {
                debug!("Skipping non-existent file: {}", file_path.display());
                continue;
            }
            
            // Get source path and relative path within the profile
            let profile_instance_path = state.profile_manager.get_profile_instance_path(profile_id).await?;
            
            // Only process files that are within the profile instance path
            if let Ok(rel_path) = file_path.strip_prefix(&profile_instance_path) {
                let target_path = overrides_dir.join(rel_path);
                
                // Create parent directories if needed
                if let Some(parent) = target_path.parent() {
                    fs::create_dir_all(parent).await.map_err(|e| AppError::Io(e))?;
                }
                
                if file_path.is_dir() {
                    // Copy directory recursively
                    copy_dir_recursively(&file_path, &target_path).await?;
                    debug!("Copied directory {} to {}", file_path.display(), target_path.display());
                } else {
                    // Copy file
                    fs::copy(&file_path, &target_path).await.map_err(|e| AppError::Io(e))?;
                    debug!("Copied file {} to {}", file_path.display(), target_path.display());
                }
            } else {
                debug!("Skipping file outside profile path: {}", file_path.display());
            }
        }
    }
    
    // Determine the output file path
    let output_file = match output_path {
        Some(path) => path,
        None => {
            // Generate a default output path
            let safe_name = profile.name.replace(" ", "_").to_lowercase();
            let default_name = format!("{}_v{}_{}.noriskpack", 
                safe_name, 
                profile.game_version,
                profile.loader.as_str());
            
            // Use the current directory by default
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(default_name)
        }
    };
    
    // Create the zip file
    info!("Creating .noriskpack archive at: {}", output_file.display());
    
    // Ensure parent directory exists
    if let Some(parent) = output_file.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).await.map_err(|e| AppError::Io(e))?;
        }
    }
    
    // Create the zip file
    create_zip_archive(temp_path, &output_file).await?;
    
    info!("Successfully exported profile to: {}", output_file.display());
    Ok(output_file)
}

/// Creates a sanitized copy of a profile for export
fn sanitize_profile_for_export(profile: &Profile) -> Profile {
    let mut export_profile = profile.clone();
    
    // Reset timestamps and other personal data
    export_profile.created = chrono::Utc::now();
    export_profile.last_played = None;
    
    // Reset any absolute paths to relative ones
    //export_profile.path = format!("minecraft-{}-{}",  export_profile.game_version, export_profile.loader.as_str());
    
    // Reset profile ID to ensure it's unique when imported
    export_profile.id = Uuid::new_v4();
    
    // Keep other essential data
    export_profile
}

/// Recursively copies a directory
pub fn copy_dir_recursively<'a>(src: &'a Path, dst: &'a Path) -> BoxFuture<'a, Result<()>> {
    Box::pin(async move {
        if !dst.exists() {
            fs::create_dir_all(dst).await.map_err(|e| AppError::Io(e))?;
        }
        
        let mut entries = fs::read_dir(src).await.map_err(|e| AppError::Io(e))?;
        
        while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Io(e))? {
            let entry_path = entry.path();
            let file_name = entry.file_name();
            let target_path = dst.join(file_name);
            
            if entry_path.is_dir() {
                copy_dir_recursively(&entry_path, &target_path).await?;
            } else {
                fs::copy(&entry_path, &target_path).await.map_err(|e| AppError::Io(e))?;
            }
        }
        
        Ok(())
    })
}

/// Creates a zip archive from a directory
async fn create_zip_archive(src_dir: &Path, dst_file: &Path) -> Result<()> {
    debug!("Creating zip archive at {:?} from directory {:?}", dst_file, src_dir);
    
    // Create the destination file
    let file = fs::File::create(dst_file).await.map_err(|e| AppError::Io(e))?;
    let mut writer = ZipFileWriter::with_tokio(file);
    
    // Add all files from the src_dir recursively, but maintain proper relative paths
    // Only files inside the src_dir should be included
    add_dir_to_zip(&mut writer, src_dir, src_dir).await?;
    
    // Close the zip file
    writer.close().await.map_err(|e| AppError::Other(format!("Failed to finalize zip file: {}", e)))?;
    
    debug!("Successfully created zip archive at {:?}", dst_file);
    Ok(())
}

/// Helper function to recursively add a directory to a zip archive
fn add_dir_to_zip<'a>(
    writer: &'a mut ZipFileWriter<fs::File>,
    root_dir: &'a Path,
    current_dir: &'a Path,
) -> BoxFuture<'a, Result<()>> {
    Box::pin(async move {
        let mut entries = fs::read_dir(current_dir).await.map_err(|e| AppError::Io(e))?;
        
        while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Io(e))? {
            let path = entry.path();
            
            // Create relative path from root - this ensures proper directory structure in the zip
            let rel_path = path.strip_prefix(root_dir)
                .map_err(|e| AppError::Other(format!("Path prefix error: {}", e)))?
                .to_string_lossy()
                .to_string();
                
            if path.is_dir() {
                // For directories, first add an empty directory entry (if not root)
                if !rel_path.is_empty() {  // Skip root directory
                    let dir_path = if rel_path.ends_with('/') { 
                        rel_path.clone() 
                    } else { 
                        format!("{}/", rel_path) 
                    };
                    
                    let dir_builder = ZipEntryBuilder::new(dir_path.into(), Compression::Stored);
                    writer.write_entry_whole(dir_builder, &[])
                        .await
                        .map_err(|e| AppError::Other(format!("Failed to add directory to zip: {}", e)))?;
                }
                
                // Then recursively add its contents
                add_dir_to_zip(writer, root_dir, &path).await?;
            } else {
                // For files, read the content and add it
                let file_data = fs::read(&path).await.map_err(|e| AppError::Io(e))?;
                let file_builder = ZipEntryBuilder::new(rel_path.into(), Compression::Deflate);
                
                writer.write_entry_whole(file_builder, &file_data)
                    .await
                    .map_err(|e| AppError::Other(format!("Failed to add file to zip: {}", e)))?;
            }
        }
        
        Ok(())
    })
}
