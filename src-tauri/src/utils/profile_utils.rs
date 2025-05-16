use crate::error::{AppError, Result};
use crate::integrations::modrinth::{ModrinthProjectType, ModrinthVersion};
use crate::integrations::norisk_packs;
use crate::state::profile_state::Profile;
use crate::state::profile_state::ModSource;
use crate::state::state_manager::State;
use crate::utils::file_utils;
use crate::utils::{datapack_utils, hash_utils, resourcepack_utils, shaderpack_utils};
use async_zip::tokio::write::ZipFileWriter;
use async_zip::{Compression, ZipEntryBuilder};
use chrono;
use futures::future::{BoxFuture, FutureExt};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use serde_json;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use tempfile;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

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
            let instance_path = state.profile_manager.calculate_instance_path_for_profile(profile)?;
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
    pub item_type: ContentType, // Changed from String
    pub item_id: Option<String>, // e.g., Mod ID (UUID) if it's a mod
    pub file_name: Option<String>, // The actual filename on disk
    pub display_name: Option<String>, // Display name if available
}

/// Represents details about an item when it comes from a NoRisk Pack
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NoRiskPackItemDetails {
    pub is_enabled: bool,
    pub norisk_mod_identifier: Option<crate::state::profile_state::NoriskModIdentifier>,
}

#[derive(Serialize, Debug, Default, Clone)]
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
                                let norisk_mod_identifier = crate::state::profile_state::NoriskModIdentifier {
                                    pack_id: pack_id.clone(),
                                    mod_id: mod_identifier.clone(),
                                    game_version: target_game_version.to_string(),
                                    loader: crate::state::profile_state::ModLoader::from_str(target_loader_str).unwrap_or(profile.loader.clone()),
                                };
                                
                                // Check if it's disabled in the profile
                                let is_pack_mod_enabled = !profile.disabled_norisk_mods_detailed.contains(&norisk_mod_identifier);
                                
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
            match resourcepack_utils::get_resourcepacks_for_profile(&profile).await {
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
        debug!("Final status: Found content installed locally. Enabled: {:?}. Details: {:?}", status.is_enabled, status.found_item_details);
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
                .map_err(|e| AppError::Other(format!(
                    "Path prefix error stripping {:?} from {:?}: {}", 
                    root_dir, 
                    path, 
                    e
                )))?
                .to_string_lossy()
                .to_string()
                .replace('\\', "/"); // Normalize to forward slashes

            if path.is_dir() {
                // For directories, ensure the entry name ends with a forward slash.
                let dir_entry_name = if rel_path_str.is_empty() { // Should not happen if root_dir itself is not added directly with empty name
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

                if !dir_entry_name.is_empty() { // Only add non-empty directory names
                    let dir_builder = ZipEntryBuilder::new(dir_entry_name.into(), Compression::Stored);
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
                if rel_path_str.is_empty(){
                    return Err(AppError::Other(format!("Attempted to add file with empty relative path: {:?}", path)));
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
