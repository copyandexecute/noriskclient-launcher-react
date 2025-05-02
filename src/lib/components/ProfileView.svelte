<script lang="ts">
    import type {
        Profile,
        Mod,
        NoriskModIdentifier,
    } from "$lib/stores/profileStore";
    import type { ModrinthVersion, ModrinthProject, ModrinthBulkUpdateRequestBody, ModrinthHashAlgorithm } from "$lib/types/modrinth";
    import type {
        NoriskModpacksConfig,
        NoriskPackDefinition,
    } from "$lib/types/noriskPacks"; // Assuming these types are needed
    import type { FileNode } from "$lib/types/fileSystem"; // Add FileNode import
    import ProfileContent from "./ProfileContent.svelte"; // Import ProfileContent
    import ProfileCopy from "./ProfileCopy.svelte"; // Import ProfileCopy instead
    import ProfileWorlds from "./ProfileWorlds.svelte"; // Import ProfileWorlds
    import Modal from "./Modal.svelte"; // Import Modal component
    import { invoke } from "@tauri-apps/api/core";
    import { copyProfile } from "$lib/api/profiles";
    import ProfileExport from "./ProfileExport.svelte"; // Import ProfileExport
    import type { EventPayload } from "$lib/types/events";
    import type { CustomModInfo, ModSourceModrinth } from "$lib/types/profile";
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";

    // Define props passed from ProfileManager
    let {
        profile,
        noriskPacksConfig, // Needed for pack name/mods
        profileCustomMods, // Direct list for this profile
        profileCustomModsLoading,
        profileCustomModsError,
        profileUpdates, // Set of mod IDs with updates for this profile
        // Props related to the globally active version dropdown
        activeVersionDropdown, // { profileId, modId } | null
        versionsForCurrentDropdown, // ModrinthVersion[]
        errorForCurrentDropdown, // string | null
        hasAlternativeVersions, // boolean
        // NEW: Prop to check if THIS profile's dropdown is open
        isDropdownOpenForThisMod,
        // NEW: Prop to check if alternatives exist for THIS mod
        doAlternativesExistForThisMod,
        profileEvents, // Added prop for events
    } = $props<{
        profile: Profile & { path?: string };
        noriskPacksConfig: NoriskModpacksConfig | null;
        profileCustomMods: CustomModInfo[] | undefined;
        profileCustomModsLoading: boolean;
        profileCustomModsError: string | null;
        profileUpdates: Set<string>;
        activeVersionDropdown: { profileId: string; modId: string } | null;
        versionsForCurrentDropdown: ModrinthVersion[];
        errorForCurrentDropdown: string | null;
        hasAlternativeVersions: boolean; // Kept for potential template logic if needed
        isDropdownOpenForThisMod: (modId: string) => boolean;
        doAlternativesExistForThisMod: (modId: string) => boolean;
        profileEvents: EventPayload[]; // Added prop for events
    }>();

    // State for FileNodeViewer
    let directoryStructure = $state<FileNode | null>(null);
    let directoryStructureLoading = $state(false);
    let directoryStructureError = $state<string | null>(null);
    let selectedFiles = $state(new Set<string>());

    // State for Modal
    let showFileViewerModal = $state(false);

    // Event dispatcher
    const dispatch = createEventDispatcher();

    // State for Copy Profile modal
    let showCopyProfileModal = $state(false);
    
    // State for Export Profile modal
    let showExportProfileModal = $state(false);

    // Füge zur Statusverfolgung hinzu
    let isLaunching = $state(false);

    // State for mod icons
    let modrinthProjects = $state<Record<string, ModrinthProject>>({});
    let loadingModrinthProjects = $state(false);
    let modrinthProjectsError = $state<string | null>(null);

    // State für Norisk Mod Icons
    let noriskModIcons = $state<Record<string, string>>({});
    let loadingNoriskModIcons = $state(false);
    let noriskModIconsError = $state<string | null>(null);

    // NEW: State for mod updates using the new bulk update command
    let modUpdates = $state<Record<string, ModrinthVersion>>({});
    let checkingModUpdates = $state(false);
    let modUpdatesError = $state<string | null>(null);

    // Function to fetch Modrinth project details for all mods
    async function fetchModrinthProjectDetails() {
        if (!profile.mods || profile.mods.length === 0) return;
        
        // Extract Modrinth project IDs from mods
        const modrinthProjectIds = profile.mods
            .filter((mod: Mod) => mod.source.type === "modrinth")
            .map((mod: Mod) => (mod.source as ModSourceModrinth).project_id);
        
        if (modrinthProjectIds.length === 0) return;
        
        loadingModrinthProjects = true;
        modrinthProjectsError = null;
        
        try {
            const projectDetails = await invoke<ModrinthProject[]>("get_modrinth_project_details", {
                ids: modrinthProjectIds
            });
            
            // Convert to record for easy lookup
            const projectsMap: Record<string, ModrinthProject> = {};
            for (const project of projectDetails) {
                projectsMap[project.id] = project;
            }
            
            modrinthProjects = projectsMap;
        } catch (error) {
            console.error("Error fetching Modrinth project details:", error);
            modrinthProjectsError = error instanceof Error ? error.message : "Error fetching mod icons";
        } finally {
            loadingModrinthProjects = false;
        }
    }

    // Load mod updates using the new bulk update check command
    async function checkForModUpdates() {
        if (!profile.mods || profile.mods.length === 0) return;
        
        // Filter Modrinth mods with SHA1 hashes
        const modsWithHashes = profile.mods.filter((mod: Mod) => 
            mod.source.type === "modrinth" && 
            (mod.source as ModSourceModrinth).file_hash_sha1 != null
        );
        
        if (modsWithHashes.length === 0) return;
        
        const hashes = modsWithHashes.map((mod: Mod) => 
            (mod.source as ModSourceModrinth).file_hash_sha1!
        );
        
        checkingModUpdates = true;
        modUpdatesError = null;
        
        try {
            // Prepare the request body
            const request: ModrinthBulkUpdateRequestBody = {
                hashes,
                algorithm: "sha1" as ModrinthHashAlgorithm,
                loaders: [profile.loader],
                game_versions: [profile.game_version]
            };
            
            console.log(`Checking for updates for ${hashes.length} mods...`);
            
            // Call the new bulk update check command
            const updates = await invoke<Record<string, ModrinthVersion>>(
                "check_modrinth_updates", 
                { request }
            );
            
            modUpdates = updates;
            console.log(`Found updates for ${Object.keys(updates).length} mods`);
            
            // Map file hashes back to mod IDs for easier reference in the UI
            const modIdsByHash = new Map<string, string>();
            for (const mod of modsWithHashes) {
                const hash = (mod.source as ModSourceModrinth).file_hash_sha1!;
                modIdsByHash.set(hash, mod.id);
            }
            
            // Log which mods have updates
            for (const [hash, version] of Object.entries(updates)) {
                const modId = modIdsByHash.get(hash);
                if (modId) {
                    console.log(`Update available for mod ${modId}: ${version.name} ${version.version_number}`);
                }
            }
        } catch (error) {
            console.error("Error checking for mod updates:", error);
            modUpdatesError = error instanceof Error ? error.message : "Error checking for mod updates";
        } finally {
            checkingModUpdates = false;
        }
    }
    
    // Helper function to check if a mod has an update available
    function hasModUpdate(mod: Mod): boolean {
        if (mod.source.type !== "modrinth") return false;
        
        const hash = (mod.source as ModSourceModrinth).file_hash_sha1;
        if (!hash || !(hash in modUpdates)) return false;
        
        // Get the current version ID and update version
        const currentVersionId = (mod.source as ModSourceModrinth).version_id;
        const updateVersion = modUpdates[hash];
        
        // Make sure we're not showing an update for the same version
        // If the version IDs match, it's not an update
        return updateVersion.id !== currentVersionId;
    }
    
    // Helper function to get update version for a mod
    function getModUpdateVersion(mod: Mod): ModrinthVersion | null {
        if (!hasModUpdate(mod)) return null;
        
        const hash = (mod.source as ModSourceModrinth).file_hash_sha1;
        return hash ? modUpdates[hash] : null;
    }

    // Handle updating a mod to the latest version
    async function handleUpdateMod(mod: Mod) {
        if (!hasModUpdate(mod)) return;
        
        const updateVersion = getModUpdateVersion(mod);
        if (!updateVersion) {
            console.error("Update version not found despite hasModUpdate returning true");
            return;
        }
        
        try {
            console.log(`Updating mod ${mod.id} in profile ${profile.id} to version ${updateVersion.id}`);
            
            // Show loading state
            const modId = mod.id.toString();
            const oldUpdatesMap = {...modUpdates};
            
            // Remove from updates map to hide update button during update
            if (mod.source.type === "modrinth") {
                const hash = (mod.source as ModSourceModrinth).file_hash_sha1;
                if (hash && hash in modUpdates) {
                    const newMap = {...modUpdates};
                    delete newMap[hash];
                    modUpdates = newMap;
                }
            }
            
            // Call the update command
            await invoke("update_modrinth_mod_version", {
                profileId: profile.id,
                modInstanceId: mod.id,
                newVersionDetails: updateVersion
            });
            
            console.log(`Successfully updated mod ${mod.id} to version ${updateVersion.id}`);
            
            // Optionally refresh mod list or entire profile
            dispatch("modUpdated", { modId: mod.id, version: updateVersion });
            
        } catch (error) {
            console.error("Failed to update mod:", error);
            // Restore updates map in case of error
            modUpdates = {...modUpdates}; // Trigger reactivity
            
            // Show error to user
            dispatch("error", { 
                message: "Failed to update mod", 
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // Überprüfe den Status beim Laden der Komponente
    onMount(async () => {
        try {
            isLaunching = await invoke<boolean>("is_profile_launching", {
                profileId: profile.id
            });
            
            // Wenn wir bereits starten, starte den Polling-Prozess
            if (isLaunching) {
                pollLaunchingStatus();
            }
            
            // Fetch Modrinth project details for icons
            await fetchModrinthProjectDetails();
            
            // Fetch Norisk mod icons wenn ein Norisk Pack ausgewählt ist
            if (profile.selected_norisk_pack_id && noriskPacksConfig?.packs) {
                await fetchNoriskModIcons();
            }
            
            // NEW: Check for mod updates
            await checkForModUpdates();
        } catch (error) {
            console.error("Error during component initialization:", error);
        }
    });

    // Regelmäßige Statusprüfung als separate Funktion
    function pollLaunchingStatus() {
        const checkInterval = setInterval(async () => {
            try {
                const stillLaunching = await invoke<boolean>("is_profile_launching", {
                    profileId: profile.id
                });
                
                if (!stillLaunching) {
                    // Prozess ist nicht mehr aktiv
                    isLaunching = false;
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error("Error checking launch status:", error);
                isLaunching = false;
                clearInterval(checkInterval);
            }
        }, 1000); // Prüfe jede Sekunde
    }

    // Manuelle Logging-Funktion für den Status
    function logStatus() {
        console.log("[FileNodeViewer Debug] Structure state:", {
            directoryStructure,
            directoryStructureLoading,
            directoryStructureError,
            selectedFiles: selectedFiles.size,
            hasRootNode: directoryStructure !== null,
            rootNodeDetails: directoryStructure
                ? {
                      name: directoryStructure.name,
                      path: directoryStructure.path,
                      isDir: directoryStructure.is_dir,
                      childrenCount: directoryStructure.children?.length || 0,
                  }
                : "null",
        });
    }

    // --- Helper Functions (moved or adapted from ProfileManager) ---

    function getModDisplayName(mod: Mod): string {
        if (mod.display_name) return mod.display_name;
        switch (mod.source.type) {
            case "modrinth":
                return (
                    mod.source.file_name ??
                    mod.source.project_id ??
                    "Modrinth Mod"
                );
            case "local":
                return mod.source.file_name ?? "Local Mod";
            case "url":
                return mod.source.file_name ?? mod.source.url ?? "URL Mod";
            case "maven":
                return mod.source.coordinates ?? "Maven Mod";
            case "embedded":
                return mod.source.name ?? "Embedded Mod";
            default:
                return `Unknown Mod (${mod.id})`;
        }
    }

    function getNoriskPackName(packId: string | null): string {
        if (!packId || !noriskPacksConfig?.packs) {
            return "Kein Norisk Pack";
        }
        const packDefinition = noriskPacksConfig.packs[packId];
        return packDefinition
            ? packDefinition.displayName
            : `Unbekannt (${packId})`;
    }

    function getNoriskPackDefinition(
        packId: string | null,
    ): NoriskPackDefinition | null {
        if (!packId || !noriskPacksConfig?.packs) {
            return null;
        }
        return noriskPacksConfig.packs[packId] ?? null;
    }

    function isNoriskModDisabled(packModId: string): boolean {
        if (
            !profile.selected_norisk_pack_id ||
            !profile.disabled_norisk_mods_detailed
        ) {
            return false;
        }
        return profile.disabled_norisk_mods_detailed.some(
            (identifier: NoriskModIdentifier) =>
                identifier.pack_id === profile.selected_norisk_pack_id &&
                identifier.mod_id === packModId &&
                identifier.game_version === profile.game_version &&
                identifier.loader === profile.loader,
        );
    }

    // Shape alias needed by getModrinthVersionId
    type ModrinthSourceShape = {
        type: "modrinth";
        project_id: string;
        version_id: string;
        file_name: string;
        download_url: string;
        file_hash_sha1: string | null | undefined;
    };

    function getModrinthVersionId(source: Mod["source"]): string | null {
        if (source.type === "modrinth") {
            return (source as ModrinthSourceShape).version_id;
        }
        return null;
    }

    // --- Component Logic / Event Handlers ---

    // Helper to get the last event from the passed list
    function getLastEvent(events: EventPayload[]): EventPayload | null {
        return events[events.length - 1] || null;
    }

    // Example: Dispatch event when delete button is clicked
    function handleDeleteMod(modId: string) {
        dispatch("deleteMod", { modId });
    }

    function handleToggleMod(modId: string, event: Event) {
        dispatch("toggleMod", { modId, originalEvent: event });
    }

    function handleToggleNoriskMod(packModId: string, event: Event) {
        dispatch("toggleNoriskMod", { packModId, originalEvent: event });
    }

    function handleToggleCustomMod(filename: string, event: Event) {
        dispatch("toggleCustomMod", { filename, originalEvent: event });
    }

    function handleOpenVersionDropdown(modId: string) {
        dispatch("openVersionDropdown", { modId });
    }

    function handleVersionChange(mod: Mod, event: Event) {
        dispatch("changeVersion", { mod, originalEvent: event });
    }

    function handleCancelVersionChange() {
        dispatch("cancelVersionChange");
    }

    // Load directory structure and open modal
    async function openFileViewerModal() {
        showFileViewerModal = true;

        if (!directoryStructure) {
            await loadDirectoryStructure();
        }
    }

    // Close modal
    function closeFileViewerModal() {
        showFileViewerModal = false;
    }

    // New function to load directory structure using Tauri's invoke directly
    async function loadDirectoryStructure() {
        console.log(
            "[FileNodeViewer Debug] Loading directory structure for profile:",
            profile.id,
        );

        if (!profile.id) {
            console.error(
                "[FileNodeViewer Debug] Cannot load structure - missing profile ID",
            );
            directoryStructureError = "Profile ID is missing";
            return;
        }

        directoryStructureLoading = true;
        directoryStructure = null;
        directoryStructureError = null;

        try {
            // Call the method using Tauri's invoke directly with generics
            console.log(
                "[FileNodeViewer Debug] Calling Tauri command with args:",
                { profileId: profile.id },
            );

            // Hier wird der Typ automatisch aus FileNode abgeleitet
            const result = await invoke<FileNode>(
                "get_profile_directory_structure",
                {
                    profileId: profile.id,
                },
            );

            console.log("[FileNodeViewer Debug] Received raw result:", result);

            // Prüfe und konvertiere das Ergebnis
            if (result) {
                directoryStructure = result;
                console.log(
                    "[FileNodeViewer Debug] Structure assigned to directoryStructure:",
                    directoryStructure,
                );
            } else {
                directoryStructureError = "Response was empty";
                console.error(
                    "[FileNodeViewer Debug] Empty response from Tauri",
                );
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred";
            console.error(
                "[FileNodeViewer Debug] Exception while loading structure:",
                errorMsg,
                error,
            );
            directoryStructureError = errorMsg;
        } finally {
            directoryStructureLoading = false;
            logStatus(); // Log status nach Statusänderung

            // Zusätzliche Prüfung nach einiger Zeit, um zu sehen, ob die Werte korrekt gesetzt wurden
            setTimeout(() => {
                console.log("[FileNodeViewer Debug] State after delay:", {
                    directoryStructure,
                    directoryStructureLoading,
                    directoryStructureError,
                });
            }, 500);
        }
    }

    // Handle file selection change
    function handleFileSelectionChange(event: CustomEvent) {
        console.log(
            "[FileNodeViewer Debug] File selection changed:",
            event.detail,
        );
        selectedFiles = new Set(event.detail.selectedFiles);
        dispatch("fileSelectionChange", {
            profileId: profile.id,
            selectedFiles: [...selectedFiles],
        });
        logStatus(); // Log status nach Statusänderung
    }

    // Open and close copy profile modal
    function openCopyProfileModal() {
        showCopyProfileModal = true;
    }
    
    function closeCopyProfileModal() {
        showCopyProfileModal = false;
    }
    
    function handleCopySuccess() {
        showCopyProfileModal = false;
        // Optional: Show success message
        console.log("Profile copied successfully");
    }

    // Open and close export profile modal
    function openExportProfileModal() {
        showExportProfileModal = true;
    }
    
    function closeExportProfileModal() {
        showExportProfileModal = false;
    }
    
    function handleExportSuccess() {
        showExportProfileModal = false;
        // Optional: Show success message
        console.log("Profile exported successfully");
    }

    // Behandeln des Launches und Abbruches
    async function handleLaunch() {
        if (isLaunching) {
            // Wenn wir bereits starten, brechen wir den Prozess ab
            try {
                await invoke("abort_profile_launch", { profileId: profile.id });
                isLaunching = false;
            } catch (error) {
                console.error("Failed to abort launch process:", error);
            }
        } else {
            // Starte den Prozess
            isLaunching = true;
            try {
                dispatch("launch");
                
                // Starte den Polling-Prozess
                pollLaunchingStatus();
            } catch (error) {
                console.error("Failed to launch profile:", error);
                isLaunching = false;
            }
        }
    }

    // Function to fetch icons for Norisk mods
    async function fetchNoriskModIcons() {
        if (!profile.selected_norisk_pack_id || !noriskPacksConfig?.packs) return;
        
        const packDef = getNoriskPackDefinition(profile.selected_norisk_pack_id);
        if (!packDef || !packDef.mods || packDef.mods.length === 0) return;
        
        // Filter only compatible mods
        const compatibleMods = packDef.mods.filter(mod => {
            return mod.compatibility?.[profile.game_version]?.[profile.loader];
        });
        
        if (compatibleMods.length === 0) return;
        
        loadingNoriskModIcons = true;
        noriskModIconsError = null;
        
        try {
            console.log(`Fetching icons for ${compatibleMods.length} Norisk mods...`);
            
            const iconsResult = await invoke<Record<string, string | null>>("get_icons_for_norisk_mods", {
                mods: compatibleMods,
                minecraftVersion: profile.game_version,
                loader: profile.loader
            });
            
            // Konvertiere in unser Format (nur gültige Icons)
            const icons: Record<string, string> = {};
            for (const [modId, base64Icon] of Object.entries(iconsResult)) {
                if (base64Icon) {
                    icons[modId] = base64Icon;
                }
            }
            
            noriskModIcons = icons;
            console.log(`Loaded ${Object.keys(icons).length} Norisk mod icons.`);
            
        } catch (error) {
            console.error("Error fetching Norisk mod icons:", error);
            noriskModIconsError = error instanceof Error ? error.message : "Error fetching Norisk mod icons";
        } finally {
            loadingNoriskModIcons = false;
        }
    }

    // Dispatch launch event when ProfileWorlds requests it
    function handleQuickPlayLaunch(event: CustomEvent<{ profileId: string, quickPlaySingleplayer?: string, quickPlayMultiplayer?: string }>) {
        console.log('[ProfileView] Received launch event from ProfileWorlds/Servers, dispatching upwards:', event.detail);
        
        // Prepare options object based on what's provided in the event
        let launchOptions = {};
        if (event.detail.quickPlaySingleplayer) {
            launchOptions = { quickPlaySingleplayer: event.detail.quickPlaySingleplayer };
        } else if (event.detail.quickPlayMultiplayer) {
            launchOptions = { quickPlayMultiplayer: event.detail.quickPlayMultiplayer };
        }
        
        dispatch('launch', {
            profileId: event.detail.profileId, // Use the profileId from the event
            options: launchOptions // Pass the constructed options object
        });
    }

    // Launch game by dispatching event (for the main launch button)
    function dispatchLaunch() {
        if (isLaunching) return;
        isLaunching = true; // Set launching state here
        console.log(`[ProfileView] Dispatching launch for profile ${profile.id}`);
        dispatch('launch', { profileId: profile.id, options: {} }); // No options for standard launch
        // We don't reset isLaunching here, ProfileManager should handle UI feedback
    }
</script>

<!-- Moved HTML structure for a single profile item here -->
<div class="profile-item">
    <div class="profile-info">
        <div class="profile-details">
            <h4>{profile.name}</h4>
            <p>Version: {profile.game_version}</p>
            <p>Mod Loader: {profile.loader}</p>
            {#if profile.loader !== "vanilla"}
                <p>
                    Loader Version: {profile.loader_version ||
                        "Default (Latest)"}
                </p>
            {/if}
            <p>Erstellt: {new Date(profile.created).toLocaleDateString()}</p>
            <p>
                Norisk Pack: {getNoriskPackName(
                    profile.selected_norisk_pack_id,
                )}
            </p>
            <p>Pfad: {profile.path || "Unbekannt"}</p>
            {#if profile.last_played}
                <p>
                    Zuletzt gespielt: {new Date(
                        profile.last_played,
                    ).toLocaleDateString()}
                </p>
            {/if}

            <!-- Letztes Event für dieses Profil -->
            {#if profileEvents && profileEvents.length > 0}
                {@const lastEvent = getLastEvent(profileEvents)}
                {#if lastEvent}
                    <div class="last-event">
                        <p class="event-message">{lastEvent.message}</p>
                        <!-- Optional: Add progress bar or error display if needed -->
                    </div>
                {/if}
            {:else}
                <div class="last-event">
                    <p class="no-event">Kein Event</p>
                </div>
            {/if}
        </div>
        <div class="profile-actions">
            <!-- Launch Button -->
            <button
                class="launch-button"
                disabled={isLaunching}
                on:click={dispatchLaunch}
            >
                {#if isLaunching}
                    Launching...
                {:else}
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Launch {profile.name}
                {/if}
            </button>
            <button on:click={() => dispatch("edit")}>Edit</button>
            <button on:click={() => dispatch("delete")}>Delete</button>
            <button
                on:click={() => dispatch("openFolder")}
                title="Open profile folder">Open Folder</button
            >
            <button
                on:click={() => dispatch("importLocalMods")}
                title="Import local .jar mods">Import Mods</button
            >
            <!-- New Copy Profile button -->
            <button
                on:click={openCopyProfileModal}
                title="Copy profile with selected files">Copy Profile</button
            >
            <!-- Export Profile button - updated to open modal -->
            <button
                on:click={openExportProfileModal}
                title="Export profile as .noriskpack">Export</button
            >
        </div>
    </div>

    <!-- Display Mods for this profile -->
    {#if profile.mods && profile.mods.length > 0}
        <!-- Filter mods based on game version AND loader compatibility -->
        {@const compatibleMods = profile.mods.filter((mod: Mod) => {
            // Check 1: Game Version
            const gameVersionMatch =
                mod.game_versions == null ||
                (mod.game_versions &&
                    mod.game_versions.includes(profile.game_version));

            // Check 2: Loader
            const loaderMatch =
                mod.associated_loader != null &&
                mod.associated_loader === profile.loader;

            // Mod is compatible only if both match
            return gameVersionMatch && loaderMatch;
        })}
        <div class="mods-section user-mods">
            <!-- Use the length of the filtered list for the count -->
            <h4>Mods ({compatibleMods.length}):</h4>
            <ul class="mods-list">
                {#each compatibleMods as mod (mod.id)}
                    <!-- Removed the inner #if block as filtering is done above -->
                    {@const hasUpdate = profileUpdates.has(mod.id)}
                    {@const isDropdownOpen = isDropdownOpenForThisMod(mod.id)}
                    {@const alternativesExist = doAlternativesExistForThisMod(
                        mod.id,
                    )}
                    <li class="mod-item {mod.enabled ? 'enabled' : 'disabled'}">
                        <input
                            type="checkbox"
                            checked={mod.enabled}
                            aria-label={`Toggle mod ${getModDisplayName(mod)}`}
                            class="mod-toggle-checkbox"
                            on:change={(event) =>
                                handleToggleMod(mod.id, event)}
                        />
                        
                        <!-- Add mod icon if available -->
                        {#if mod.source.type === "modrinth" && modrinthProjects[(mod.source as ModSourceModrinth).project_id]?.icon_url}
                            <img 
                                src={modrinthProjects[(mod.source as ModSourceModrinth).project_id].icon_url} 
                                alt="Mod icon" 
                                class="mod-icon" 
                                loading="lazy"
                            />
                        {:else}
                            <div class="mod-icon mod-icon-placeholder"></div>
                        {/if}
                        
                        <span class="mod-name">{getModDisplayName(mod)}</span>

                        {#if hasUpdate}
                            <span
                                class="update-indicator"
                                title="Update available">⬆️</span
                            >
                        {/if}

                        <!-- NEW: Show update indicator from bulk check -->
                        {#if hasModUpdate(mod)}
                            {@const updateVersion = getModUpdateVersion(mod)}
                            <span 
                                class="update-indicator new-update"
                                title={updateVersion ? `Update to ${updateVersion.name} ${updateVersion.version_number} available` : "Update available"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3v12"></path>
                                    <path d="m17 8-5-5-5 5"></path>
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5"></path>
                                </svg>
                            </span>
                            <!-- Add update button -->
                            <button 
                                class="update-mod-button"
                                title={updateVersion ? `Update to ${updateVersion.name} ${updateVersion.version_number}` : "Update to latest version"}
                                on:click={(event) => handleUpdateMod(mod)}
                            >
                                Update
                            </button>
                        {/if}

                        <!-- Modrinth Version Changer -->
                        {#if mod.source.type === "modrinth"}
                            {@const currentVersionId = getModrinthVersionId(
                                mod.source,
                            )!}
                            <div class="mod-version-changer">
                                {#if isDropdownOpen}
                                    <!-- Dropdown ist offen -->
                                    {#if errorForCurrentDropdown}
                                        <span
                                            class="version-info error"
                                            title={errorForCurrentDropdown}
                                            >Error!</span
                                        >
                                        <button
                                            class="cancel-version-btn"
                                            on:click={handleCancelVersionChange}
                                            title="Abbrechen">✖</button
                                        >
                                    {:else if alternativesExist}
                                        <select
                                            class="version-select"
                                            on:change={(event) =>
                                                handleVersionChange(mod, event)}
                                            value={currentVersionId}
                                        >
                                            <option
                                                value={currentVersionId}
                                                disabled
                                            >
                                                {mod.version ??
                                                    currentVersionId} (Aktuell)
                                            </option>
                                            {#each versionsForCurrentDropdown.filter((v: ModrinthVersion) => v.id !== currentVersionId) as version (version.id)}
                                                <option value={version.id}>
                                                    {version.name} ({version.version_number})
                                                    - {version.version_type} [{new Date(
                                                        version.date_published,
                                                    ).toLocaleDateString()}]
                                                </option>
                                            {/each}
                                        </select>
                                        <button
                                            class="cancel-version-btn"
                                            on:click={handleCancelVersionChange}
                                            title="Abbrechen">✖</button
                                        >
                                    {:else}
                                        <span class="version-info"
                                            >Keine alternativen Versionen.</span
                                        >
                                        <button
                                            class="cancel-version-btn"
                                            on:click={handleCancelVersionChange}
                                            title="Abbrechen">✖</button
                                        >
                                    {/if}
                                {:else}
                                    <!-- Dropdown geschlossen -->
                                    <span class="version-info"
                                        >{mod.version ?? currentVersionId}</span
                                    >
                                    {#if alternativesExist}
                                        <button
                                            class="change-version-btn"
                                            title="Version ändern"
                                            on:click={(event) =>
                                                handleOpenVersionDropdown(
                                                    mod.id,
                                                )}
                                        >
                                            🔄
                                        </button>
                                    {/if}
                                {/if}
                            </div>
                        {/if}
                        <!-- *** Ende: Modrinth Version Changer *** -->

                        <!-- Delete Button -->
                        <button
                            class="delete-mod-button"
                            title={`Delete mod ${getModDisplayName(mod)}`}
                            on:click={(event) => handleDeleteMod(mod.id)}
                        >
                            🗑️
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
    {:else}
        <div class="mods-section no-mods">
            <p>No mods added via Launcher yet.</p>
        </div>
    {/if}

    <!-- Display Norisk Pack Mods -->
    {#if getNoriskPackDefinition(profile.selected_norisk_pack_id)}
        {@const packDef = getNoriskPackDefinition(
            profile.selected_norisk_pack_id,
        )!}
        {@const compatiblePackMods =
            packDef.mods?.filter((mod) => {
                const gameVersion = profile.game_version;
                const loader = profile.loader;
                return mod.compatibility?.[gameVersion]?.[loader];
            }) ?? []}

        {#if compatiblePackMods.length > 0}
            <div class="mods-section pack-mods">
                <h4>
                    Mods from {packDef.displayName} ({compatiblePackMods.length}):
                </h4>
                <ul class="mods-list">
                    {#each compatiblePackMods as packMod (packMod.id)}
                        {@const isDisabled = isNoriskModDisabled(packMod.id)}
                        <li
                            class="mod-item pack-mod-item {isDisabled
                                ? 'disabled'
                                : 'enabled'}"
                        >
                            <input
                                type="checkbox"
                                checked={!isDisabled}
                                aria-label={`Toggle Norisk Pack mod ${packMod.displayName}`}
                                class="mod-toggle-checkbox"
                                title={isDisabled
                                    ? "Click to enable"
                                    : "Click to disable"}
                                on:change={(event) =>
                                    handleToggleNoriskMod(packMod.id, event)}
                            />
                            
                            <!-- Norisk Mod Icon -->
                            {#if noriskModIcons[packMod.id]}
                                <img
                                    src="data:image/png;base64,{noriskModIcons[packMod.id]}"
                                    alt="Mod icon" 
                                    class="mod-icon" 
                                    loading="lazy"
                                />
                            {:else}
                                <div class="mod-icon mod-icon-placeholder"></div>
                            {/if}
                            
                            <span class="mod-name">{packMod.displayName}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}

    <!-- Custom (Local) Mods Section -->
    <div class="mods-section custom-mods">
        <h4>Lokale Mods:</h4>
        {#if profileCustomModsLoading}
            <p class="loading-text">Lade lokale Mods...</p>
        {:else if profileCustomModsError}
            <p class="error-message small">{profileCustomModsError}</p>
        {:else if profileCustomMods && profileCustomMods.length > 0}
            <ul class="mods-list">
                {#each profileCustomMods as customMod (customMod.filename)}
                    <li
                        class="mod-item local-mod-item {customMod.is_enabled
                            ? 'enabled'
                            : 'disabled'}"
                    >
                        <input
                            type="checkbox"
                            checked={customMod.is_enabled}
                            aria-label={`Toggle local mod ${customMod.filename}`}
                            class="mod-toggle-checkbox"
                            title={customMod.is_enabled
                                ? "Click to disable"
                                : "Click to enable"}
                            on:change={(event) =>
                                handleToggleCustomMod(
                                    customMod.filename,
                                    event,
                                )}
                        />
                        <span class="mod-name">{customMod.filename}</span>
                        <!-- Delete Button for Custom Mod -->
                        <button
                            class="delete-mod-button custom-delete"
                            title={`Delete custom mod ${customMod.filename}`}
                            on:click={(event) =>
                                dispatch("deleteCustomMod", {
                                    filename: customMod.filename,
                                })}
                        >
                            🗑️
                        </button>
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="no-mods">
                Keine lokalen Mods gefunden im `custom_mods` Ordner.
            </p>
        {/if}
    </div>

    <!-- Add the ProfileContent component for resourcepacks and shaderpacks -->
    <div class="additional-content">
        <ProfileContent 
          profileId={profile.id} 
          gameVersion={profile.game_version}
        />
    </div>

    <!-- Copy Profile Modal -->
    {#if showCopyProfileModal}
        <Modal show={true}>
            <ProfileCopy 
                sourceProfileId={profile.id}
                sourceProfileName={profile.name}
                onClose={closeCopyProfileModal}
                onSuccess={handleCopySuccess}
            />
        </Modal>
    {/if}
    
    <!-- Export Profile Modal -->
    {#if showExportProfileModal}
        <Modal show={true}>
            <ProfileExport
                profileId={profile.id}
                profileName={profile.name}
                onClose={closeExportProfileModal}
                onSuccess={handleExportSuccess}
            />
        </Modal>
    {/if}

    <!-- NEW: Worlds Component -->
    {#if profile.id}
        <ProfileWorlds 
            profileId={profile.id} 
            on:launch={handleQuickPlayLaunch}
        />
    {/if}
</div>

<style>
    /* Moved relevant styles from ProfileManager.svelte here */
    .profile-item {
        padding: 1em;
        margin-bottom: 1em;
        border: 1px solid #ccc;
        border-radius: 5px;
        cursor: default;
    }

    .profile-info {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .profile-details {
        flex: 1;
    }

    .profile-details h4 {
        margin: 0 0 10px 0;
        font-size: 18px;
    }

    .profile-details p {
        margin: 5px 0;
        color: #666;
    }

    .profile-actions {
        display: grid; /* Use grid */
        grid-template-columns: repeat(3, auto); /* Adjusted for button layout */
        gap: 10px;
    }

    .profile-actions button {
        padding: 8px 12px; /* Slightly adjusted padding */
    }

    /* Styles für den Launch-Button */
    .launch-button {
        background-color: #2ecc71 !important;
    }

    .launch-button:hover {
        background-color: #27ae60 !important;
    }

    /* Styles für den Cancel-Button */
    .cancel-button {
        background-color: #e74c3c !important;
        color: white !important;
        animation: pulse 1.5s infinite;
    }

    .cancel-button:hover {
        background-color: #c0392b !important;
        animation: none;
    }

    /* Pulsierender Animationseffekt für den Cancel-Button */
    @keyframes pulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
        100% {
            opacity: 1;
        }
    }

    /* Styles für den Loading-Spinner */
    .loading-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-left: 8px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s linear infinite;
        vertical-align: middle;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .profile-actions button:first-child {
        background-color: #2ecc71;
    }

    .profile-actions button:nth-child(2) {
        background-color: #f39c12;
    }

    .profile-actions button:nth-child(2):hover {
        background-color: #d35400;
    }

    .profile-actions button:nth-child(3) {
        background-color: #e74c3c;
    }

    .profile-actions button:nth-child(3):hover {
        background-color: #c0392b;
    }

    .profile-actions button:nth-child(4) {
        background-color: #3498db; /* Blue */
    }

    .profile-actions button:nth-child(4):hover {
        background-color: #2980b9;
    }

    .profile-actions button:nth-child(5) {
        background-color: #9b59b6; /* Purple */
    }

    .profile-actions button:nth-child(5):hover {
        background-color: #8e44ad;
    }

    .profile-actions button:nth-child(6) {
        background-color: #1abc9c; /* Teal */
    }

    .profile-actions button:nth-child(6):hover {
        background-color: #16a085;
    }

    .last-event {
        margin-top: 10px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
    }

    .event-message {
        margin: 0;
        font-size: 14px;
        color: #333;
    }

    .no-event {
        margin: 0;
        font-size: 14px;
        color: #666;
        font-style: italic;
    }

    .mods-section {
        margin-top: 0.8em;
        padding-top: 0.8em;
        border-top: 1px dashed #ddd;
    }

    .mods-section h4 {
        margin: 0 0 0.5em 0;
        font-size: 0.95em;
        color: #333;
    }

    .mods-list {
        list-style: none;
        padding-left: 1em;
        margin: 0;
        font-size: 0.9em;
        max-height: 150px;
        overflow-y: auto;
        padding-right: 5px;
    }

    .mod-item {
        margin-bottom: 0.3em;
        display: flex;
        align-items: center;
        gap: 0.5em;
        flex-wrap: wrap;
    }

    .mod-item.disabled {
        color: #888;
        font-style: italic;
    }

    .mod-item .mod-name {
        flex-grow: 1;
        margin-right: 10px;
    }

    .mod-toggle-checkbox {
        flex-shrink: 0;
        margin: 0;
        cursor: pointer;
    }

    .mod-version-changer {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: auto;
        margin-right: 5px;
        font-size: 0.9em;
    }

    .version-info {
        color: #555;
        padding: 2px 4px;
        background-color: #eee;
        border-radius: 3px;
        white-space: nowrap;
    }
    .version-info.loading {
        font-style: italic;
        color: #888;
    }
    .version-info.error {
        color: #e74c3c;
        background-color: #fbeae8;
        cursor: help;
    }

    .change-version-btn,
    .cancel-version-btn {
        padding: 1px 5px;
        font-size: 0.9em;
        line-height: 1;
        background-color: #eee;
        color: #333;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        transition:
            background-color 0.2s,
            border-color 0.2s;
    }
    .change-version-btn:hover,
    .cancel-version-btn:hover {
        background-color: #ddd;
        border-color: #bbb;
    }
    .cancel-version-btn {
        color: #e74c3c;
        background-color: #fbeae8;
        border-color: #e74c3c;
    }
    .cancel-version-btn:hover {
        background-color: #f8d7da;
        border-color: #d9534f;
    }

    .version-select {
        padding: 2px 5px;
        font-size: 0.9em;
        border: 1px solid #ccc;
        border-radius: 4px;
        max-width: 250px;
    }
    .version-select option {
        font-size: 1em;
    }

    .delete-mod-button {
        flex-shrink: 0;
        margin-left: 0;
        padding: 1px 5px; /* Smaller padding */
        font-size: 0.9em;
        line-height: 1;
        background-color: #eee;
        color: #e74c3c; /* Red color */
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        transition:
            background-color 0.2s,
            border-color 0.2s,
            color 0.2s;
    }

    .delete-mod-button:hover {
        background-color: #fbeae8;
        border-color: #e74c3c;
        color: #c0392b;
    }

    .mod-item.disabled .mod-name {
        color: #888;
        font-style: italic;
        text-decoration: line-through;
    }

    .mods-section.no-mods p {
        font-style: italic;
        color: #666;
        font-size: 0.9em;
        margin: 0;
    }

    .mod-name {
    }
    .update-indicator {
    }
    .mod-version-changer {
        margin-left: 0;
    }
    .delete-mod-button {
        margin-left: 5px;
    }

    .mods-section.custom-mods {
        margin-top: 0.5em;
        padding-top: 0.5em;
        border-top: 1px dotted #aaa;
    }

    .mods-section.custom-mods h4 {
        font-size: 0.9em;
        font-style: italic;
        color: #444;
    }

    .mod-item.local-mod-item.disabled .mod-name {
        color: #888;
        font-style: italic;
        text-decoration: line-through;
    }

    .loading-text {
        font-style: italic;
        color: #666;
    }
    .error-message.small {
        font-size: 0.9em;
        padding: 5px 8px;
    }

    .additional-content {
        margin-top: 2rem;
        border-top: 1px solid #ddd;
        padding-top: 1rem;
    }

    /* Add styles for mod icons */
    .mod-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        object-fit: cover;
        margin-right: 8px;
        flex-shrink: 0;
    }
    
    .mod-icon-placeholder {
        background-color: #e0e0e0;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        flex-shrink: 0;
        margin-right: 8px;
    }
    
    /* Update mod item to align with icons */
    .mod-item {
        margin-bottom: 0.3em;
        display: flex;
        align-items: center;
        gap: 0.5em;
        flex-wrap: wrap;
    }

    /* Styles for update indicator */
    .update-indicator.new-update {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #2ecc71;
        background-color: rgba(46, 204, 113, 0.1);
        border-radius: 50%;
        padding: 2px;
        margin-right: 5px;
        cursor: help;
    }
    
    .update-indicator.new-update svg {
        width: 16px;
        height: 16px;
    }

    /* Add styles for update button */
    .update-mod-button {
        padding: 2px 5px;
        font-size: 0.9em;
        background-color: #2ecc71;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 5px;
    }

    .update-mod-button:hover {
        background-color: #27ae60;
    }
</style>
