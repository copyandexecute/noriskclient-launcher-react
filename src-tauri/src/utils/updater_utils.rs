use log::{error, info};
use tauri::{AppHandle, Manager, Result, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt; // Import the trait
use std::error::Error;

const GITHUB_USER: &str = "<YOUR_GITHUB_USER>"; // <-- TODO: Ersetze dies!
const GITHUB_REPO: &str = "<YOUR_GITHUB_REPO>"; // <-- TODO: Ersetze dies!

/// Creates and configures the dedicated updater window.
///
/// # Arguments
///
/// * `app_handle` - The Tauri AppHandle.
///
/// # Returns
///
/// * `Result<WebviewWindow>` - The created Tauri webview window instance or an error.
pub async fn create_updater_window(app_handle: &AppHandle) -> Result<WebviewWindow> {
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
async fn handle_update(update: tauri_plugin_updater::Update, app_handle: AppHandle) {
    info!("Attempting to automatically download and install update...");
    
    match update
        .download_and_install(
            |chunk_length, content_length| {
                if let Some(total) = content_length {
                    info!("Downloading update: {} / {} bytes", chunk_length, total);
                } else {
                    info!("Downloading update: {} bytes (total size unknown)", chunk_length);
                }
            },
            || {
                info!("Download complete. Starting installation process...");
            },
        )
        .await
    {
        Ok(_) => {
            info!("Update download/install process finished successfully.");
            #[cfg(not(target_os = "windows"))]
            {
                info!("Attempting to restart the application (non-Windows)...");
                app_handle.restart();
            }
        }
        Err(e) => {
            error!("Failed to download or install update: {}", e);
        }
    }
}

/// Prüft auf Anwendungsupdates für den spezifizierten Kanal.
///
/// # Arguments
///
/// * `app_handle` - The Tauri AppHandle.
/// * `is_beta_channel` - `true` to check the beta channel, `false` for stable.
pub async fn check_for_updates(app_handle: AppHandle, is_beta_channel: bool) {
    let current_version = app_handle.package_info().version.to_string();
    let channel = if is_beta_channel { "Beta" } else { "Stable" };
    
    info!(
        "Checking for updates (Current: {}). Channel: {}",
        current_version, channel
    );

    // Update URL based on channel
    let update_url_str = if is_beta_channel {
        // Beta Channel URL
        "https://api-staging.norisk.gg/api/v1/launcher/releases/{{target}}/{{current_version}}"
            .to_string()
    } else {
        // Stable Channel URL
        "https://api.norisk.gg/api/v1/launcher/releases/{{target}}/{{current_version}}"
            .to_string()
    };

    info!("Using update endpoint: {}", update_url_str);

    // Parse URL
    let update_url = match update_url_str.parse() {
        Ok(url) => url,
        Err(e) => {
            error!("Failed to parse update URL '{}': {}", update_url_str, e);
            return;
        }
    };

    // Configure updater builder
    let builder = match app_handle.updater_builder().endpoints(vec![update_url]) {
        Ok(builder) => builder,
        Err(e) => {
            error!("Failed to set updater endpoints: {}", e);
            return;
        }
    };

    // Build updater
    let updater = match builder.build() {
        Ok(updater) => updater,
        Err(e) => {
            error!("Failed to build updater: {}", e);
            return;
        }
    };

    info!("Updater built successfully. Spawning check task...");

    // Clone handle for the task
    let app_handle_clone = app_handle.clone();
    
    // Spawn background task for update check
    tokio::spawn(async move {
        match updater.check().await {
            Ok(Some(update)) => {
                info!(
                    "Update available: Version {}, Released: {:?}, Body:\n{}",
                    update.version,
                    update.date,
                    update.body.as_deref().unwrap_or_default()
                );
                
                // Handle update in separate function
                handle_update(update, app_handle_clone).await;
            }
            Ok(None) => {
                info!("No update available for the {} channel.", channel);
            }
            Err(e) => {
                error!("Error during update check for {} channel: {}", channel, e);
            }
        }
    });
}