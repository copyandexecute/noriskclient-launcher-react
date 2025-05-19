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
use log::{debug, error, info};
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
    update_shaderpack_from_modrinth, batch_check_content_installed,
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
use commands::config_commands::{get_app_version, get_launcher_config, set_launcher_config};

// Import path commands
use commands::path_commands::{get_launcher_directory, resolve_image_path};

// Import cape commands
use commands::cape_command::{
    browse_capes, delete_cape, download_template_and_open_explorer, equip_cape, get_player_capes,
    unequip_cape, upload_cape,
};

use tauri::Manager;

#[tokio::main]
async fn main() {
    if let Err(e) = logging::setup_logging().await {
        eprintln!("FEHLER: Logging konnte nicht initialisiert werden: {}", e);
    }

    info!("Starting NoRiskClient Launcher...");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        //TODO .plugin(minecraft_auth_command::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Handle for the main application logic / window management
            let app_handle = app.handle().clone();

            // Task for State Init and Updater Window
            tauri::async_runtime::spawn(async move {
                // --- Create Updater Window (but keep hidden initially) ---
                let updater_window = match updater_utils::create_updater_window(&app_handle).await {
                    Ok(win) => {
                        info!("Updater window created successfully (initially hidden).");
                        Some(win)
                    }
                    Err(e) => {
                        error!("Failed to create updater window: {}", e);
                        None
                    }
                };

                // --- State Initialization --- 
                info!("Initiating state initialization...");
                // Lade Dummy-Versionen/Packs (Beispielhaft, existierendem Code nachempfunden)
                //let _ = norisk_versions::load_dummy_versions().await;
                //let _ = norisk_packs::load_dummy_modpacks().await;
                //crate::utils::debug_utils::debug_print_news_and_changelogs().await;

                if let Err(e) = state::state_manager::State::init(Arc::new(app_handle.clone())).await {
                    error!("CRITICAL: Failed to initialize state: {}. Update check and main window might not proceed correctly.", e);
                    // Optionally close updater window if state init fails and it exists
                    if let Some(win) = updater_window {
                        // Attempt to close gracefully via event first, then force close if needed
                        updater_utils::emit_status(&app_handle, "close", "Closing due to state init error.".to_string(), None);
                        // Allow frontend a moment to process the close event
                        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                        if let Err(close_err) = win.close() {
                            error!("Failed to close updater window after state init error: {}", close_err);
                        }
                    }
                    return; // Exit task if state fails
                }
                info!("State initialization finished successfully.");

                // --- Run Update Check (Await its completion) ---
                // The updater window handle (if created) is passed to check_for_updates,
                // which will decide whether to show it.
                info!("Attempting to retrieve launcher configuration for update check...");
                match state::state_manager::State::get().await {
                    Ok(state) => {
                        let config = state.config_manager.get_config().await;
                        let check_beta_channel = config.check_beta_channel;
                        info!("Initiating application update check (Channel determined by config: Beta={})...", check_beta_channel);
                        
                        // Await the update check process, passing the window handle
                        updater_utils::check_for_updates(app_handle.clone(), check_beta_channel, updater_window.clone()).await; // Pass updater_window clone
                        
                        info!("Update check process has finished.");
                        // Update check finished, the updater window (if shown) should have received the 'close' event
                        // Now we can show the main window.

                    }
                    Err(e) => {
                        error!("Failed to get global state for update check: {}.", e);
                        // Ensure updater window is closed even if state fetch failed after init
                        if let Some(win) = updater_window { // Use the original handle here
                            updater_utils::emit_status(&app_handle, "close", "Closing due to state fetch error.".to_string(), None);
                            // Allow frontend a moment
                            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                            if let Err(close_err) = win.close() {
                                error!("Failed to close updater window after state fetch error: {}", close_err);
                            }
                        }
                    }
                }

                // --- Updater window should be closed now via event, show main window --- 
                info!("Updater process finished. Attempting to show main window...");
                if let Some(main_window) = app_handle.get_webview_window("main") { // Use get_webview_window
                    if let Err(e) = main_window.show() {
                        error!("Failed to show main window: {}", e);
                    } else {
                        info!("Main window shown successfully.");
                        // Optionally focus the main window
                        if let Err(e) = main_window.set_focus() {
                            error!("Failed to focus main window: {}", e);
                        }
                    }
                } else {
                    error!("Could not get main window handle to show it after update check!");
                }

                // --- Other Async Steps (can run after main window is shown) ---
                //debug_utils::debug_print_all_profile_worlds().await;
                //debug_utils::debug_print_all_profile_servers().await;
                //let ping_info = utils::mc_utils::ping_server_status("gommehd.net").await;
                //info!("Ping info: {:?}", ping_info);
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
            batch_check_content_installed,
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
            get_app_version,
            //
            commands::nrc_commands::get_news_and_changelogs_command,
            commands::modrinth_commands::get_modrinth_categories_command,
            commands::modrinth_commands::get_modrinth_loaders_command,
            commands::modrinth_commands::get_modrinth_game_versions_command,
            commands::modrinth_commands::get_modrinth_versions_by_hashes,
            commands::content_command::uninstall_content_from_profile,
            commands::content_command::toggle_content_from_profile,
            commands::content_command::install_content_to_profile,
            commands::minecraft_command::get_profile_by_name_or_uuid,
            commands::minecraft_command::add_skin_locally,
            commands::cape_command::download_template_and_open_explorer,
            commands::profile_command::get_all_profiles_and_last_played,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
