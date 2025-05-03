// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod config;
mod error;
pub mod integrations;
mod logging;
mod minecraft;
mod state;
mod utils;
use crate::integrations::norisk_packs;
use crate::integrations::norisk_versions;
use log::{debug, error, info, warn};
use rand::seq::SliceRandom;
use std::sync::Arc;
use tauri::Listener;
use utils::debug_utils;
use utils::updater_utils;

use crate::commands::process_command::{
    get_full_log, get_process, get_processes, get_processes_by_profile, open_log_window,
    set_discord_state, stop_process,
};
use commands::minecraft_auth_command::{
    begin_login, get_accounts, get_active_account, remove_account, set_active_account,
};
use commands::minecraft_command::{
    add_skin,
    apply_skin_from_base64,
    // Local skin database commands
    get_all_skins,
    get_fabric_loader_versions,
    get_forge_versions,
    get_minecraft_versions,
    get_neoforge_versions,
    get_quilt_loader_versions,
    get_skin_by_id,
    // Skin management commands
    get_user_skin_data,
    ping_minecraft_server,
    remove_skin,
    reset_skin,
    update_skin_properties,
    upload_log_to_mclogs_command,
    upload_skin,
};
use commands::profile_command::{
    abort_profile_launch, add_modrinth_content_to_profile, add_modrinth_mod_to_profile,
    check_world_lock_status, copy_profile, copy_world, create_profile, delete_custom_mod,
    delete_mod_from_profile, delete_profile, delete_world, export_profile, get_custom_mods,
    get_local_datapacks, get_local_resourcepacks, get_local_shaderpacks, get_log_file_content,
    get_norisk_packs, get_norisk_packs_resolved, get_profile, get_profile_directory_structure,
    get_profile_latest_log_content, get_profile_log_files, get_servers_for_profile,
    get_standard_profiles, get_system_ram_mb, get_worlds_for_profile, import_local_mods,
    import_profile_from_file, is_content_installed, is_profile_launching, launch_profile,
    list_profile_screenshots, list_profiles, open_profile_folder, open_profile_latest_log,
    refresh_norisk_packs, refresh_standard_versions, search_profiles, set_custom_mod_enabled,
    set_norisk_mod_status, set_profile_mod_enabled, update_datapack_from_modrinth,
    update_modrinth_mod_version, update_profile, update_resourcepack_from_modrinth,
    update_shaderpack_from_modrinth,
};

// Use statements for registered commands only
use commands::modrinth_commands::{
    check_modrinth_updates, download_and_install_modrinth_modpack,
    get_all_modrinth_versions_for_contexts, get_modrinth_mod_versions,
    get_modrinth_project_details, search_modrinth_mods, search_modrinth_projects,
}; // Remove or comment out if not needed

use commands::file_command::{
    delete_file, get_icons_for_archives, get_icons_for_norisk_mods, open_file, open_file_directory,
    read_file_bytes, set_file_enabled,
};

// Import config commands
use commands::config_commands::{get_launcher_config, set_launcher_config, get_app_version};

// Import path commands
use commands::path_commands::{get_launcher_directory, resolve_image_path};

// Import cape commands
use commands::cape_command::{
    browse_capes, delete_cape, equip_cape, get_player_capes, unequip_cape, upload_cape,
};

use tauri::Manager;

#[tokio::main]
async fn main() {
    if let Err(e) = logging::setup_logging().await {
        eprintln!("FEHLER: Logging konnte nicht initialisiert werden: {}", e);
    }

    /*info!("--- Running Test Modrinth Search --- DONT FORGET TO REMOVE");
    let query = "fabric".to_string();
    let game_version_filter = Some("1.20.1".to_string());
    let loader_filter = Some("fabric".to_string());
    let limit = Some(25u32);

    match integrations::modrinth::search_mods(
        query.clone(),
        game_version_filter.clone(),
        loader_filter.clone(),
        limit,
    )
    .await
    {
        Ok(results) => {
            info!(
                "Modrinth search successful! Found {} results.",
                results.len()
            );

            if !results.is_empty() {
                let mut rng = rand::thread_rng();
                if let Some(random_hit) = results.choose(&mut rng) {
                    info!(
                        "--- Getting versions for randomly chosen hit: '{}' (ID: {}) ---",
                        random_hit.title, random_hit.project_id
                    );

                    match integrations::modrinth::get_mod_versions(
                        random_hit.project_id.clone(),
                        loader_filter.clone().map(|l| vec![l]),
                        game_version_filter.clone().map(|gv| vec![gv]),
                    )
                    .await
                    {
                        Ok(versions) => {
                            info!(
                                "Found {} versions for '{}' matching filters:",
                                versions.len(),
                                random_hit.title
                            );
                            for (i, version) in versions.iter().take(10).enumerate() {
                                let primary_file = version
                                    .files
                                    .iter()
                                    .find(|f| f.primary)
                                    .map(|f| f.filename.as_str())
                                    .unwrap_or("N/A");
                                info!(
                                    "  Version {}: Name='{}', Number='{}', Type={:?}, File='{}'",
                                    i + 1,
                                    version.name,
                                    version.version_number,
                                    version.version_type,
                                    primary_file
                                );
                            }
                            if versions.len() > 10 {
                                info!("  ... and {} more versions not shown.", versions.len() - 10);
                            }
                        }
                        Err(e) => {
                            error!("Failed to get versions for '{}': {:?}", random_hit.title, e);
                        }
                    }
                } else {
                    error!("Could not choose a random element, although search hits were found.");
                }
            } else {
                info!("No mods found matching the search criteria.");
            }
        }
        Err(e) => {
            error!("Modrinth search failed: {:?}", e);
        }
    }
    info!("--- Finished Test Modrinth Search --- DONT FORGET TO REMOVE");*/

    match integrations::modrinth::get_multiple_projects(vec![
        "AANobbMI".to_string(),
        "P7dR8mSH".to_string(),
    ])
    .await
    {
        Ok(projects) => {
            info!("Found {} projects.", projects.len());
            for project in projects {
                info!("Project: {}", project.title);
            }
        }
        Err(e) => {
            error!("Failed to get projects: {:?}", e);
        }
    }

    match commands::java_command::detect_java_installations_command().await {
        Ok(installations) => {
            info!("Detected {} Java installation(s):", installations.len());
            for (index, installation) in installations.iter().enumerate() {
                info!(
                    "  {}: Path='{}', Version='{}', Major={}, 64bit={}, Vendor='{}', Source='{}'",
                    index + 1,
                    installation.path.display(),
                    installation.version,
                    installation.major_version,
                    installation.is_64bit,
                    installation.vendor,
                    installation.source
                );
            }
        }
        Err(e) => {
            error!("Failed to get Java installations: {:?}", e); // Log the error detail
        }
    };

    info!("Starting NoRiskClient Launcher...");

    utils::file_utils::get_jar_icon_test().await;

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        //TODO .plugin(minecraft_auth_command::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Handle für Updater Check
            let app_handle_for_updater = app.handle().clone();

            // Task für State Init und anschließenden Update Check
            let app_handle_for_state = Arc::new(app.handle().clone());
            tauri::async_runtime::spawn(async move {
                // --- Create Updater Window (but don't show yet) ---
                // Clone handle for window creation
                let window_handle = app_handle_for_state.app_handle();
                let updater_window = match updater_utils::create_updater_window(&window_handle).await {
                    Ok(win) => {
                        info!("Updater window created successfully in setup.");
                        Some(win)
                    }
                    Err(e) => {
                        error!("Failed to create updater window in setup: {}", e);
                        None
                    }
                };

                // --- State Initialization --- 
                info!("Initiating state initialization...");
                // Lade Dummy-Versionen/Packs (Beispielhaft, existierendem Code nachempfunden)
                let _ = norisk_versions::load_dummy_versions().await;
                let _ = norisk_packs::load_dummy_modpacks().await;

                if let Err(e) = state::state_manager::State::init(app_handle_for_state).await {
                    error!("CRITICAL: Failed to initialize state: {}. Update check will be skipped.", e);
                    return; // Frühzeitiger Ausstieg, da Config benötigt wird
                }
                info!("State initialization finished successfully.");

                // --- Show Updater Window and Start Update Check ---
                if let Some(win) = updater_window {
                    info!("Showing updater window...");
                    if let Err(e) = win.show() {
                        error!("Failed to show updater window: {}", e);
                    } else {
                        // --- Update Check (Nach State Init und Fensteranzeige) ---
                        info!("Attempting to retrieve launcher configuration for update check...");
                        match state::state_manager::State::get().await { // State holen
                            Ok(state) => {
                                let config = state.config_manager.get_config().await;
                                let check_beta_channel = config.check_beta_channel;
                                info!("Initiating application update check (Channel determined by config: Beta={})...", check_beta_channel);
                                // Pass the AppHandle for event emission
                                utils::updater_utils::check_for_updates(app_handle_for_updater, check_beta_channel).await;
                                info!("Update check process initiated.");
                            }
                            Err(e) => {
                                error!("Failed to get global state after initialization: {}. Update check skipped.", e);
                                // Optionally close the updater window if state fails
                                if let Err(close_err) = win.close() {
                                     error!("Failed to close updater window after state error: {}", close_err);
                                }
                            }
                        }
                    }
                } else {
                    warn!("Updater window could not be created, skipping update check visibility.");
                    // Fallback: Run update check without visible window (original behavior)
                    info!("Attempting fallback update check without window...");
                     match state::state_manager::State::get().await { // State holen
                        Ok(state) => {
                            let config = state.config_manager.get_config().await;
                            let check_beta_channel = config.check_beta_channel;
                            info!("Initiating application update check (Channel determined by config: Beta={})...", check_beta_channel);
                            utils::updater_utils::check_for_updates(app_handle_for_updater, check_beta_channel).await;
                            info!("Update check process finished or running in background (fallback).");
                        }
                        Err(e) => {
                             error!("Failed to get global state after initialization: {}. Update check skipped (fallback).", e);
                        }
                    }
                }

                // --- Weitere asynchrone Setup-Schritte (Beispielhaft) ---
                // These can run concurrently or after the update check is initiated
                debug_utils::debug_print_all_profile_worlds().await;
                debug_utils::debug_print_all_profile_servers().await;
                let ping_info = utils::mc_utils::ping_server_status("gommehd.net").await;
                info!("Ping info: {:?}", ping_info);
            });

            // --- Register Focus Event Listener for Discord RPC --- 
            if let Some(main_window) = app.get_webview_window("main") { // Use get_webview_window
                main_window.listen("tauri://focus", move |_event| {
                    tokio::spawn(async move {
                        debug!("Main window focus event received. Triggering DiscordManager handler.");
                        // Get the global state using the static getter and call the handler
                        match state::state_manager::State::get().await {
                            Ok(state) => {
                                if let Err(e) = state.discord_manager.handle_focus_event().await {
                                     error!("Error during DiscordManager focus handling: {}", e);
                                }
                            }
                            Err(e) => {
                                error!("Focus event listener: Failed to get global state using State::get(): {}", e);
                            }
                        }
                    });
                });
            } else {
                error!("Could not get main window handle to attach focus listener!");
            }
            // --- End Focus Event Listener ---

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_profile,
            get_profile,
            update_profile,
            delete_profile,
            list_profiles,
            search_profiles,
            get_minecraft_versions,
            launch_profile,
            abort_profile_launch,
            is_profile_launching,
            get_processes,
            get_process,
            get_processes_by_profile,
            stop_process,
            open_log_window,
            begin_login,
            remove_account,
            get_active_account,
            set_active_account,
            get_accounts,
            search_modrinth_mods,
            search_modrinth_projects,
            get_modrinth_mod_versions,
            add_modrinth_mod_to_profile,
            add_modrinth_content_to_profile,
            get_modrinth_project_details,
            check_modrinth_updates,
            get_icons_for_archives,
            set_profile_mod_enabled,
            delete_mod_from_profile,
            get_norisk_packs,
            get_norisk_packs_resolved,
            set_norisk_mod_status,
            update_modrinth_mod_version,
            get_all_modrinth_versions_for_contexts,
            get_full_log,
            get_custom_mods,
            get_local_resourcepacks,
            get_local_shaderpacks,
            get_local_datapacks,
            set_custom_mod_enabled,
            import_local_mods,
            get_system_ram_mb,
            delete_custom_mod,
            open_profile_folder,
            import_profile_from_file,
            upload_log_to_mclogs_command,
            get_fabric_loader_versions,
            get_forge_versions,
            get_neoforge_versions,
            get_quilt_loader_versions,
            set_file_enabled,
            delete_file,
            get_icons_for_norisk_mods,
            open_file_directory,
            download_and_install_modrinth_modpack,
            get_standard_profiles,
            get_profile_directory_structure,
            copy_profile,
            export_profile,
            get_launcher_config,
            set_launcher_config,
            get_launcher_directory,
            resolve_image_path,
            // Resource and Shader pack updates
            update_resourcepack_from_modrinth,
            update_shaderpack_from_modrinth,
            update_datapack_from_modrinth,
            // Skin management commands
            get_user_skin_data,
            upload_skin,
            reset_skin,
            apply_skin_from_base64,
            // Local skin database commands
            get_all_skins,
            get_skin_by_id,
            add_skin,
            remove_skin,
            update_skin_properties,
            set_discord_state,
            // Cape commands
            browse_capes,
            get_player_capes,
            equip_cape,
            delete_cape,
            upload_cape,
            unequip_cape,
            refresh_norisk_packs,
            refresh_standard_versions,
            is_content_installed,
            open_profile_latest_log,
            get_profile_latest_log_content,
            // Java detection commands
            commands::java_command::detect_java_installations_command,
            commands::java_command::get_java_info_command,
            commands::java_command::find_best_java_for_minecraft_command,
            commands::java_command::invalidate_java_cache_command,
            commands::java_command::validate_java_path_command,
            get_worlds_for_profile,
            get_servers_for_profile,
            copy_world,
            check_world_lock_status,
            ping_minecraft_server,
            delete_world,
            get_profile_log_files,
            get_log_file_content,
            list_profile_screenshots,
            open_file,
            read_file_bytes,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
