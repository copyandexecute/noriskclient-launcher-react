use crate::state::state_manager::State;
use crate::utils::mc_utils;
use log::{error, info};

/// Debug function to list all worlds for all user profiles.
/// This should only be called temporarily during development.
pub async fn debug_print_all_profile_worlds() {
    info!("--- [DEBUG] Starting World Check --- KAPPA");
    match State::get().await {
        Ok(state) => {
            match state.profile_manager.list_profiles().await {
                Ok(profiles) => {
                    if profiles.is_empty() {
                        info!("--- [DEBUG] No profiles found.");
                    } else {
                        info!("--- [DEBUG] Checking worlds for {} profile(s)...", profiles.len());
                        for profile in profiles {
                            // Überspringe Standard-Profile für diese Dateisystem-Prüfung
                            if profile.is_standard_version {
                                info!("--- [DEBUG] Skipping standard profile: {} ({})", profile.name, profile.id);
                                continue;
                            }

                            info!("--- [DEBUG] Checking Profile: {} ({}) ---", profile.name, profile.id);
                            match mc_utils::get_profile_worlds(profile.id).await {
                                Ok(worlds) => {
                                    if worlds.is_empty() {
                                        info!("    No valid worlds found in saves directory.");
                                    } else {
                                        info!("    Found Worlds:");
                                        for world in worlds {
                                            // Konvertiere Timestamp zu lesbarem Datum (optional, benötigt chrono crate)
                                            let last_played_str = world.last_played
                                                .map(|ts| {
                                                    chrono::DateTime::from_timestamp_millis(ts)
                                                        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                                                        .unwrap_or_else(|| "Invalid Timestamp".to_string())
                                                })
                                                .unwrap_or_else(|| "N/A".to_string());

                                            info!("      - Folder: {}", world.folder_name);
                                            info!("        Display Name: {}", world.display_name.as_deref().unwrap_or("N/A"));
                                            info!("        Last Played: {} ({:?})", last_played_str, world.last_played);
                                            info!("        Icon Path: {:?}", world.icon_path);
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("    Error getting worlds for profile {}: {}", profile.id, e);
                                }
                            }
                        }
                        info!("--- [DEBUG] Finished World Check --- KAPPA");
                    }
                }
                Err(e) => {
                    error!("--- [DEBUG] Error listing profiles: {}", e);
                }
            }
        }
        Err(e) => {
            error!("--- [DEBUG] Error getting state for world check: {}", e);
        }
    }
} 