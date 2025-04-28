use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use crate::minecraft::api::NoRiskApi;
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::minecraft::dto::norisk_meta::NoriskAssets;
use crate::minecraft::dto::piston_meta::AssetObject;
use crate::state::event_state::{EventPayload, EventType};
use crate::state::profile_state::Profile;
use crate::state::State;
use futures::stream::{iter, StreamExt};
use log::{debug, error, info, trace, warn};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

const ASSETS_DIR: &str = "assets";
const NORISK_ASSETS_DIR: &str = "noriskclient";
const DEFAULT_CONCURRENT_DOWNLOADS: usize = 12;

pub struct NoriskClientAssetsDownloadService {
    base_path: PathBuf,
    concurrent_downloads: usize,
}

impl NoriskClientAssetsDownloadService {
    pub fn new() -> Self {
        let base_path = LAUNCHER_DIRECTORY.meta_dir().join(ASSETS_DIR);
        info!(
            "[NRC Assets Service] Initialized. Base Path: {}",
            base_path.display()
        );
        Self {
            base_path,
            concurrent_downloads: DEFAULT_CONCURRENT_DOWNLOADS,
        }
    }

    /// Sets the number of concurrent downloads to use
    pub fn with_concurrent_downloads(mut self, concurrent_downloads: usize) -> Self {
        self.concurrent_downloads = concurrent_downloads;
        self
    }

    /// Downloads NoRisk client assets for a specific profile, processing the main pack
    /// and any additional asset groups defined in the pack configuration.
    pub async fn download_nrc_assets_for_profile(
        &self,
        profile: &Profile,
        credentials: Option<&Credentials>,
        is_experimental: bool,
    ) -> Result<()> {
        let state = State::get().await?;
        let game_directory = state
            .profile_manager
            .calculate_instance_path_for_profile(profile)?;

        let keep_local_assets = profile
            .norisk_information
            .as_ref()
            .map(|info| info.keep_local_assets)
            .unwrap_or(false);

        if keep_local_assets {
            info!("[NRC Assets Download] Keep local assets flag is enabled for this profile");
        }

        // Use profile's selected pack as the *main* pack ID
        let main_pack_id = match &profile.selected_norisk_pack_id {
            Some(pack_id) if !pack_id.is_empty() => {
                info!(
                    "[NRC Assets Download] Using main pack ID from profile: {}",
                    pack_id
                );
                pack_id.clone()
            }
            _ => {
                info!(
                    "[NRC Assets Download] No pack specified in profile, skipping asset download"
                );
                return Ok(());
            }
        };

        let creds = match credentials {
            Some(c) => c,
            None => {
                warn!("[NRC Assets Download] No credentials provided, skipping asset download");
                return Ok(());
            }
        };

        let token_ref = if is_experimental {
            info!("[NRC Assets Download] Using experimental token");
            &creds.norisk_credentials.experimental
        } else {
            info!("[NRC Assets Download] Using production token");
            &creds.norisk_credentials.production
        };

        let norisk_token = match token_ref {
            Some(token) => token.value.clone(),
            None => {
                warn!("[NRC Assets Download] No valid NoRisk token found for {} mode, skipping asset download",
                      if is_experimental { "experimental" } else { "production" });
                return Ok(());
            }
        };

        let request_uuid = creds.id.to_string();
        info!(
            "[NRC Assets Download] Using request UUID from credentials: {}",
            request_uuid
        );

        // --- Get Resolved Pack Definition ---
        info!("[NRC Assets Download] Getting Norisk packs config...");
        let norisk_packs_config = state.norisk_pack_manager.get_config().await; // Use ? to handle potential error

        info!(
            "[NRC Assets Download] Resolving pack definition for main pack: {}",
            main_pack_id
        );
        let resolved_pack_definition = norisk_packs_config
            .get_resolved_pack_definition(&main_pack_id)
            .map_err(|e| {
                error!(
                    "Failed to get resolved pack definition for '{}': {}",
                    main_pack_id, e
                );
                AppError::Other(format!(
                    "Failed to resolve pack definition {}: {}",
                    main_pack_id, e
                ))
            })?;

        // --- Collect All Asset Groups to Process ---
        let mut asset_ids_to_process = vec![]; // Start with the main pack ID
        asset_ids_to_process.extend(resolved_pack_definition.assets.iter().cloned()); // Add assets from the pack definition
        let unique_asset_ids: Vec<String> = {
            // Ensure uniqueness while preserving order somewhat
            let mut seen = std::collections::HashSet::new();
            asset_ids_to_process
                .into_iter()
                .filter(|id| seen.insert(id.clone()))
                .collect()
        };

        info!(
            "[NRC Assets Download] Identified asset groups to process: {:?}",
            unique_asset_ids
        );
        let total_groups = unique_asset_ids.len();

        // Emit initial overall event
        self.emit_progress_event(
            &state,
            profile.id,
            &format!(
                "Starting NoRiskClient asset processing for {} groups...",
                total_groups
            ),
            0.01, // Small initial progress
            None,
        )
        .await?;

        // --- Process Each Asset Group ---
        for (index, asset_id) in unique_asset_ids.iter().enumerate() {
            let group_progress_start = (index as f64 / total_groups as f64) * 0.95 + 0.01; // Scale progress from 1% to 96%
            let group_progress_end = ((index + 1) as f64 / total_groups as f64) * 0.95 + 0.01;

            info!(
                "--- Processing Asset Group {}/{} ('{}') ---",
                index + 1,
                total_groups,
                asset_id
            );

            match self
                .process_asset_group(
                    &state,
                    profile.id,
                    asset_id, // The ID of the group to process (can be main pack or an asset ID)
                    &norisk_token,
                    &request_uuid,
                    is_experimental,
                    keep_local_assets,
                    &game_directory,
                    group_progress_start,
                    group_progress_end,
                )
                .await
            {
                Ok(_) => {
                    info!(
                        "--- Successfully finished processing asset group '{}' ---",
                        asset_id
                    );
                }
                Err(e) => {
                    // Log the error from the helper, but continue to the next group
                    error!(
                        "--- Error processing asset group '{}': {}. Continuing... ---",
                        asset_id, e
                    );
                    // Optionally emit a specific error event for this group failure if needed
                    self.emit_progress_event(
                        &state,
                        profile.id,
                        &format!("Error processing asset group: {}", asset_id),
                        group_progress_end, // Mark end of this group's progress slot
                        Some(e.to_string()),
                    )
                    .await?;
                }
            }
        }

        // --- Final Progress Update ---
        info!("[NRC Assets Download] All asset groups processed.");
        self.emit_progress_event(
            &state,
            profile.id,
            "NoRiskClient assets processing completed!",
            1.0,
            None,
        )
        .await?;

        Ok(())
    }

    /// Processes a single asset group: Fetches metadata, downloads assets, copies to game dir.
    async fn process_asset_group(
        &self,
        state: &State,
        profile_id: Uuid,
        asset_id: &str, // ID of the group to process (e.g., "norisk-prod" or "shared-textures")
        norisk_token: &str,
        request_uuid: &str,
        is_experimental: bool,
        keep_local_assets: bool,
        game_directory: &PathBuf,
        progress_start: f64,
        progress_end: f64,
    ) -> Result<()> {
        let progress_range = progress_end - progress_start;

        // 1. Fetch assets for the current asset_id
        self.emit_progress_event(
            state,
            profile_id,
            &format!("Fetching assets for group: {}...", asset_id),
            progress_start + progress_range * 0.05, // 5% into this group's range
            None,
        )
        .await?;

        let assets =
            match NoRiskApi::norisk_assets(asset_id, norisk_token, request_uuid, is_experimental)
                .await
            {
                Ok(fetched_assets) => {
                    info!(
                        "[NRC Assets Group '{}'] Assets fetched successfully. Found {} objects.",
                        asset_id,
                        fetched_assets.objects.len()
                    );
                    if fetched_assets.objects.is_empty() {
                        warn!(
                            "[NRC Assets Group '{}'] No assets found. Skipping download/copy.",
                            asset_id
                        );
                        // Emit completion event for this empty group
                        self.emit_progress_event(
                            state,
                            profile_id,
                            &format!("No assets found for group: {}", asset_id),
                            progress_end,
                            None,
                        )
                        .await?;
                        return Ok(()); // Successfully processed (did nothing)
                    }
                    if let Some((key, obj)) = fetched_assets.objects.iter().next() {
                        debug!(
                            "[NRC Assets Group '{}'] Sample asset - Key: {}, Hash: {}, Size: {}",
                            asset_id, key, obj.hash, obj.size
                        );
                    }
                    fetched_assets
                }
                Err(e) => {
                    error!(
                        "[NRC Assets Group '{}'] Failed to fetch assets: {}. Skipping.",
                        asset_id, e
                    );
                    self.emit_progress_event(
                        state,
                        profile_id,
                        &format!("Failed to fetch assets for group: {}", asset_id),
                        progress_start + progress_range * 0.1,
                        Some(e.to_string()),
                    )
                    .await?;
                    // Return error to signal failure for this group
                    return Err(AppError::Download(format!(
                        "Failed to fetch assets for {}: {}",
                        asset_id, e
                    )));
                }
            };

        // 2. Download the assets for the current asset_id
        // Event emission for starting download (inside download_nrc_assets is more detailed)
        self.emit_progress_event(
            state,
            profile_id,
            &format!(
                "Downloading assets for group: {} ({} files)...",
                asset_id,
                assets.objects.len()
            ),
            progress_start + progress_range * 0.1, // 10% into this group's range
            None,
        )
        .await?;

        // Use asset_id for the subdirectory within NORISK_ASSETS_DIR
        match self
            .download_nrc_assets(
                asset_id,
                &assets,
                is_experimental,
                norisk_token,
                Some(profile_id),
            )
            .await
        {
            Ok(_) => info!(
                "[NRC Assets Group '{}'] Successfully downloaded assets.",
                asset_id
            ),
            Err(e) => {
                error!(
                    "[NRC Assets Group '{}'] Failed to download assets: {}. Skipping copy.",
                    asset_id, e
                );
                // Error event likely emitted by download_nrc_assets, but return error to main loop
                return Err(e);
            }
        }

        // 3. Copy assets to game directory for the current asset_id
        self.emit_progress_event(
            state,
            profile_id,
            &format!("Copying assets for group: {}...", asset_id),
            progress_start + progress_range * 0.9, // 90% into this group's range
            None,
        )
        .await?;

        // Use asset_id to find the correct source directory
        match self
            .copy_assets_to_game_dir(
                asset_id,
                &assets,
                keep_local_assets,
                game_directory.clone(),
                Some(profile_id),
            )
            .await
        {
            Ok(_) => info!(
                "[NRC Assets Group '{}'] Successfully copied assets.",
                asset_id
            ),
            Err(e) => {
                error!(
                    "[NRC Assets Group '{}'] Failed to copy assets: {}.",
                    asset_id, e
                );
                // Error event likely emitted by copy_assets_to_game_dir, but return error
                return Err(e);
            }
        }

        // Emit completion event for this group
        self.emit_progress_event(
            state,
            profile_id,
            &format!("Finished processing asset group: {}", asset_id),
            progress_end,
            None,
        )
        .await?;

        Ok(())
    }

    /// Downloads NoRisk client assets for a specific asset ID (pack or asset group).
    /// (Internal function called by process_asset_group)
    pub async fn download_nrc_assets(
        &self,
        asset_id: &str, // Use the specific asset_id for pathing
        assets: &NoriskAssets,
        is_experimental: bool,
        norisk_token: &str,
        profile_id: Option<Uuid>,
    ) -> Result<()> {
        trace!(
            "[NRC Assets Download '{}'] Starting download process",
            asset_id
        );

        // Use asset_id to create the specific subdirectory path
        let assets_path = self.base_path.join(NORISK_ASSETS_DIR).join(asset_id);
        if !fs::try_exists(&assets_path).await? {
            fs::create_dir_all(&assets_path).await?;
            info!(
                "[NRC Assets Download '{}'] Created directory: {}",
                asset_id,
                assets_path.display()
            );
        }

        let assets_list: Vec<(String, AssetObject)> = assets
            .objects
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();

        let mut downloads = Vec::new();
        let task_counter = Arc::new(AtomicUsize::new(1)); // Start counter at 1
        let total_assets = assets_list.len();
        let completed_counter = Arc::new(AtomicUsize::new(0));
        let total_to_download = Arc::new(AtomicUsize::new(0));

        trace!(
            "[NRC Assets Download '{}'] Preparing {} potential jobs...",
            asset_id,
            assets_list.len()
        );
        let mut job_count = 0;

        let state = if profile_id.is_some() {
            Some(State::get().await?)
        } else {
            None
        };

        for (name, asset) in assets_list {
            let hash = asset.hash.clone();
            let size = asset.size;
            // Target path includes the asset_id specific directory
            let target_path = assets_path.join(&name);
            let name_clone = name.clone(); // Clone name for the async block
            let task_counter_clone = Arc::clone(&task_counter);
            let completed_counter_clone = Arc::clone(&completed_counter);
            let total_to_download_clone = Arc::clone(&total_to_download);
            let asset_id_clone = asset_id.to_string(); // Clone asset_id for async block
            let norisk_token_clone = norisk_token.to_string();

            if fs::try_exists(&target_path).await? {
                if let Ok(metadata) = fs::metadata(&target_path).await {
                    if metadata.len() as i64 == size {
                        trace!(
                            "[NRC Assets Download '{}'] Skipping asset {} (already exists)",
                            asset_id_clone,
                            name_clone
                        );
                        continue; // Skip this asset
                    }
                    warn!("[NRC Assets Download '{}'] Asset {} size mismatch (expected {}, got {}), redownloading.",
                          asset_id_clone, name_clone, size, metadata.len());
                }
            }

            job_count += 1;
            total_to_download_clone.fetch_add(1, Ordering::SeqCst);
            downloads.push(async move {
                let task_id = task_counter_clone.fetch_add(1, Ordering::SeqCst);
                trace!("[NRC Assets Download '{}' Task {}] Starting download for: {}", asset_id_clone, task_id, name_clone);

                // URL now uses asset_id_clone dynamically
                let url = format!(
                    "{}/{}/assets/{}",
                    "https://cdn.norisk.gg/assets", asset_id_clone, name_clone
                );

                let mut request = HTTP_CLIENT.get(&url);
                request = request.header("Authorization", format!("Bearer {}", norisk_token_clone));

                let response = match request.send().await {
                    Ok(resp) => resp,
                    Err(e) => {
                        error!("[NRC Assets Download '{}' Task {}] Request error for {}: {}", asset_id_clone, task_id, name_clone, e);
                        return Err(AppError::Download(format!("Request failed for {}: {}", name_clone, e)));
                    }
                };

                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "No error details".to_string());
                    error!("[NRC Assets Download '{}' Task {}] Failed download for {}: Status {}, Error: {}",
                           asset_id_clone, task_id, name_clone, status, error_text);
                    return Err(AppError::Download(format!("Download failed for {} - Status {}: {}", name_clone, status, error_text)));
                }

                let bytes = match response.bytes().await {
                    Ok(b) => b,
                    Err(e) => {
                         error!("[NRC Assets Download '{}' Task {}] Error reading bytes for {}: {}", asset_id_clone, task_id, name_clone, e);
                         return Err(AppError::Download(format!("Read bytes failed for {}: {}", name_clone, e)));
                    }
                };

                if let Some(parent) = target_path.parent() {
                    if let Err(e) = fs::create_dir_all(parent).await {
                        error!("[NRC Assets Download '{}' Task {}] Error creating dir for {}: {}", asset_id_clone, task_id, name_clone, e);
                         return Err(AppError::Io(e));
                    }
                }

                let mut file = match fs::File::create(&target_path).await {
                    Ok(f) => f,
                    Err(e) => {
                        error!("[NRC Assets Download '{}' Task {}] Error creating file for {}: {}", asset_id_clone, task_id, name_clone, e);
                         return Err(AppError::Io(e));
                    }
                };

                if let Err(e) = file.write_all(&bytes).await {
                    error!("[NRC Assets Download '{}' Task {}] Error writing file for {}: {}", asset_id_clone, task_id, name_clone, e);
                     return Err(AppError::Io(e));
                }

                let completed = completed_counter_clone.fetch_add(1, Ordering::SeqCst) + 1;
                let total = total_to_download_clone.load(Ordering::SeqCst);

                info!("[NRC Assets Download '{}' Task {}] Finished download for: {} ({}/{})",
                      asset_id_clone, task_id, name_clone, completed, total);
                Ok(())
            });
        }

        info!(
            "[NRC Assets Download '{}'] Queued {} actual download tasks.",
            asset_id, job_count
        );

        if job_count == 0 {
            info!(
                "[NRC Assets Download '{}'] No new assets to download.",
                asset_id
            );
            if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
                // Use the specific asset_id in the message
                self.emit_progress_event(
                    state_ref,
                    profile_id_val,
                    &format!("Assets for group '{}' are up to date!", asset_id),
                    0.8,
                    None, // Adjust progress? Needs context from caller.
                )
                .await?;
            }
            return Ok(());
        }

        info!(
            "[NRC Assets Download '{}'] Processing tasks with {} concurrent downloads...",
            asset_id, self.concurrent_downloads
        );

        let total_downloads = job_count;
        let completed_ref = Arc::clone(&completed_counter);
        let asset_id_clone = asset_id.to_string(); // Clone for inspect closure
                                                   // Clone state before the closure so the original `state` remains available after the loop
        let state_clone_for_inspect = state.clone();

        let results: Vec<Result<()>> = iter(downloads)
            .buffer_unordered(self.concurrent_downloads)
            .inspect({ // Move asset_id_clone into the closure
                let asset_id_inspect = asset_id_clone.clone();
                move |_| {
                    // Use the cloned state inside the closure
                    if let (Some(state_ref), Some(profile_id_val)) = (&state_clone_for_inspect, profile_id) {
                        let completed = completed_ref.load(Ordering::SeqCst);
                        let total = total_to_download.load(Ordering::SeqCst);
                        if total > 0 {
                            // TODO: This progress calculation (0.1-0.8) needs to be scaled by the caller's progress range
                            let progress_within_download = 0.1 + (completed as f64 / total as f64) * 0.7; // Scale 0-1 -> 0.1-0.8

                            // Clone asset_id_inspect here before moving it into the async block
                            let asset_id_for_task = asset_id_inspect.clone();
                            tokio::spawn({
                                let state = state_ref.clone();
                                // Use the cloned value
                                let message = format!("Downloading '{}' assets: {}/{} files", asset_id_for_task, completed, total);
                                let profile_id = profile_id_val;

                                async move {
                                    let event_id = Uuid::new_v4();
                                    if let Err(e) = state.emit_event(EventPayload {
                                        event_id,
                                        event_type: EventType::DownloadingNoRiskClientAssets,
                                        target_id: Some(profile_id),
                                        message,
                                        progress: Some(progress_within_download), // Use scaled progress
                                        error: None,
                                    }).await {
                                         // Use the cloned value in the error log too
                                        error!("[NRC Assets Download '{}'] Failed to emit progress event: {}", asset_id_for_task, e);
                                    }
                                }
                            });
                        }
                    }
                }
            })
            .collect()
            .await;

        let mut errors = Vec::new();
        for result in results {
            if let Err(e) = result {
                errors.push(e);
            }
        }

        if !errors.is_empty() {
            error!(
                "[NRC Assets Download '{}'] Finished with {} errors:",
                asset_id,
                errors.len()
            );
            for error_item in &errors {
                error!("  - {}", error_item);
            }
            if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
                self.emit_progress_event(
                    state_ref,
                    profile_id_val,
                    &format!(
                        "Failed download for group '{}' ({} errors)",
                        asset_id,
                        errors.len()
                    ),
                    0.8,
                    Some(errors[0].to_string()), // Adjust progress?
                )
                .await?;
            }
            Err(errors.remove(0))
        } else {
            info!(
                "[NRC Assets Download '{}'] All asset downloads completed successfully.",
                asset_id
            );
            if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
                self.emit_progress_event(
                    state_ref,
                    profile_id_val,
                    &format!("Asset download completed for group '{}'", asset_id),
                    0.8,
                    None, // Adjust progress?
                )
                .await?;
            }
            Ok(())
        }
    }

    /// Helper method to emit progress events
    async fn emit_progress_event(
        &self,
        state: &State,
        profile_id: Uuid,
        message: &str,
        progress: f64,
        error: Option<String>,
    ) -> Result<Uuid> {
        let event_id = Uuid::new_v4();
        state
            .emit_event(EventPayload {
                event_id,
                event_type: EventType::DownloadingNoRiskClientAssets, // Consider a more general type?
                target_id: Some(profile_id),
                message: message.to_string(),
                progress: Some(progress.clamp(0.0, 1.0)), // Clamp progress
                error,
            })
            .await?;
        Ok(event_id)
    }

    /// Copy downloaded assets to the profile's game directory for a specific asset ID.
    /// (Internal function called by process_asset_group)
    pub async fn copy_assets_to_game_dir(
        &self,
        asset_id: &str, // Use the specific asset_id for source path
        assets: &NoriskAssets,
        keep_local_assets: bool,
        game_dir: PathBuf, // Target directory is the same regardless of asset_id
        profile_id: Option<Uuid>,
    ) -> Result<()> {
        // Source directory depends on the asset_id
        let source_dir = self.base_path.join(NORISK_ASSETS_DIR).join(asset_id);
        let target_dir = game_dir.join("NoRiskClient").join("assets"); // Target base is consistent

        info!(
            "[NRC Assets Copy '{}'] Copying from {} to {}",
            asset_id,
            source_dir.display(),
            target_dir.display()
        );

        if !fs::try_exists(&source_dir).await? {
            warn!(
                "[NRC Assets Copy '{}'] Source directory {} does not exist. Nothing to copy.",
                asset_id,
                source_dir.display()
            );
            return Ok(()); // Not an error if source doesn't exist (maybe fetch failed)
        }

        if !fs::try_exists(&target_dir).await? {
            fs::create_dir_all(&target_dir).await?;
            info!(
                "[NRC Assets Copy '{}'] Created target directory: {}",
                asset_id,
                target_dir.display()
            );
        }

        let assets_list: Vec<(String, AssetObject)> = assets
            .objects
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();

        let mut copied_count = 0;
        let mut skipped_count = 0;
        let total_assets = assets_list.len();

        let state = State::get().await.ok(); // Ok if state fails, just won't emit events

        if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
            self.emit_copy_event(
                state_ref,
                profile_id_val,
                &format!(
                    "Preparing copy for group '{}': {} files",
                    asset_id, total_assets
                ),
                0.0,
                None, // Adjust progress?
            )
            .await?;
        }

        let batch_size = 50;
        let mut batch_count = 0;
        let total_batches = (total_assets + batch_size - 1) / batch_size;

        for chunk in assets_list.chunks(batch_size) {
            batch_count += 1;
            let mut batch_copied = 0;
            let mut batch_skipped = 0;

            for (name, _asset) in chunk {
                // We don't need asset details here anymore, just the name
                let source_path = source_dir.join(&name);
                let target_path = target_dir.join(&name); // Target path uses the same relative name

                if !fs::try_exists(&source_path).await? {
                    warn!(
                        "[NRC Assets Copy '{}'] Source file missing: {}",
                        asset_id,
                        source_path.display()
                    );
                    continue;
                }

                let needs_copy = if fs::try_exists(&target_path).await? {
                    if keep_local_assets {
                        debug!(
                            "[NRC Assets Copy '{}'] Keeping local asset {} (keep_local_assets)",
                            asset_id, name
                        );
                        false
                    } else {
                        let source_metadata = fs::metadata(&source_path).await?;
                        let target_metadata = fs::metadata(&target_path).await?;
                        if source_metadata.len() != target_metadata.len() {
                            debug!(
                                "[NRC Assets Copy '{}'] Size mismatch for {}, needs copy",
                                asset_id, name
                            );
                            true
                        } else {
                            trace!(
                                "[NRC Assets Copy '{}'] Skipping {}, same size",
                                asset_id,
                                name
                            );
                            false
                        }
                    }
                } else {
                    debug!(
                        "[NRC Assets Copy '{}'] Target doesn't exist for {}, needs copy",
                        asset_id, name
                    );
                    true
                };

                if needs_copy {
                    if let Some(parent) = target_path.parent() {
                        if !fs::try_exists(parent).await? {
                            fs::create_dir_all(parent).await?;
                        }
                    }
                    fs::copy(&source_path, &target_path).await?;
                    copied_count += 1;
                    batch_copied += 1;
                } else {
                    skipped_count += 1;
                    batch_skipped += 1;
                }
            }

            if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
                // TODO: Scale progress based on caller's range
                let progress_within_copy = (batch_count as f64 / total_batches as f64) * 0.9 + 0.1; // Scale 0-1 -> 0.1-1.0
                self.emit_copy_event(
                    state_ref,
                    profile_id_val,
                    &format!(
                        "Copying '{}' assets: Batch {}/{} (Copied: {}, Skipped: {})",
                        asset_id, batch_count, total_batches, copied_count, skipped_count
                    ),
                    progress_within_copy,
                    None,
                )
                .await?;
            }
        }

        if let (Some(state_ref), Some(profile_id_val)) = (&state, profile_id) {
            self.emit_copy_event(
                state_ref,
                profile_id_val,
                &format!(
                    "Asset copy completed for group '{}'. Copied: {}, Skipped: {}",
                    asset_id, copied_count, skipped_count
                ),
                1.0,
                None, // Adjust progress?
            )
            .await?;
        }

        info!(
            "[NRC Assets Copy '{}'] Completed. Copied: {}, Skipped: {}",
            asset_id, copied_count, skipped_count
        );
        Ok(())
    }

    /// Helper method for emitting copy progress events
    async fn emit_copy_event(
        &self,
        state: &State,
        profile_id: Uuid,
        message: &str,
        progress: f64,
        error: Option<String>,
    ) -> Result<Uuid> {
        let event_id = Uuid::new_v4();
        state
            .emit_event(EventPayload {
                event_id,
                // Use a distinct event type for copying
                event_type: EventType::CopyingNoRiskClientAssets,
                target_id: Some(profile_id),
                message: message.to_string(),
                progress: Some(progress.clamp(0.0, 1.0)), // Clamp progress
                error,
            })
            .await?;
        Ok(event_id)
    }
}
