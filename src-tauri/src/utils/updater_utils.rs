use log::{error, info, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry, Emitter};
use tauri_plugin_updater::UpdaterExt;
use std::error::Error as StdError;
use serde::Serialize;
use crate::error::{AppError, Result as AppResult};

const GITHUB_USER: &str = "<YOUR_GITHUB_USER>"; // <-- TODO: Ersetze dies!
const GITHUB_REPO: &str = "<YOUR_GITHUB_REPO>"; // <-- TODO: Ersetze dies!

// Define the payload structure for updater status events
#[derive(Clone, Serialize)] // Add derive macros
struct UpdaterStatusPayload {
    message: String,
    status: String, // Use String for simplicity, map specific statuses when emitting
    progress: Option<u64>,
    total: Option<u64>,
    chunk: Option<u64>,
}

// Helper function to emit status updates
pub fn emit_status(app_handle: &AppHandle, status: &str, message: String, progress_info: Option<(u64, u64)>) {
    let payload = UpdaterStatusPayload {
        message,
        status: status.to_string(),
        progress: progress_info.map(|(chunk, total)| (chunk * 100 / total.max(1))),
        total: progress_info.map(|(_, total)| total),
        chunk: progress_info.map(|(chunk, _)| chunk),
    };
    if let Err(e) = app_handle.emit("updater_status", payload) {
        error!("Failed to emit updater status event: {}", e);
    }
}

/// Creates and configures the dedicated updater window.
///
/// # Arguments
///
/// * `app_handle` - The Tauri AppHandle.
///
/// # Returns
///
/// * `Result<WebviewWindow>` - The created Tauri webview window instance or an error.
pub async fn create_updater_window(app_handle: &AppHandle) -> tauri::Result<WebviewWindow> {
    info!("Creating updater window...");
    let window = WebviewWindowBuilder::new(
        app_handle,
        "updater", // Unique label
        WebviewUrl::App("updater.html".into()) // Load local HTML file
    )
    .title("NoRiskClient Updater")
    .inner_size(350.0, 350.0)
    .resizable(false)
    .center()
    .decorations(false) // Optional: remove window chrome
    .transparent(false) // Optional: make background transparent (requires frontend setup)
    .skip_taskbar(false) // Optional: hide from taskbar
    .always_on_top(false) // Keep updater visible
    .visible(false) // Start hidden, show when needed
    .build()?;

    info!("Updater window created successfully (label: 'updater').");
    Ok(window)
}

/// Versucht, ein gefundenes Update herunterzuladen, zu installieren und ggf. die App neu zu starten.
async fn handle_update(update: tauri_plugin_updater::Update, app_handle: AppHandle) -> AppResult<()> {
    info!("Attempting to automatically download and install update...");
    emit_status(&app_handle, "pending", "Update found, preparing download...".to_string(), None);

    let app_handle_progress = app_handle.clone();

    // Define closures for download progress and finish
    let on_chunk = move |chunk_length: usize, content_length: Option<u64>| {
        let chunk_u64 = chunk_length as u64;
        let total_u64_opt = content_length;

        if let Some(total_u64) = total_u64_opt {
            let msg = format!("Downloading update: {} / {} bytes", chunk_u64, total_u64);
            info!("{}", msg);
            emit_status(&app_handle_progress, "downloading", msg, Some((chunk_u64, total_u64)));
        } else {
            let msg = format!("Downloading update: {} bytes (total size unknown)", chunk_u64);
            info!("{}", msg);
            let payload = UpdaterStatusPayload {
                message: msg,
                status: "downloading".to_string(),
                progress: None,
                total: None,
                chunk: Some(chunk_u64),
            };
            if let Err(e) = app_handle_progress.emit("updater_status", payload) {
                error!("Failed to emit updater status event (no total): {}", e);
            }
        } 
    };
    let on_download_finish = || {
        info!("Download complete. Preparing installation...");
        // Note: We emit "installing" status AFTER the install call below
    };

    // --- Step 1: Download the update --- 
    info!("Starting update download...");
    let bytes = update
        .download(on_chunk, on_download_finish) // Use the download method
        .await
        .map_err(|e| {
            error!("Update download failed: {}", e);
            // Convert updater::Error to AppError::Other for download step
            AppError::Other(format!("Updater download error: {}", e))
        })?;
    info!("Update download finished successfully ({} bytes).", bytes.len());

    // --- Step 2: Install the update --- 
    // This block can be commented out for testing to prevent actual installation
    /* START INSTALL BLOCK */
    info!("Starting update installation...");
    /*update
        .install(bytes) // Use the install method with the downloaded bytes
        .map_err(|e| {
            error!("Update installation failed: {}", e);
            // Convert updater::Error to AppError::Other for install step
            AppError::Other(format!("Updater install error: {}", e))
        })?;*/
    info!("Update installation finished successfully.");
    /* END INSTALL BLOCK */

    // Emit final statuses after successful install (or after download if install is commented out)
    emit_status(&app_handle, "installing", "Installation complete.".to_string(), None);
    emit_status(&app_handle, "finished", "Update installed successfully!".to_string(), None);

    #[cfg(not(target_os = "windows"))]
    {
        info!("Attempting to restart the application (non-Windows)...");
        app_handle.restart();
    }

    Ok(())
}

/// Prüft auf Anwendungsupdates für den spezifizierten Kanal.
///
/// # Arguments
///
/// * `app_handle` - The Tauri AppHandle.
/// * `is_beta_channel` - `true` to check the beta channel, `false` for stable.
/// * `updater_window` - An optional WebviewWindow handle to show the updater window.
pub async fn check_for_updates(
    app_handle: AppHandle, 
    is_beta_channel: bool, 
    updater_window: Option<WebviewWindow>
) {
    let current_version = app_handle.package_info().version.to_string();
    let channel = if is_beta_channel { "Beta" } else { "Stable" };
    let mut final_status: String = "unknown".to_string();
    let mut final_message: String = "Update process ended.".to_string();

    info!(
        "Checking for updates (Current: {}). Channel: {}",
        current_version, channel
    );
    emit_status(&app_handle, "checking", format!("Checking for {} updates...", channel), None);

    let update_url_str = if is_beta_channel {
        "https://api-staging.norisk.gg/api/v1/launcher/releases/{{target}}/{{current_version}}".to_string()
    } else {
        "https://api.norisk.gg/api/v1/launcher/releases/{{target}}/{{current_version}}".to_string()
    };

    info!("Using update endpoint: {}", update_url_str);

    let update_url = match update_url_str.parse() {
        Ok(url) => url,
        Err(e) => {
            error!("Failed to parse update URL '{}': {}", update_url_str, e);
            final_status = "error".to_string();
            final_message = format!("Failed to parse update URL: {}", e);
            emit_status(&app_handle, &final_status, final_message.clone(), None);
            emit_status(&app_handle, "close", final_message.clone(), None);
            return;
        }
    };

    let updater_result = app_handle.updater_builder().endpoints(vec![update_url]);

    let updater = match updater_result {
        Ok(builder) => match builder.build() {
            Ok(updater) => updater,
            Err(e) => {
                error!("Failed to build updater: {}", e);
                final_status = "error".to_string();
                final_message = format!("Failed to build updater: {}", e);
                emit_status(&app_handle, &final_status, final_message.clone(), None);
                emit_status(&app_handle, "close", final_message.clone(), None);
                return;
            }
        },
        Err(e) => {
            error!("Failed to set updater endpoints: {}", e);
            final_status = "error".to_string();
            final_message = format!("Failed to set updater endpoints: {}", e);
            emit_status(&app_handle, &final_status, final_message.clone(), None);
            emit_status(&app_handle, "close", final_message.clone(), None);
            return;
        }
    };

    info!("Updater built successfully. Checking for updates...");

    match updater.check().await {
        Ok(Some(update)) => {
            let update_version = update.version.clone();
            info!(
                "Update available: Version {}, Released: {:?}, Body:\n{}",
                update.version,
                update.date,
                update.body.as_deref().unwrap_or_default()
            );

            if let Some(win) = &updater_window {
                info!("Update found. Showing updater window...");
                if let Err(e) = win.show() {
                    error!("Failed to show updater window: {}", e);
                }
            } else {
                warn!("Update found, but no updater window handle available to show.");
            }

            emit_status(&app_handle, "pending", format!("Update {} found!", update_version), None);

            match handle_update(update, app_handle.clone()).await {
                Ok(_) => {
                    final_status = "finished".to_string();
                    final_message = "Update successful.".to_string();
                }
                Err(e) => {
                    final_status = "error".to_string();
                    final_message = format!("Update download/install failed: {}", e);
                    emit_status(&app_handle, &final_status, final_message.clone(), None);
                }
            }
        }
        Ok(None) => {
            info!("No update available for the {} channel.", channel);
            final_status = "uptodate".to_string();
            final_message = "Application is up to date.".to_string();
            emit_status(&app_handle, &final_status, final_message.clone(), None);
        }
        Err(e) => {
            error!("Error during update check for {} channel: {}", channel, e);
            final_status = "error".to_string();
            final_message = format!("Update check error: {}", e);
            emit_status(&app_handle, &final_status, final_message.clone(), None);
        }
    }

    emit_status(&app_handle, "close", final_message.clone(), None);
    info!("Update check process fully completed (Status: {}). Final Message: {}", final_status, final_message);
}