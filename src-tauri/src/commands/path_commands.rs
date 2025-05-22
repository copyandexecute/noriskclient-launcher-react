use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::{AppError, CommandError};
use crate::state::profile_state::{ImageSource, ProfileBanner};
use crate::state::state_manager::State;
use log::{debug, error, info};
use std::path::PathBuf;
use serde::Deserialize;
use tauri::command;
use uuid::Uuid;

type Result<T> = std::result::Result<T, CommandError>;

/// Payload for the upload_profile_icon command.
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UploadProfileIconPayload {
    path: Option<String>, // Source path of the image file
    profile_id: Uuid,   // UUID of the profile, changed to Uuid type
}

/// Returns the root launcher directory path
#[command]
pub async fn get_launcher_directory() -> Result<String> {
    let path = LAUNCHER_DIRECTORY.root_dir();
    debug!("Returning launcher directory: {:?}", path);
    Ok(path.to_string_lossy().to_string())
}

/// Resolves an image path from various source types to an absolute file:// URL
/// This handles different ImageSource types and returns a format suitable for web display
#[command]
pub async fn resolve_image_path(
    image_source: ImageSource,
    profile_id: Option<String>,
) -> Result<String> {
    debug!(
        "Resolving image path: {:?} for profile: {:?}",
        image_source, profile_id
    );

    match image_source {
        // URL: Already in web-compatible format, just return
        ImageSource::Url { url } => {
            debug!("Using direct URL: {}", url);
            Ok(url)
        }

        // Base64: Format as a data URI
        ImageSource::Base64 { data, mime_type } => {
            let mime = mime_type.unwrap_or_else(|| "image/png".to_string());
            debug!("Using Base64 data with MIME type: {}", mime);

            // Ensure data is properly formatted (no line breaks, etc.)
            let clean_data = data.replace("\n", "").replace("\r", "").replace(" ", "");

            // Return as a properly formatted data URI
            Ok(format!("data:{};base64,{}", mime, clean_data))
        }

        // RelativePath: Relative to launcher directory
        ImageSource::RelativePath { path } => {
            let launcher_dir = LAUNCHER_DIRECTORY.root_dir();
            let full_path = launcher_dir.join(path);

            debug!("Resolved relative path to: {:?}", full_path);
            if !full_path.exists() {
                error!("Image file does not exist: {:?}", full_path);
                // Return an error instead of a fallback image
                return Err(
                    AppError::Other(format!("Image file does not exist: {:?}", full_path)).into(),
                );
            }

            Ok(full_path.to_string_lossy().to_string())
        }

        // RelativeProfile: Relative to profile directory
        ImageSource::RelativeProfile { path } => {
            // We need a profile ID for this type
            if profile_id.is_none() {
                error!("Profile ID is required for relativeProfile image source");
                return Err(AppError::Other(
                    "Profile ID is required for relativeProfile image source".to_string(),
                )
                .into());
            }

            let state = State::get().await?;
            let profile_manager = &state.profile_manager;

            // Parse UUID
            let profile_uuid = match uuid::Uuid::parse_str(&profile_id.unwrap()) {
                Ok(uuid) => uuid,
                Err(e) => {
                    error!("Failed to parse profile UUID: {}", e);
                    return Err(
                        AppError::Other(format!("Failed to parse profile UUID: {}", e)).into(),
                    );
                }
            };

            // Get profile path
            let profile_path = profile_manager
                .get_profile_instance_path(profile_uuid)
                .await?;
            let full_path = profile_path.join(path);

            debug!("Resolved profile-relative path to: {:?}", full_path);
            if !full_path.exists() {
                error!("Image file does not exist: {:?}", full_path);
                return Err(
                    AppError::Other(format!("Image file does not exist: {:?}", full_path)).into(),
                );
            }

            Ok(full_path.to_string_lossy().to_string())
        }

        // AbsolutePath: Already a complete path, just convert to URL
        ImageSource::AbsolutePath { path } => {
            let path_buf = PathBuf::from(path);

            debug!("Using absolute path: {:?}", path_buf);
            if !path_buf.exists() {
                error!("Image file does not exist: {:?}", path_buf);
                return Err(
                    AppError::Other(format!("Image file does not exist: {:?}", path_buf)).into(),
                );
            }

            Ok(path_buf.to_string_lossy().to_string())
        }
    }
}

/// Uploads an image as a profile icon, copying it to a standard location within the profile's directory.
/// Returns the relative path to the icon within the profile directory.
#[command]
pub async fn upload_profile_icon(
    payload: UploadProfileIconPayload,
) -> Result<String> {
    debug!("Uploading profile icon with payload: {:?}", payload);

    let state = State::get().await?;

    let profile_uuid = payload.profile_id;

    let profile_manager = &state.profile_manager;
    let profile_instance_path = profile_manager.get_profile_instance_path(profile_uuid).await?;
    
    let target_sub_dir_name = "NoRiskClientLauncher";
    let target_icon_filename = "icon.png";

    let target_dir = profile_instance_path.join(target_sub_dir_name);

    if !target_dir.exists() {
        info!("Target directory {:?} does not exist, creating.", target_dir);
        tokio::fs::create_dir_all(&target_dir).await.map_err(|e| {
            error!("Failed to create target directory {:?}: {}", target_dir, e);
            AppError::Io(e)
        })?;
    }

    if let Some(src_path_str) = payload.path {
        let src_path = PathBuf::from(src_path_str);
        if !src_path.exists() {
            error!("Source image path does not exist: {:?}", src_path);
            return Err(AppError::FileNotFound(src_path).into());
        }
        if !src_path.is_file() {
            error!("Source path is not a file: {:?}", src_path);
            return Err(AppError::InvalidInput(format!("Source path is not a file: {:?}", src_path)).into());
        }

        let target_file_path = target_dir.join(target_icon_filename);
        info!("Copying profile icon from {:?} to {:?}", src_path, target_file_path);

        tokio::fs::copy(&src_path, &target_file_path).await.map_err(|e| {
            error!("Failed to copy profile icon from {:?} to {:?}: {}", src_path, target_file_path, e);
            AppError::Io(e)
        })?;

        info!("Successfully copied profile icon to {:?}", target_file_path);
    } else {
        info!("No source path provided for profile icon upload for profile {}. Ensuring directory exists and profile will point to standard icon path.", payload.profile_id);
    }

    let relative_icon_path_str = PathBuf::from(target_sub_dir_name)
        .join(target_icon_filename)
        .to_string_lossy()
        .to_string();

    // Update the profile to use this new icon path
    let mut profile = profile_manager.get_profile(profile_uuid).await?;
    
    let new_icon_source = ImageSource::RelativeProfile { path: relative_icon_path_str.clone() };
    let new_banner = ProfileBanner { source: new_icon_source };
    profile.banner = Some(new_banner);

    profile_manager.update_profile(profile_uuid, profile).await?;
    info!("Successfully updated profile {} to use icon at relative path: {}", profile_uuid, relative_icon_path_str);

    Ok(relative_icon_path_str)
}
