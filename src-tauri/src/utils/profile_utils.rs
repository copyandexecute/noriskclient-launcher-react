use crate::error::{AppError, Result};
use crate::integrations::modrinth::{ModrinthProjectType, ModrinthVersion};
use crate::integrations::norisk_packs;
use crate::state::profile_state::ModSource;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;
use crate::utils::file_utils;
use crate::utils::{datapack_utils, hash_utils, resourcepack_utils, shaderpack_utils};
use async_zip::tokio::write::ZipFileWriter;
use async_zip::{Compression, ZipEntryBuilder};
use chrono;
use futures::future::{BoxFuture, FutureExt, join_all};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use serde_json;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use tempfile;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use std::collections::HashMap;

/// Represents the type of content to be installed
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContentType {
    ResourcePack,
    ShaderPack,
    DataPack,
    Mod,
}

impl Default for ContentType {
    fn default() -> Self {
        ContentType::Mod
    }
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

    file.write_all(&bytes).await.map_err(|e| AppError::Io(e))?;

    info!("Successfully downloaded content to {}", file_path.display());

    Ok(())
}

/// Helper function to get the correct directory for a specific content type
async fn get_content_directory(profile: &Profile, content_type: &ContentType) -> Result<PathBuf> {
    match content_type {
        ContentType::ResourcePack => resourcepack_utils::get_resourcepacks_dir(profile).await,
        ContentType::ShaderPack => shaderpack_utils::get_shaderpacks_dir(profile).await,
        ContentType::DataPack => datapack_utils::get_datapacks_dir(profile).await,
        ContentType::Mod => {
            // For mods, the target directory is the 'mods' folder within the profile's instance path.
            let state = State::get().await?;
            let instance_path = state
                .profile_manager
                .calculate_instance_path_for_profile(profile)?;
            Ok(instance_path.join("mods"))
        }
    }
}

/// Converts ContentType to a string representation
fn content_type_to_string(content_type: &ContentType) -> &'static str {
    match content_type {
        ContentType::ResourcePack => "Resource Pack",
        ContentType::ShaderPack => "Shader Pack",
        ContentType::DataPack => "Data Pack",
        ContentType::Mod => "Mod",
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

// --- Struct for command parameters ---
#[derive(Deserialize, Serialize, Debug)]
pub struct CheckContentParams {
    pub profile_id: Uuid,
    pub project_id: Option<String>,
    pub version_id: Option<String>,
    pub file_hash_sha1: Option<String>,
    pub file_name: Option<String>,
    pub project_type: Option<String>,
    pub game_version: Option<String>,
    pub loader: Option<String>,
    pub pack_version_number: Option<String>,
}

// --- Return Type ---
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FoundItemDetails {
    pub item_type: ContentType,       // Changed from String
    pub item_id: Option<String>,      // e.g., Mod ID (UUID) if it's a mod
    pub file_name: Option<String>,    // The actual filename on disk
    pub display_name: Option<String>, // Display name if available
}

/// Represents details about an item when it comes from a NoRisk Pack
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NoRiskPackItemDetails {
    pub is_enabled: bool,
    pub norisk_mod_identifier: Option<crate::state::profile_state::NoriskModIdentifier>,
}

#[derive(Serialize, Debug, Default, Clone, Deserialize)]
pub struct ContentInstallStatus {
    pub is_included_in_norisk_pack: bool,
    pub is_installed: bool,
    pub is_specific_version_in_pack: bool,
    pub is_enabled: Option<bool>,
    pub found_item_details: Option<FoundItemDetails>,
    pub norisk_pack_item_details: Option<NoRiskPackItemDetails>,
}

/// Checks the installation status of a specific Modrinth content item within a profile's context.
///
/// Returns a struct indicating if the content is defined in the selected Norisk Pack
/// and if it is currently installed in the profile.
/// At least one identifier (project_id, version_id, file_hash_sha1, file_name) must be provided.
///
/// # Arguments
///
/// * `params` - A struct containing all necessary context and identifiers.
///
/// # Returns
///
/// Returns `Ok(ContentInstallStatus)` with the status, or `Err` if errors occur.
#[tauri::command]
pub async fn check_content_installed(params: CheckContentParams) -> Result<ContentInstallStatus> {
    info!(
        "Checking installation status for content in profile {} (MC: {:?}, Loader: {:?}): project_id={:?}, version_id={:?}, hash={:?}, filename={:?}, type={:?}",
        params.profile_id, params.game_version, params.loader, params.project_id, params.version_id, params.file_hash_sha1.is_some(), params.file_name, params.project_type
    );

    // Ensure at least one identifier is provided
    if params.project_id.is_none()
        && params.version_id.is_none()
        && params.file_hash_sha1.is_none()
        && params.file_name.is_none()
    {
        return Err(AppError::Other("At least one identifier (project_id, version_id, file_hash_sha1, file_name) must be provided to check installation status.".to_string()));
    }

    // Initialize the status struct
    let mut status = ContentInstallStatus::default();

    // Get the profile
    let state = State::get().await?;
    let profile = state.profile_manager.get_profile(params.profile_id).await?;

    // Determine the target loader context
    let target_loader_str = match &params.loader {
        // Borrow from params
        Some(loader_str) => loader_str.as_str(),
        None => profile.loader.as_str(),
    };

    // Determine the target game version context
    let target_game_version_str_buf;
    let target_game_version = match &params.game_version {
        // Borrow from params
        Some(gv_str) => gv_str.as_str(),
        None => {
            target_game_version_str_buf = profile.game_version.clone();
            target_game_version_str_buf.as_str()
        }
    };

    info!(
        "Using context: MC={}, Loader={}",
        target_game_version, target_loader_str
    );

    // --- Norisk Pack Check (if applicable) ---
    if let Some(pack_id) = &profile.selected_norisk_pack_id {
        debug!(
            "Profile {} has selected Norisk Pack: {}. Checking pack definition...",
            params.profile_id, pack_id
        );
        let config = state.norisk_pack_manager.get_config().await;
        match config.get_resolved_pack_definition(pack_id) {
            Ok(resolved_pack) => {
                for norisk_mod in &resolved_pack.mods {
                    let mut is_potential_project_match = false;
                    if let (
                        Some(pid_arg),
                        norisk_packs::NoriskModSourceDefinition::Modrinth {
                            project_id: norisk_pid,
                            ..
                        },
                    ) = (&params.project_id, &norisk_mod.source)
                    {
                        if pid_arg == norisk_pid {
                            is_potential_project_match = true;
                        }
                    }
                    // TODO: Add project matching for other source types if needed

                    if is_potential_project_match {
                        if let Some(loader_map) = norisk_mod.compatibility.get(target_game_version)
                        {
                            if let Some(target) = loader_map.get(target_loader_str) {
                                status.is_included_in_norisk_pack = true;

                                // Check if the SPECIFIC version NUMBER requested matches the pack identifier
                                if let Some(v_num_arg) = &params.pack_version_number {
                                    // Use the new field
                                    // TODO: Comparison might need adjustment for non-Modrinth sources if identifier format differs
                                    if v_num_arg == &target.identifier {
                                        debug!("Specific version number {} IS the one defined in the pack (identifier: {}).", v_num_arg, target.identifier);
                                        status.is_specific_version_in_pack = true;
                                    }
                                }

                                // New addition: Add NoRiskPackItemDetails
                                let mod_identifier = norisk_mod.id.clone();

                                // Create a proper NoriskModIdentifier
                                let norisk_mod_identifier =
                                    crate::state::profile_state::NoriskModIdentifier {
                                        pack_id: pack_id.clone(),
                                        mod_id: mod_identifier.clone(),
                                        game_version: target_game_version.to_string(),
                                        loader: crate::state::profile_state::ModLoader::from_str(
                                            target_loader_str,
                                        )
                                        .unwrap_or(profile.loader.clone()),
                                    };

                                // Check if it's disabled in the profile
                                let is_pack_mod_enabled = !profile
                                    .disabled_norisk_mods_detailed
                                    .contains(&norisk_mod_identifier);

                                status.norisk_pack_item_details = Some(NoRiskPackItemDetails {
                                    is_enabled: is_pack_mod_enabled,
                                    norisk_mod_identifier: Some(norisk_mod_identifier),
                                });

                                if status.is_specific_version_in_pack {
                                    break; // Found specific version in pack
                                }
                            }
                        }
                    }
                    if status.is_specific_version_in_pack {
                        break; // Found specific version in pack
                    }
                }
                if status.is_included_in_norisk_pack {
                    debug!("Found content (some version) in Norisk Pack definition.");
                } else {
                    debug!(
                        "Content not found in the definition of Norisk Pack '{}' for MC {} / {}",
                        pack_id, target_game_version, target_loader_str
                    );
                }
            }
            Err(e) => {
                warn!("Could not resolve Norisk Pack definition for pack ID '{}': {}. Skipping pack check.", pack_id, e);
            }
        }
    }

    // --- Installed Check (Type-Dependent) ---
    let target_type = params.project_type.as_deref().unwrap_or("mod");
    debug!("Checking local installation for type: {}", target_type);

    match target_type {
        "mod" => {
            debug!(
                "Checking locally installed mods in profile {}...",
                params.profile_id
            );
            for installed_mod in &profile.mods {
                let mut mod_project_id: Option<&str> = None;
                let mut mod_version_id: Option<&str> = None;
                let mut mod_sha1_hash: Option<&str> = None;
                let mut mod_file_name_str: Option<&str> = None; // Renamed to avoid conflict

                if let ModSource::Modrinth {
                    project_id: pid,
                    version_id: vid,
                    file_hash_sha1: hash_opt,
                    file_name: fname,
                    ..
                } = &installed_mod.source
                {
                    mod_project_id = Some(pid);
                    mod_version_id = Some(vid);
                    mod_sha1_hash = hash_opt.as_deref();
                    mod_file_name_str = Some(fname);
                }
                // TODO: Add extraction logic for other source types

                let mut match_project = true;
                if let Some(pid) = &params.project_id {
                    match_project = mod_project_id == Some(pid.as_str());
                }
                let mut match_version = true;
                if let Some(vid) = &params.version_id {
                    match_version = mod_version_id == Some(vid.as_str());
                }
                let mut match_hash = true;
                if let Some(hash) = &params.file_hash_sha1 {
                    match_hash = mod_sha1_hash == Some(hash.as_str());
                }
                let mut match_name = true;
                if let Some(name) = &params.file_name {
                    match_name = mod_file_name_str == Some(name.as_str());
                }
                let mut match_game_version = true;
                if let Some(installed_versions) = &installed_mod.game_versions {
                    match_game_version =
                        installed_versions.contains(&target_game_version.to_string());
                }
                let mut match_loader = true;
                if let Some(installed_loader_enum) = &installed_mod.associated_loader {
                    match_loader = installed_loader_enum.as_str() == target_loader_str;
                }

                if match_project
                    && match_version
                    && match_hash
                    && match_name
                    && match_game_version
                    && match_loader
                {
                    info!(
                        "Found matching locally installed mod for context ({} {}): {}",
                        target_game_version,
                        target_loader_str,
                        installed_mod
                            .display_name
                            .as_deref()
                            .unwrap_or("[Unknown Name]")
                    );
                    status.is_installed = true;
                    status.is_enabled = Some(installed_mod.enabled);
                    status.found_item_details = Some(FoundItemDetails {
                        item_type: ContentType::Mod,
                        item_id: Some(installed_mod.id.to_string()),
                        file_name: mod_file_name_str.map(String::from),
                        display_name: installed_mod.display_name.clone(),
                    });
                    break;
                }
            }
            if !status.is_installed {
                info!(
                    "No matching mod found locally installed in profile {} for context ({} {})",
                    params.profile_id, target_game_version, target_loader_str
                );
            }
        }
        "resourcepack" => {
            debug!(
                "Checking locally installed resource packs in profile {}...",
                params.profile_id
            );
            match resourcepack_utils::get_resourcepacks_for_profile(&profile, true, true).await {
                Ok(packs) => {
                    for pack_info in &packs {
                        let modrinth_pid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.project_id.as_str());
                        let modrinth_vid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.version_id.as_str());
                        let pack_hash = pack_info.sha1_hash.as_deref();
                        let pack_filename_str = Some(pack_info.filename.as_str()); // Renamed

                        // Match against provided parameters (excluding context for RPs)
                        let mut match_project = true;
                        if let Some(pid) = &params.project_id {
                            match_project = modrinth_pid == Some(pid.as_str());
                        }
                        let mut match_version = true;
                        if let Some(vid) = &params.version_id {
                            match_version = modrinth_vid == Some(vid.as_str());
                        }
                        let mut match_hash = true;
                        if let Some(hash) = &params.file_hash_sha1 {
                            match_hash = pack_hash == Some(hash.as_str());
                        }
                        let mut match_name = true;
                        if let Some(name) = &params.file_name {
                            match_name = pack_filename_str == Some(name.as_str());
                        }

                        if match_project && match_version && match_hash && match_name {
                            info!(
                                "Found matching locally installed resource pack: {}",
                                pack_info.filename
                            );
                            status.is_installed = true;
                            status.is_enabled = Some(!pack_info.is_disabled);
                            status.found_item_details = Some(FoundItemDetails {
                                item_type: ContentType::ResourcePack,
                                item_id: None, // No specific ID for RPs in this context
                                file_name: Some(pack_info.filename.clone()),
                                display_name: Some(pack_info.filename.clone()), // Use filename as display_name
                            });
                            break;
                        }
                    }
                    if !status.is_installed {
                        info!(
                            "No matching resource pack found locally installed in profile {}",
                            params.profile_id
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        "Failed to list resource packs for profile {}: {}. Assuming not installed.",
                        params.profile_id, e
                    );
                }
            }
        }
        "shaderpack" => {
            debug!(
                "Checking locally installed shader packs in profile {}...",
                params.profile_id
            );
            match shaderpack_utils::get_shaderpacks_for_profile(&profile).await {
                Ok(packs) => {
                    for pack_info in &packs {
                        let modrinth_pid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.project_id.as_str());
                        let modrinth_vid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.version_id.as_str());
                        let pack_hash = pack_info.sha1_hash.as_deref();
                        let pack_filename_str = Some(pack_info.filename.as_str()); // Renamed

                        // Match against provided parameters (excluding context)
                        let mut match_project = true;
                        if let Some(pid) = &params.project_id {
                            match_project = modrinth_pid == Some(pid.as_str());
                        }
                        let mut match_version = true;
                        if let Some(vid) = &params.version_id {
                            match_version = modrinth_vid == Some(vid.as_str());
                        }
                        let mut match_hash = true;
                        if let Some(hash) = &params.file_hash_sha1 {
                            match_hash = pack_hash == Some(hash.as_str());
                        }
                        let mut match_name = true;
                        if let Some(name) = &params.file_name {
                            match_name = pack_filename_str == Some(name.as_str());
                        }

                        if match_project && match_version && match_hash && match_name {
                            info!(
                                "Found matching locally installed shader pack: {}",
                                pack_info.filename
                            );
                            status.is_installed = true;
                            status.is_enabled = Some(!pack_info.is_disabled);
                            status.found_item_details = Some(FoundItemDetails {
                                item_type: ContentType::ShaderPack,
                                item_id: None,
                                file_name: Some(pack_info.filename.clone()),
                                display_name: Some(pack_info.filename.clone()), // Use filename as display_name
                            });
                            break;
                        }
                    }
                    if !status.is_installed {
                        info!(
                            "No matching shader pack found locally installed in profile {}",
                            params.profile_id
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        "Failed to list shader packs for profile {}: {}. Assuming not installed.",
                        params.profile_id, e
                    );
                }
            }
        }
        "datapack" => {
            debug!(
                "Checking locally installed data packs in profile {}...",
                params.profile_id
            );
            match datapack_utils::get_datapacks_for_profile(&profile).await {
                Ok(packs) => {
                    for pack_info in &packs {
                        let modrinth_pid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.project_id.as_str());
                        let modrinth_vid = pack_info
                            .modrinth_info
                            .as_ref()
                            .map(|m| m.version_id.as_str());
                        let pack_hash = pack_info.sha1_hash.as_deref();
                        let pack_filename_str = Some(pack_info.filename.as_str()); // Renamed

                        // Match against provided parameters (excluding context)
                        let mut match_project = true;
                        if let Some(pid) = &params.project_id {
                            match_project = modrinth_pid == Some(pid.as_str());
                        }
                        let mut match_version = true;
                        if let Some(vid) = &params.version_id {
                            match_version = modrinth_vid == Some(vid.as_str());
                        }
                        let mut match_hash = true;
                        if let Some(hash) = &params.file_hash_sha1 {
                            match_hash = pack_hash == Some(hash.as_str());
                        }
                        let mut match_name = true;
                        if let Some(name) = &params.file_name {
                            match_name = pack_filename_str == Some(name.as_str());
                        }

                        if match_project && match_version && match_hash && match_name {
                            info!(
                                "Found matching locally installed data pack: {}",
                                pack_info.filename
                            );
                            status.is_installed = true;
                            status.is_enabled = Some(!pack_info.is_disabled);
                            status.found_item_details = Some(FoundItemDetails {
                                item_type: ContentType::DataPack,
                                item_id: None,
                                file_name: Some(pack_info.filename.clone()),
                                display_name: Some(pack_info.filename.clone()), // Use filename as display_name
                            });
                            break;
                        }
                    }
                    if !status.is_installed {
                        info!(
                            "No matching data pack found locally installed in profile {}",
                            params.profile_id
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        "Failed to list data packs for profile {}: {}. Assuming not installed.",
                        params.profile_id, e
                    );
                }
            }
        }
        _ => {
            warn!(
                "Checking installation for content type '{}' is not yet implemented.",
                target_type
            );
        }
    }

    if status.is_installed {
        debug!(
            "Final status: Found content installed locally. Enabled: {:?}. Details: {:?}",
            status.is_enabled, status.found_item_details
        );
    } else {
        debug!("Final status: Content not found locally.");
    }

    Ok(status)
}

/// Opens the `latest.log` file for a given profile using the system's default application.
///
/// # Arguments
///
/// * `app_handle` - The Tauri application handle to access plugins like the opener.
/// * `profile_id` - The UUID of the profile whose log file should be opened.
///
/// # Returns
///
/// Returns `Ok(())` on success, or an `AppError` if the profile instance path cannot be determined,
/// the log file doesn't exist, or the file cannot be opened.
pub async fn open_latest_log_for_profile<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    profile_id: Uuid,
) -> Result<()> {
    info!("Attempting to open latest.log for profile {}", profile_id);

    // Get the profile instance path
    let state = State::get().await?;
    let instance_path = state
        .profile_manager
        .get_profile_instance_path(profile_id)
        .await?; // This returns Result<PathBuf, AppError>

    // Construct the path to the log file
    let log_path = instance_path.join("logs").join("latest.log");
    debug!("Constructed log path: {}", log_path.display());

    // Check if the log file exists
    if !log_path.exists() {
        warn!("latest.log not found at {}", log_path.display());
        return Err(AppError::FileNotFound(log_path));
    }

    // Open the log file using the system's default viewer
    info!("Opening log file: {}", log_path.display());
    match app_handle
        .opener()
        .open_path(log_path.to_string_lossy(), None::<&str>)
    {
        Ok(_) => {
            info!(
                "Successfully requested opening of log file: {}",
                log_path.display()
            );
            Ok(())
        }
        Err(e) => {
            error!("Failed to open log file {}: {}", log_path.display(), e);
            Err(AppError::Other(format!("Failed to open log file: {}", e)))
        }
    }
}

/// Gets the content of the `latest.log` file for a given profile.
///
/// # Arguments
///
/// * `profile_id` - The UUID of the profile whose log content is needed.
///
/// # Returns
///
/// Returns `Ok(String)` containing the log content on success.
/// Returns an empty string in `Ok` if the log file is not found.
/// Returns an `AppError` if the profile instance path cannot be determined or reading fails.
pub async fn get_latest_log_content(profile_id: Uuid) -> Result<String> {
    info!(
        "Attempting to get latest.log content for profile {}",
        profile_id
    );

    // Get the profile instance path
    let state = State::get().await?;
    let instance_path = state
        .profile_manager
        .get_profile_instance_path(profile_id)
        .await?;

    // Construct the path to the log file
    let log_path = instance_path.join("logs").join("latest.log");

    // Use the new utility function to read the log file content
    file_utils::read_log_file_content(&log_path).await
}

/// Lists all log files (`.log` and `.log.gz`) for a given profile.
///
/// # Arguments
///
/// * `profile_id` - The UUID of the profile whose log files should be listed.
///
/// # Returns
///
/// Returns `Ok(Vec<PathBuf>)` containing the paths to the log files on success.
/// Returns an empty vector in `Ok` if the logs directory does not exist.
/// Returns an `AppError` if the profile instance path cannot be determined or reading the directory fails.
pub async fn list_log_files(profile_id: Uuid) -> Result<Vec<PathBuf>> {
    info!("Listing log files for profile {}", profile_id);

    // Get the profile instance path
    let state = State::get().await?;
    let instance_path = state
        .profile_manager
        .get_profile_instance_path(profile_id)
        .await?;

    // Construct the path to the logs directory
    let logs_dir = instance_path.join("logs");
    debug!("Logs directory path: {}", logs_dir.display());

    // Check if the logs directory exists
    if !logs_dir.exists() {
        warn!(
            "Logs directory not found at {}. Returning empty list.",
            logs_dir.display()
        );
        return Ok(Vec::new());
    }

    let mut log_files = Vec::new();
    let mut entries = match fs::read_dir(&logs_dir).await {
        Ok(entries) => entries,
        Err(e) => {
            error!(
                "Failed to read logs directory {}: {}",
                logs_dir.display(),
                e
            );
            return Err(AppError::Io(e));
        }
    };

    while let Some(entry_result) = entries.next_entry().await.map_err(|e| {
        error!(
            "Failed to read entry in logs directory {}: {}",
            logs_dir.display(),
            e
        );
        AppError::Io(e)
    })? {
        let path = entry_result.path();
        if path.is_file() {
            if let Some(filename_str) = path.file_name().and_then(|n| n.to_str()) {
                if filename_str.ends_with(".log") || filename_str.ends_with(".log.gz") {
                    log_files.push(path);
                }
            }
        }
    }

    info!(
        "Found {} log file(s) for profile {}",
        log_files.len(),
        profile_id
    );
    Ok(log_files)
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
    let temp_dir = tempfile::tempdir()
        .map_err(|e| AppError::Other(format!("Failed to create temporary directory: {}", e)))?;
    let temp_path = temp_dir.path();
    debug!(
        "Created temporary directory for export: {}",
        temp_path.display()
    );

    // Create the overrides directory
    let overrides_dir = temp_path.join("overrides");
    fs::create_dir_all(&overrides_dir)
        .await
        .map_err(|e| AppError::Io(e))?;

    // Write the profile data to a JSON file
    let profile_json_path = temp_path.join("profile.json");
    let profile_json = serde_json::to_string_pretty(&export_profile)?;
    let mut profile_file = fs::File::create(&profile_json_path)
        .await
        .map_err(|e| AppError::Io(e))?;
    profile_file
        .write_all(profile_json.as_bytes())
        .await
        .map_err(|e| AppError::Io(e))?;

    // Copy files to the overrides directory if specified
    if let Some(files) = include_files {
        for file_path in files {
            if !file_path.exists() {
                debug!("Skipping non-existent file: {}", file_path.display());
                continue;
            }

            // Get source path and relative path within the profile
            let profile_instance_path = state
                .profile_manager
                .get_profile_instance_path(profile_id)
                .await?;

            // Only process files that are within the profile instance path
            if let Ok(rel_path) = file_path.strip_prefix(&profile_instance_path) {
                let target_path = overrides_dir.join(rel_path);

                // Create parent directories if needed
                if let Some(parent) = target_path.parent() {
                    fs::create_dir_all(parent)
                        .await
                        .map_err(|e| AppError::Io(e))?;
                }

                if file_path.is_dir() {
                    // Copy directory recursively
                    copy_dir_recursively(&file_path, &target_path).await?;
                    debug!(
                        "Copied directory {} to {}",
                        file_path.display(),
                        target_path.display()
                    );
                } else {
                    // Copy file
                    fs::copy(&file_path, &target_path)
                        .await
                        .map_err(|e| AppError::Io(e))?;
                    debug!(
                        "Copied file {} to {}",
                        file_path.display(),
                        target_path.display()
                    );
                }
            } else {
                debug!(
                    "Skipping file outside profile path: {}",
                    file_path.display()
                );
            }
        }
    }

    // Determine the output file path
    let output_file = match output_path {
        Some(path) => path,
        None => {
            // Generate a default output path
            let safe_name = profile.name.replace(" ", "_").to_lowercase();
            let default_name = format!(
                "{}_v{}_{}.noriskpack",
                safe_name,
                profile.game_version,
                profile.loader.as_str()
            );

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
            fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e))?;
        }
    }

    // Create the zip file
    create_zip_archive(temp_path, &output_file).await?;

    info!(
        "Successfully exported profile to: {}",
        output_file.display()
    );
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
                fs::copy(&entry_path, &target_path)
                    .await
                    .map_err(|e| AppError::Io(e))?;
            }
        }

        Ok(())
    })
}

/// Creates a zip archive from a directory
async fn create_zip_archive(src_dir: &Path, dst_file: &Path) -> Result<()> {
    debug!(
        "Creating zip archive at {:?} from directory {:?}",
        dst_file, src_dir
    );

    // Create the destination file
    let file = fs::File::create(dst_file)
        .await
        .map_err(|e| AppError::Io(e))?;
    let mut writer = ZipFileWriter::with_tokio(file);

    // Add all files from the src_dir recursively, but maintain proper relative paths
    // Only files inside the src_dir should be included
    add_dir_to_zip(&mut writer, src_dir, src_dir).await?;

    // Close the zip file
    writer
        .close()
        .await
        .map_err(|e| AppError::Other(format!("Failed to finalize zip file: {}", e)))?;

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
        let mut entries = fs::read_dir(current_dir)
            .await
            .map_err(|e| AppError::Io(e))?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Io(e))? {
            let path = entry.path(); // Absolute path of the current file/directory

            // Create relative path from root_dir - this ensures proper directory structure in the zip
            // And normalize path separators to forward slashes for zip compatibility.
            let rel_path_str = path
                .strip_prefix(root_dir)
                .map_err(|e| {
                    AppError::Other(format!(
                        "Path prefix error stripping {:?} from {:?}: {}",
                        root_dir, path, e
                    ))
                })?
                .to_string_lossy()
                .to_string()
                .replace('\\', "/"); // Normalize to forward slashes

            if path.is_dir() {
                // For directories, ensure the entry name ends with a forward slash.
                let dir_entry_name = if rel_path_str.is_empty() {
                    // Should not happen if root_dir itself is not added directly with empty name
                    // Potentially skip adding the root dir itself as an explicit entry if it's meant to be implicit
                    // Or handle as needed, e.g., if zipping contents *of* root_dir, rel_path_str might be empty for root_dir's direct children's parent dir entry
                    // For now, if rel_path_str is empty for a dir, it implies we are at the root_dir itself, which shouldn't be added as named entry.
                    // We only add named entries for children.
                    String::new() // Placeholder, logic below skips if empty
                } else if rel_path_str.ends_with('/') {
                    rel_path_str.clone()
                } else {
                    format!("{}/", rel_path_str)
                };

                if !dir_entry_name.is_empty() {
                    // Only add non-empty directory names
                    let dir_builder =
                        ZipEntryBuilder::new(dir_entry_name.into(), Compression::Stored);
                    writer
                        .write_entry_whole(dir_builder, &[])
                        .await
                        .map_err(|e| {
                            AppError::Other(format!("Failed to add directory to zip: {}", e))
                        })?;
                }

                // Then recursively add its contents
                add_dir_to_zip(writer, root_dir, &path).await?; // Pass original absolute path for recursion
            } else {
                // For files, read the content and add it
                let file_data = fs::read(&path).await.map_err(|e| AppError::Io(e))?;
                // Ensure rel_path_str is not empty for a file (should always be the case if not zipping root_dir itself as an entry)
                if rel_path_str.is_empty() {
                    return Err(AppError::Other(format!(
                        "Attempted to add file with empty relative path: {:?}",
                        path
                    )));
                }
                let file_builder = ZipEntryBuilder::new(rel_path_str.into(), Compression::Deflate);

                writer
                    .write_entry_whole(file_builder, &file_data)
                    .await
                    .map_err(|e| AppError::Other(format!("Failed to add file to zip: {}", e)))?;
            }
        }

        Ok(())
    })
}

// Added: ScreenshotInfo struct
#[derive(Serialize, Clone, Debug)]
pub struct ScreenshotInfo {
    pub filename: String,
    pub path: PathBuf,
    pub modified: Option<chrono::DateTime<chrono::Utc>>, // Use chrono for timestamps
}

/// Recursively finds screenshot files in a directory and its subdirectories.
pub fn find_screenshots_recursive<'a>(
    dir_path: &'a Path,
    screenshots: &'a mut Vec<ScreenshotInfo>,
) -> BoxFuture<'a, Result<()>> {
    async move {
        if !dir_path.exists() || !dir_path.is_dir() {
            return Ok(()); // Nothing to do if the path doesn't exist or isn't a directory
        }

        let mut dir_entries = match fs::read_dir(dir_path).await {
            Ok(entries) => entries,
            Err(e) => {
                error!("Failed to read directory {:?}: {}", dir_path, e);
                return Err(AppError::Io(e));
            }
        };

        while let Some(entry_result) = dir_entries.next_entry().await.map_err(|e| {
            error!("Failed to read entry in directory {:?}: {}", dir_path, e);
            AppError::Io(e)
        })? {
            let path = entry_result.path();
            if path.is_dir() {
                // If it's a directory, recurse into it
                find_screenshots_recursive(&path, screenshots).await?; // Use .await here
            } else if path.is_file() {
                // If it's a file, check if it's a PNG
                if let Some(filename_str) = path.file_name().and_then(|n| n.to_str()) {
                    if filename_str.to_lowercase().ends_with(".png") {
                        let modified_time = match fs::metadata(&path).await {
                            Ok(metadata) => match metadata.modified() {
                                Ok(sys_time) => {
                                    Some(chrono::DateTime::<chrono::Utc>::from(sys_time))
                                }
                                Err(e) => {
                                    warn!("Could not get modified time for {:?}: {}", path, e);
                                    None
                                }
                            },
                            Err(e) => {
                                warn!("Could not get metadata for {:?}: {}", path, e);
                                None
                            }
                        };

                        screenshots.push(ScreenshotInfo {
                            filename: filename_str.to_string(),
                            path: path.clone(),
                            modified: modified_time,
                        });
                    }
                }
            }
            // Ignore other entry types (symlinks, etc.)
        }
        Ok(())
    }
    .boxed() // Use .boxed() from FutureExt trait
}

/// Lists screenshot files found in the profile's `screenshots` directory and its subdirectories.
/// Only includes files ending in `.png`.
pub async fn get_screenshots_for_profile(profile_id: Uuid) -> Result<Vec<ScreenshotInfo>> {
    let state = State::get().await?;
    let instance_path = state
        .profile_manager
        .get_profile_instance_path(profile_id)
        .await?;
    let screenshots_path = instance_path.join("screenshots");
    let mut screenshots = Vec::new();

    // Call the recursive helper function starting from the main screenshots directory
    find_screenshots_recursive(&screenshots_path, &mut screenshots).await?;

    // Sort the collected screenshots by modified time (newest first)
    screenshots.sort_by(|a, b| b.modified.cmp(&a.modified));

    info!(
        "Found {} screenshot(s) in total within {:?} and its subdirectories",
        screenshots.len(),
        screenshots_path
    );
    Ok(screenshots)
}

// --- Batch Content Check Types ---
#[derive(Deserialize, Debug, Clone, Serialize)]
pub struct BatchCheckContentParams {
    pub profile_id: Uuid,
    pub requests: Vec<ContentCheckRequest>,
}

#[derive(Deserialize, Debug, Clone, Serialize)]
pub struct ContentCheckRequest {
    pub project_id: Option<String>,
    pub version_id: Option<String>,
    pub file_hash_sha1: Option<String>,
    pub file_name: Option<String>,
    pub project_type: Option<String>,
    pub game_version: Option<String>,
    pub loader: Option<String>,
    pub pack_version_number: Option<String>,
    pub request_id: Option<String>, // Optional client-provided ID to match requests with responses
}

#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct BatchContentInstallStatus {
    pub results: Vec<ContentCheckResult>,
}

#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct ContentCheckResult {
    pub request_id: Option<String>, // Same ID that was provided in the request
    pub status: ContentInstallStatus,
    pub project_id: Option<String>, // Echo back key identifiers for easier matching
    pub version_id: Option<String>,
    pub file_name: Option<String>,
    pub project_type: Option<String>,
}

/// Checks the installation status of multiple Modrinth content items in batch.
///
/// This function is optimized to minimize repeated operations when checking multiple items
/// of the same content type. For example, when checking multiple resource packs, it will
/// load the list of installed resource packs only once.
///
/// # Arguments
///
/// * `params` - A struct containing the profile ID and a list of content check requests.
///
/// # Returns
///
/// Returns `Ok(BatchContentInstallStatus)` with the status for each request, or `Err` if errors occur.
pub async fn check_content_installed_batch(
    params: BatchCheckContentParams,
) -> Result<BatchContentInstallStatus> {
    info!(
        "Batch checking installation status for {} items in profile {}",
        params.requests.len(),
        params.profile_id
    );

    // If empty request list, return empty result
    if params.requests.is_empty() {
        return Ok(BatchContentInstallStatus {
            results: Vec::new(),
        });
    }

    // Get the profile once for all requests
    let state = State::get().await?;
    let profile = state.profile_manager.get_profile(params.profile_id).await?;

    // Group requests by content type to avoid repeated operations
    let mut mod_requests: Vec<(&ContentCheckRequest, usize)> = Vec::new();
    let mut resourcepack_requests: Vec<(&ContentCheckRequest, usize)> = Vec::new();
    let mut shaderpack_requests: Vec<(&ContentCheckRequest, usize)> = Vec::new();
    let mut datapack_requests: Vec<(&ContentCheckRequest, usize)> = Vec::new();
    let mut other_requests: Vec<(&ContentCheckRequest, usize)> = Vec::new();

    // Categorize requests while preserving original indices
    for (idx, request) in params.requests.iter().enumerate() {
        let target_type = request.project_type.as_deref().unwrap_or("mod");
        match target_type {
            "mod" => mod_requests.push((request, idx)),
            "resourcepack" => resourcepack_requests.push((request, idx)),
            "shader" => shaderpack_requests.push((request, idx)),
            "datapack" => datapack_requests.push((request, idx)),
            _ => other_requests.push((request, idx)),
        }
    }

    // Create results array with the capacity but don't pre-fill it
    let mut results = Vec::<Option<ContentCheckResult>>::with_capacity(params.requests.len());
    // Make sure all slots are initialized to None
    for _ in 0..params.requests.len() {
        results.push(None);
    }

    // Process mods
    if !mod_requests.is_empty() {
        debug!("Processing {} mod requests", mod_requests.len());
        process_mod_requests(&profile, &mod_requests, &mut results).await?;
    }

    // Process resource packs
    if !resourcepack_requests.is_empty() {
        debug!(
            "Processing {} resource pack requests",
            resourcepack_requests.len()
        );
        process_resourcepack_requests(&profile, &resourcepack_requests, &mut results).await?;
    }

    // Process shader packs
    if !shaderpack_requests.is_empty() {
        debug!(
            "Processing {} shader pack requests",
            shaderpack_requests.len()
        );
        process_shaderpack_requests(&profile, &shaderpack_requests, &mut results).await?;
    }

    // Process data packs
    if !datapack_requests.is_empty() {
        debug!("Processing {} data pack requests", datapack_requests.len());
        process_datapack_requests(&profile, &datapack_requests, &mut results).await?;
    }

    // Process other content types individually
    for (request, idx) in other_requests {
        debug!(
            "Processing individual request for content type: {:?}",
            request.project_type
        );

        // Convert to the old params format
        let old_params = CheckContentParams {
            profile_id: params.profile_id,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_hash_sha1: request.file_hash_sha1.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
            game_version: request.game_version.clone(),
            loader: request.loader.clone(),
            pack_version_number: request.pack_version_number.clone(),
        };

        // Call the original function
        let status = check_content_installed(old_params).await?;

        // Store the result
        results[idx] = Some(ContentCheckResult {
            request_id: request.request_id.clone(),
            status,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
        });
    }

    // Unwrap results and handle any None values (shouldn't happen if implementation is correct)
    let final_results = results
        .into_iter()
        .enumerate()
        .map(|(idx, result)| {
            result.unwrap_or_else(|| {
                warn!("No result was generated for request index {}", idx);
                // Create a default result
                ContentCheckResult {
                    request_id: params.requests[idx].request_id.clone(),
                    status: ContentInstallStatus::default(),
                    project_id: params.requests[idx].project_id.clone(),
                    version_id: params.requests[idx].version_id.clone(),
                    file_name: params.requests[idx].file_name.clone(),
                    project_type: params.requests[idx].project_type.clone(),
                }
            })
        })
        .collect();

    Ok(BatchContentInstallStatus {
        results: final_results,
    })
}

/// Process all mod requests efficiently
async fn process_mod_requests(
    profile: &Profile,
    requests: &[(&ContentCheckRequest, usize)],
    results: &mut Vec<Option<ContentCheckResult>>,
) -> Result<()> {
    // For each request, we need to check both in NoRisk Pack and local installation
    for (request, idx) in requests {
        // Convert to the old params format for reusing norisk pack check logic
        let old_params = CheckContentParams {
            profile_id: profile.id,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_hash_sha1: request.file_hash_sha1.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
            game_version: request.game_version.clone(),
            loader: request.loader.clone(),
            pack_version_number: request.pack_version_number.clone(),
        };

        // Initialize the status struct
        let mut status = ContentInstallStatus::default();

        // Determine target contexts
        let target_loader_str = match &request.loader {
            Some(loader_str) => loader_str.as_str(),
            None => profile.loader.as_str(),
        };

        let target_game_version_str_buf;
        let target_game_version = match &request.game_version {
            Some(gv_str) => gv_str.as_str(),
            None => {
                target_game_version_str_buf = profile.game_version.clone();
                target_game_version_str_buf.as_str()
            }
        };

        // Check if included in NoRisk Pack
        if let Some(pack_id) = &profile.selected_norisk_pack_id {
            let state = State::get().await?;
            let config = state.norisk_pack_manager.get_config().await;

            if let Ok(resolved_pack) = config.get_resolved_pack_definition(pack_id) {
                for norisk_mod in &resolved_pack.mods {
                    let mut is_potential_project_match = false;
                    if let (
                        Some(pid_arg),
                        norisk_packs::NoriskModSourceDefinition::Modrinth {
                            project_id: norisk_pid,
                            ..
                        },
                    ) = (&request.project_id, &norisk_mod.source)
                    {
                        if pid_arg == norisk_pid {
                            is_potential_project_match = true;
                        }
                    }

                    if is_potential_project_match {
                        if let Some(loader_map) = norisk_mod.compatibility.get(target_game_version)
                        {
                            if let Some(target) = loader_map.get(target_loader_str) {
                                status.is_included_in_norisk_pack = true;

                                // Check specific version match
                                if let Some(v_num_arg) = &request.pack_version_number {
                                    if v_num_arg == &target.identifier {
                                        status.is_specific_version_in_pack = true;
                                    }
                                }

                                // Add NoRiskPackItemDetails
                                let mod_identifier = norisk_mod.id.clone();

                                let norisk_mod_identifier =
                                    crate::state::profile_state::NoriskModIdentifier {
                                        pack_id: pack_id.clone(),
                                        mod_id: mod_identifier.clone(),
                                        game_version: target_game_version.to_string(),
                                        loader: crate::state::profile_state::ModLoader::from_str(
                                            target_loader_str,
                                        )
                                        .unwrap_or(profile.loader.clone()),
                                    };

                                let is_pack_mod_enabled = !profile
                                    .disabled_norisk_mods_detailed
                                    .contains(&norisk_mod_identifier);

                                status.norisk_pack_item_details = Some(NoRiskPackItemDetails {
                                    is_enabled: is_pack_mod_enabled,
                                    norisk_mod_identifier: Some(norisk_mod_identifier),
                                });

                                if status.is_specific_version_in_pack {
                                    break; // Found specific version
                                }
                            }
                        }
                    }
                    if status.is_specific_version_in_pack {
                        break; // Found specific version
                    }
                }
            }
        }

        // Check if locally installed
        for installed_mod in &profile.mods {
            let mut mod_project_id: Option<&str> = None;
            let mut mod_version_id: Option<&str> = None;
            let mut mod_sha1_hash: Option<&str> = None;
            let mut mod_file_name_str: Option<&str> = None;

            if let ModSource::Modrinth {
                project_id: pid,
                version_id: vid,
                file_hash_sha1: hash_opt,
                file_name: fname,
                ..
            } = &installed_mod.source
            {
                mod_project_id = Some(pid);
                mod_version_id = Some(vid);
                mod_sha1_hash = hash_opt.as_deref();
                mod_file_name_str = Some(fname);
            }

            let mut match_project = true;
            if let Some(pid) = &request.project_id {
                match_project = mod_project_id == Some(pid.as_str());
            }
            let mut match_version = true;
            if let Some(vid) = &request.version_id {
                match_version = mod_version_id == Some(vid.as_str());
            }
            let mut match_hash = true;
            if let Some(hash) = &request.file_hash_sha1 {
                match_hash = mod_sha1_hash == Some(hash.as_str());
            }
            let mut match_name = true;
            if let Some(name) = &request.file_name {
                match_name = mod_file_name_str == Some(name.as_str());
            }
            let mut match_game_version = true;
            if let Some(installed_versions) = &installed_mod.game_versions {
                match_game_version = installed_versions.contains(&target_game_version.to_string());
            }
            let mut match_loader = true;
            if let Some(installed_loader_enum) = &installed_mod.associated_loader {
                match_loader = installed_loader_enum.as_str() == target_loader_str;
            }

            if match_project
                && match_version
                && match_hash
                && match_name
                && match_game_version
                && match_loader
            {
                status.is_installed = true;
                status.is_enabled = Some(installed_mod.enabled);
                status.found_item_details = Some(FoundItemDetails {
                    item_type: ContentType::Mod,
                    item_id: Some(installed_mod.id.to_string()),
                    file_name: mod_file_name_str.map(String::from),
                    display_name: installed_mod.display_name.clone(),
                });
                break;
            }
        }

        // Store the result
        results[*idx] = Some(ContentCheckResult {
            request_id: request.request_id.clone(),
            status,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
        });
    }

    Ok(())
}

/// Process all resource pack requests efficiently
async fn process_resourcepack_requests(
    profile: &Profile,
    requests: &[(&ContentCheckRequest, usize)],
    results: &mut Vec<Option<ContentCheckResult>>,
) -> Result<()> {
    // Load all resource packs once
    let packs = match resourcepack_utils::get_resourcepacks_for_profile(profile, true, false).await {
        Ok(packs) => packs,
        Err(e) => {
            warn!(
                "Failed to list resource packs: {}. Assuming none installed.",
                e
            );
            Vec::new()
        }
    };

    for (request, idx) in requests {
        // Initialize the status struct
        let mut status = ContentInstallStatus::default();

        // Check NoRisk Pack - reuse old function for now
        let old_params = CheckContentParams {
            profile_id: profile.id,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_hash_sha1: request.file_hash_sha1.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
            game_version: request.game_version.clone(),
            loader: request.loader.clone(),
            pack_version_number: request.pack_version_number.clone(),
        };

        // Check if in NoRisk Pack
        if let Some(pack_id) = &profile.selected_norisk_pack_id {
            let state = State::get().await?;
            let config = state.norisk_pack_manager.get_config().await;

            if let Ok(resolved_pack) = config.get_resolved_pack_definition(pack_id) {
                // Check if the pack includes this resource pack
                // (Note: This would need to be expanded if NoRisk Packs can contain resource packs)
                // For now, this is a placeholder as the original function doesn't handle this case specifically
            }
        }

        // Check local installation against the preloaded packs
        for pack_info in &packs {
            let modrinth_pid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.project_id.as_str());
            let modrinth_vid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.version_id.as_str());
            let pack_hash = pack_info.sha1_hash.as_deref();
            let pack_filename_str = Some(pack_info.filename.as_str());

            // Match against provided parameters
            let mut match_project = true;
            if let Some(pid) = &request.project_id {
                match_project = modrinth_pid == Some(pid.as_str());
            }
            let mut match_version = true;
            if let Some(vid) = &request.version_id {
                match_version = modrinth_vid == Some(vid.as_str());
            }
            let mut match_hash = true;
            if let Some(hash) = &request.file_hash_sha1 {
                match_hash = pack_hash == Some(hash.as_str());
            }
            let mut match_name = true;
            if let Some(name) = &request.file_name {
                match_name = pack_filename_str == Some(name.as_str());
            }

            if match_project && match_version && match_hash && match_name {
                status.is_installed = true;
                status.is_enabled = Some(!pack_info.is_disabled);
                status.found_item_details = Some(FoundItemDetails {
                    item_type: ContentType::ResourcePack,
                    item_id: None,
                    file_name: Some(pack_info.filename.clone()),
                    display_name: Some(pack_info.filename.clone()),
                });
                break;
            }
        }

        // Store the result
        results[*idx] = Some(ContentCheckResult {
            request_id: request.request_id.clone(),
            status,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
        });
    }

    Ok(())
}

/// Process all shader pack requests efficiently
async fn process_shaderpack_requests(
    profile: &Profile,
    requests: &[(&ContentCheckRequest, usize)],
    results: &mut Vec<Option<ContentCheckResult>>,
) -> Result<()> {
    // Load all shader packs once
    let packs = match shaderpack_utils::get_shaderpacks_for_profile(profile).await {
        Ok(packs) => packs,
        Err(e) => {
            warn!(
                "Failed to list shader packs: {}. Assuming none installed.",
                e
            );
            Vec::new()
        }
    };

    for (request, idx) in requests {
        // Initialize the status struct
        let mut status = ContentInstallStatus::default();

        // Check if in NoRisk Pack - placeholder for future NoRisk Pack shader support
        if let Some(pack_id) = &profile.selected_norisk_pack_id {
            // Placeholder for future implementation
        }

        // Check local installation against the preloaded packs
        for pack_info in &packs {
            let modrinth_pid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.project_id.as_str());
            let modrinth_vid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.version_id.as_str());
            let pack_hash = pack_info.sha1_hash.as_deref();
            let pack_filename_str = Some(pack_info.filename.as_str());

            // Match against provided parameters
            let mut match_project = true;
            if let Some(pid) = &request.project_id {
                match_project = modrinth_pid == Some(pid.as_str());
            }
            let mut match_version = true;
            if let Some(vid) = &request.version_id {
                match_version = modrinth_vid == Some(vid.as_str());
            }
            let mut match_hash = true;
            if let Some(hash) = &request.file_hash_sha1 {
                match_hash = pack_hash == Some(hash.as_str());
            }
            let mut match_name = true;
            if let Some(name) = &request.file_name {
                match_name = pack_filename_str == Some(name.as_str());
            }

            if match_project && match_version && match_hash && match_name {
                status.is_installed = true;
                status.is_enabled = Some(!pack_info.is_disabled);
                status.found_item_details = Some(FoundItemDetails {
                    item_type: ContentType::ShaderPack,
                    item_id: None,
                    file_name: Some(pack_info.filename.clone()),
                    display_name: Some(pack_info.filename.clone()),
                });
                break;
            }
        }

        // Store the result
        results[*idx] = Some(ContentCheckResult {
            request_id: request.request_id.clone(),
            status,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
        });
    }

    Ok(())
}

/// Process all data pack requests efficiently
async fn process_datapack_requests(
    profile: &Profile,
    requests: &[(&ContentCheckRequest, usize)],
    results: &mut Vec<Option<ContentCheckResult>>,
) -> Result<()> {
    // Load all data packs once
    let packs = match datapack_utils::get_datapacks_for_profile(profile).await {
        Ok(packs) => packs,
        Err(e) => {
            warn!("Failed to list data packs: {}. Assuming none installed.", e);
            Vec::new()
        }
    };

    for (request, idx) in requests {
        // Initialize the status struct
        let mut status = ContentInstallStatus::default();

        // Check if in NoRisk Pack - placeholder for future NoRisk Pack datapack support
        if let Some(pack_id) = &profile.selected_norisk_pack_id {
            // Placeholder for future implementation
        }

        // Check local installation against the preloaded packs
        for pack_info in &packs {
            let modrinth_pid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.project_id.as_str());
            let modrinth_vid = pack_info
                .modrinth_info
                .as_ref()
                .map(|m| m.version_id.as_str());
            let pack_hash = pack_info.sha1_hash.as_deref();
            let pack_filename_str = Some(pack_info.filename.as_str());

            // Match against provided parameters
            let mut match_project = true;
            if let Some(pid) = &request.project_id {
                match_project = modrinth_pid == Some(pid.as_str());
            }
            let mut match_version = true;
            if let Some(vid) = &request.version_id {
                match_version = modrinth_vid == Some(vid.as_str());
            }
            let mut match_hash = true;
            if let Some(hash) = &request.file_hash_sha1 {
                match_hash = pack_hash == Some(hash.as_str());
            }
            let mut match_name = true;
            if let Some(name) = &request.file_name {
                match_name = pack_filename_str == Some(name.as_str());
            }

            if match_project && match_version && match_hash && match_name {
                status.is_installed = true;
                status.is_enabled = Some(!pack_info.is_disabled);
                status.found_item_details = Some(FoundItemDetails {
                    item_type: ContentType::DataPack,
                    item_id: None,
                    file_name: Some(pack_info.filename.clone()),
                    display_name: Some(pack_info.filename.clone()),
                });
                break;
            }
        }

        // Store the result
        results[*idx] = Some(ContentCheckResult {
            request_id: request.request_id.clone(),
            status,
            project_id: request.project_id.clone(),
            version_id: request.version_id.clone(),
            file_name: request.file_name.clone(),
            project_type: request.project_type.clone(),
        });
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GenericModrinthInfo {
    pub project_id: String,
    pub version_id: String,
    pub name: String,        // Name des Modrinth-Projekts oder der Version
    pub version_number: String,
    pub download_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalContentItem {
    pub filename: String,
    pub path_str: String, // Pfad als String
    pub sha1_hash: Option<String>,
    pub file_size: u64,
    pub is_disabled: bool,
    pub is_directory: bool, // Wichtig für Shader
    pub content_type: ContentType, // Um den Typ mitzuführen
    pub modrinth_info: Option<GenericModrinthInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)] // Ensure Serialize and Deserialize are here
pub struct LoadItemsParams {
    pub profile_id: Uuid,
    pub content_type: ContentType,
    pub calculate_hashes: bool,
    pub fetch_modrinth_data: bool,
}

pub struct LocalContentLoader; // No longer holds profile_id, becomes a namespace/utility struct

impl LocalContentLoader {
    // new() constructor is removed as loader is now stateless regarding profile_id

    pub async fn load_items( // Made static conceptually, no longer uses &self
        params: LoadItemsParams,
    ) -> Result<Vec<LocalContentItem>> {
        let state = State::get().await?;
        // Fetch profile using profile_id from params
        let profile = state.profile_manager.get_profile(params.profile_id).await?;

        debug!(
            "Loading items for profile: {} ({}), content_type: {:?}, calculate_hashes: {}, fetch_modrinth_data: {}",
            profile.name, params.profile_id, params.content_type, params.calculate_hashes, params.fetch_modrinth_data
        );

        let content_dir = match params.content_type {
            ContentType::ResourcePack => resourcepack_utils::get_resourcepacks_dir(&profile).await?,
            ContentType::ShaderPack => shaderpack_utils::get_shaderpacks_dir(&profile).await?,
            ContentType::DataPack => datapack_utils::get_datapacks_dir(&profile).await?,
            ContentType::Mod => {
                // For mods, we don't read a directory in the same way.
                // We'll process profile.mods directly.
                // We still need the instance path for constructing full paths to mod files.
                let instance_path = state.profile_manager.calculate_instance_path_for_profile(&profile)?;
                instance_path.join("mods") // Return mods directory path for consistency, though iteration logic will differ.
            }
        };

        let mut preliminary_items: Vec<LocalContentItem> = Vec::new();

        if params.content_type == ContentType::Mod {
            let mods_dir = content_dir; // This is <instance_path>/mods
            for mod_item in &profile.mods {
                let mut filename = mod_item.file_name_override.clone();
                if filename.is_none() {
                    match mod_item.source { // Removed & before mod_item.source and Some() wrapper
                        crate::state::profile_state::ModSource::Modrinth { ref file_name, .. } => filename = Some(file_name.clone()),
                        crate::state::profile_state::ModSource::Local { ref file_name, .. } => filename = Some(file_name.clone()),
                        crate::state::profile_state::ModSource::Url { ref file_name, .. } => filename = file_name.clone(), // file_name in ModSourceUrl is Option<String>
                        _ => {
                            warn!("Mod {} has no derivable filename. Skipping.", mod_item.id);
                            continue;
                        }
                    }
                }

                let actual_filename = match filename {
                    Some(name) => name,
                    None => {
                        warn!("Mod {} could not determine a filename even after checks. Skipping.", mod_item.id);
                        continue;
                    }
                };
                
                let path_buf = mods_dir.join(&actual_filename);
                let path_str = path_buf.to_string_lossy().into_owned();

                let file_size = 0; // Placeholder due to cache logic - will revisit

                let sha1_hash = match mod_item.source { // Removed & and Some() wrapper
                    crate::state::profile_state::ModSource::Modrinth { ref file_hash_sha1, .. } => file_hash_sha1.clone(),
                    _ => None,
                };

                let modrinth_info = match mod_item.source { // Removed & and Some() wrapper
                    crate::state::profile_state::ModSource::Modrinth { ref project_id, ref version_id, .. } => {
                        Some(GenericModrinthInfo {
                            project_id: project_id.clone(),
                            version_id: version_id.clone(),
                            name: mod_item.display_name.clone().unwrap_or_else(|| project_id.clone()), 
                            version_number: mod_item.version.clone().unwrap_or_else(|| version_id.clone()), 
                            download_url: None, 
                        })
                    }
                    _ => None,
                };

                preliminary_items.push(LocalContentItem {
                    filename: actual_filename,
                    path_str,
                    sha1_hash, // May be None, will be calculated if params.calculate_hashes is true
                    file_size, // May be 0, might be updated if file is read for hashing
                    is_disabled: !mod_item.enabled,
                    is_directory: false, // Mods are files
                    content_type: ContentType::Mod,
                    modrinth_info,
                });
            }
        } else {
            // Existing logic for ResourcePack, ShaderPack, DataPack
            if !content_dir.exists() {
                debug!("Content directory {} does not exist. Returning empty list.", content_dir.display());
                return Ok(Vec::new());
            }

            let mut entries = fs::read_dir(&content_dir)
                .await
                .map_err(|e| AppError::Io(e))?; 

            let mut items_to_process_with_paths: Vec<(PathBuf, bool)> = Vec::new(); 

            while let Some(entry_result) = entries.next_entry().await.map_err(|e| AppError::Io(e))? {
                let path = entry_result.path();
                let file_name_os = path.file_name().unwrap_or_default();
                let file_name_str = file_name_os.to_string_lossy();
                let is_directory = path.is_dir(); 

                let is_valid_item = match params.content_type { 
                    ContentType::ResourcePack => (file_name_str.ends_with(".zip") || file_name_str.ends_with(".zip.disabled")) && !is_directory,
                    ContentType::ShaderPack => (file_name_str.ends_with(".zip") || file_name_str.ends_with(".zip.disabled")) || is_directory,
                    ContentType::DataPack => (file_name_str.ends_with(".zip") || file_name_str.ends_with(".zip.disabled")) && !is_directory,
                    ContentType::Mod => false, // Should have been caught by the if block above
                };

                if is_valid_item {
                    items_to_process_with_paths.push((path.clone(), is_directory));
                } else {
                    if params.content_type != ContentType::Mod { // Avoid double logging for mods
                        debug!("Skipping invalid item for {:?}: {}", params.content_type, path.display());
                    }
                }
            }
            
            for (path, is_dir_flag) in items_to_process_with_paths {
                let file_name_os = path.file_name().unwrap_or_default();
                let file_name_str = file_name_os.to_string_lossy().to_string();
                let metadata = fs::metadata(&path).await.map_err(|e| AppError::Io(e))?;
                let file_size = metadata.len();
                let is_disabled = file_name_str.ends_with(".disabled");
                let base_filename = if is_disabled {
                    file_name_str.strip_suffix(".disabled").unwrap_or(&file_name_str).to_string()
                } else {
                    file_name_str
                };

                preliminary_items.push(LocalContentItem {
                    filename: base_filename,
                    path_str: path.to_string_lossy().into_owned(),
                    sha1_hash: None,
                    file_size,
                    is_disabled,
                    is_directory: is_dir_flag,
                    content_type: params.content_type.clone(), 
                    modrinth_info: None,
                });
            }
        }
        
        let mut final_items = preliminary_items; 

        if params.calculate_hashes { 
            let mut hash_tasks = Vec::new();
            // Collect indices of items that need hashing (files only, or non-Modrinth mods if hash not present)
            let items_to_hash_indices: Vec<usize> = final_items.iter().enumerate()
                .filter(|(_, item)| {
                    if item.is_directory { return false; }
                    if item.content_type == ContentType::Mod {
                        // For mods, only hash if sha1_hash is currently None (e.g. local mod, or Modrinth mod missing it)
                        return item.sha1_hash.is_none();
                    }
                    // For other types, always hash if calculate_hashes is true (as sha1_hash starts as None)
                    true 
                })
                .map(|(index, _)| index)
                .collect();

            for &index_in_final_items in &items_to_hash_indices {
                let item_info = &final_items[index_in_final_items]; // Borrow item_info
                let path_buf = PathBuf::from(item_info.path_str.clone());
                let semaphore_clone = Arc::clone(&state.io_semaphore); 
                
                hash_tasks.push(tokio::spawn(async move {
                    let permit_result = semaphore_clone.acquire_owned().await;
                    if permit_result.is_err() {
                        error!("Failed to acquire semaphore permit for hashing.");
                        return (index_in_final_items, Err(AppError::Other("Semaphore acquisition failed".to_string())));
                    }
                    // Permit is acquired, proceed with hashing
                    let hash_result = hash_utils::calculate_sha1(&path_buf).await.map_err(AppError::Io);
                    // Permit is automatically dropped when it goes out of scope
                    (index_in_final_items, hash_result)
                }));
            }

            let hash_calculation_results = join_all(hash_tasks).await;
            for task_result in hash_calculation_results {
                match task_result {
                    Ok((item_idx, Ok(sha1))) => {
                        if let Some(item_to_update) = final_items.get_mut(item_idx) {
                            item_to_update.sha1_hash = Some(sha1);
                        }
                    }
                    Ok((item_idx, Err(e))) => {
                        if let Some(item) = final_items.get(item_idx) {
                             warn!("Failed to calculate SHA1 for {}: {}", item.filename, e);
                        } else {
                            warn!("Failed to calculate SHA1 for item at index {}: {}", item_idx, e);
                        }
                    }
                    Err(e) => { // JoinError
                        error!("Hash calculation task panicked: {}", e);
                    }
                }
            }
        }

        if params.fetch_modrinth_data { // Use params.fetch_modrinth_data
            let mut hashes_for_modrinth_lookup: HashMap<String, Vec<usize>> = HashMap::new(); // sha1 -> Vec of indices in final_items
            for (index, item) in final_items.iter().enumerate() {
                if let Some(hash) = &item.sha1_hash {
                    if !item.is_directory { // Only fetch for files with hashes
                        hashes_for_modrinth_lookup.entry(hash.clone()).or_default().push(index);
                    }
                }
            }

            if !hashes_for_modrinth_lookup.is_empty() {
                let hashes_vec: Vec<String> = hashes_for_modrinth_lookup.keys().cloned().collect();
                debug!("Fetching Modrinth info for {} unique hashes (affecting {} items)", hashes_vec.len(), hashes_for_modrinth_lookup.values().map(|v| v.len()).sum::<usize>());
                
                match crate::integrations::modrinth::get_versions_by_hashes(hashes_vec, "sha1").await {
                    Ok(version_map) => {
                        for (hash, modrinth_version) in version_map {
                            if let Some(item_indices) = hashes_for_modrinth_lookup.get(&hash) {
                                for &item_idx in item_indices {
                                    if let Some(item_to_update) = final_items.get_mut(item_idx) {
                                        // Additional check: ensure content type matches Modrinth project type if possible/needed.
                                        // For now, directly assign if a primary file exists.
                                        let primary_file = modrinth_version.files.iter().find(|f| f.primary);
                                        
                                        // TODO: Re-evaluate project type compatibility check.
                                        // The ModrinthVersion struct from get_versions_by_hashes might not include project_type directly.
                                        // This check needs to be re-implemented if project_type is available or fetched separately.
                                        /* 
                                        let project_type_compatible = match params.content_type { // Use params.content_type
                                            ContentType::ResourcePack => modrinth_version.project_type == Some(crate::integrations::modrinth::ModrinthProjectType::ResourcePack),
                                            ContentType::ShaderPack => modrinth_version.project_type == Some(crate::integrations::modrinth::ModrinthProjectType::Shader),
                                            ContentType::DataPack => modrinth_version.project_type == Some(crate::integrations::modrinth::ModrinthProjectType::Datapack),
                                            ContentType::Mod => false, // Should not happen here
                                        };

                                        if !project_type_compatible && modrinth_version.project_type.is_some() {
                                            debug!(
                                                "Skipping Modrinth info for '{}' (hash {}): Mismatched project type. Expected {:?}, got {:?}",
                                                item_to_update.filename, hash, params.content_type, modrinth_version.project_type // Use params.content_type
                                            );
                                            continue;
                                        }
                                        */

                                        if let Some(file_info) = primary_file {
                                            item_to_update.modrinth_info = Some(GenericModrinthInfo {
                                                project_id: modrinth_version.project_id.clone(),
                                                version_id: modrinth_version.id.clone(),
                                                name: modrinth_version.name.clone(),
                                                version_number: modrinth_version.version_number.clone(),
                                                download_url: Some(file_info.url.clone()),
                                            });
                                        } else if !modrinth_version.files.is_empty() {
                                            // Fallback to first file if no primary, but log this
                                            warn!("No primary file for Modrinth version {} (project {}). Using first available file for Modrinth info.", modrinth_version.id, modrinth_version.project_id);
                                            let first_file = &modrinth_version.files[0];
                                             item_to_update.modrinth_info = Some(GenericModrinthInfo {
                                                project_id: modrinth_version.project_id.clone(),
                                                version_id: modrinth_version.id.clone(),
                                                name: modrinth_version.name.clone(),
                                                version_number: modrinth_version.version_number.clone(),
                                                download_url: Some(first_file.url.clone()),
                                            });
                                        } else {
                                            debug!("No files found for Modrinth version {} (project {}) to determine download URL.", modrinth_version.id, modrinth_version.project_id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Failed to fetch Modrinth versions by hashes: {}", e);
                    }
                }
            }
        }
        
        info!("Successfully loaded {} items of type {:?} for profile {}", final_items.len(), params.content_type, params.profile_id);
        Ok(final_items)
    }
}
