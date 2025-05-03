<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import { convertFileSrc } from '@tauri-apps/api/core';
    // Removed onMount, onDestroy as $effect handles lifecycle
    import type { WorldInfo, ServerInfo, ServerPingInfo } from '$lib/types/minecraft'; // Specific imports
    import type { Profile, CopyWorldParams } from '$lib/types/profile'; // Specific imports
    import { createEventDispatcher } from 'svelte';
    import { timeAgo } from '$lib/utils/timeUtils'; // Make sure this path and helper exist
    import { tick } from 'svelte'; // Import tick for waiting for DOM updates
    import motdParser from '@sfirew/minecraft-motd-parser'; // Import the MOTD parser
    import CopyWorldDialog from './CopyWorldDialog.svelte'; // Import the dialog
    import { notificationStore } from '$lib/stores/notificationStore'; // Import notificationStore

    // Define combined item type
    type DisplayItem = (WorldInfo & { type: 'world' }) | (ServerInfo & { type: 'server' });

    // Props
    let { profileId = null } = $props<{ profileId?: string | null }>();

    // --- Combined State ---
    let worlds = $state<WorldInfo[]>([]);
    let servers = $state<ServerInfo[]>([]);
    let displayItems = $state<DisplayItem[]>([]); // Combined list for UI
    let loading = $state(false); // Combined loading state
    let error = $state<string | null>(null); // Combined error state

    // State for Server Pings
    let serverPings = $state<Record<string, ServerPingInfo>>({});
    let pingingServers = $state<Set<string>>(new Set());

    // Copy Dialog State
    let showCopyDialog = $state(false);
    let worldToCopy = $state<WorldInfo | null>(null);
    let copyLoading = $state(false); // Loading state for the copy operation
    let deleteLoading = $state<Record<string, boolean>>({}); // Loading state for delete, keyed by folder_name

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        launch: {
            profileId: string;
            quickPlaySingleplayer?: string;
            quickPlayMultiplayer?: string;
        }
    }>();

    // --- Data Loading and Processing ---
    async function loadData() {
        if (!profileId) {
            resetState();
            return;
        }
        console.log(`[ProfileWorlds] Loading data for profile: ${profileId}`);
        loading = true;
        error = null;
        worlds = [];
        servers = [];
        displayItems = [];
        serverPings = {}; // Clear pings on reload
        pingingServers = new Set(); // Clear pinging status

        try {
            const [worldsResult, serversResult] = await Promise.allSettled([
                invoke<WorldInfo[]>('get_worlds_for_profile', { profileId }),
                invoke<ServerInfo[]>('get_servers_for_profile', { profileId })
            ]);

            let loadError = false; // Flag to track if any part failed

            // Handle worlds
            if (worldsResult.status === 'fulfilled') {
                worlds = worldsResult.value;
                console.log(`[ProfileWorlds] Loaded ${worlds.length} worlds`);
            } else {
                console.error('Failed to load worlds:', worldsResult.reason);
                error = `Error loading worlds: ${worldsResult.reason instanceof Error ? worldsResult.reason.message : String(worldsResult.reason)}`;
                loadError = true;
            }

            // Handle servers
            if (serversResult.status === 'fulfilled') {
                servers = serversResult.value;
                console.log(`[ProfileWorlds] Loaded ${servers.length} servers`);
            } else {
                console.error('Failed to load servers:', serversResult.reason);
                // Append server error if world error already exists
                const serverErrorMsg = `Error loading servers: ${serversResult.reason instanceof Error ? serversResult.reason.message : String(serversResult.reason)}`;
                error = error ? `${error}; ${serverErrorMsg}` : serverErrorMsg;
                loadError = true;
            }

            // Update display items only if no critical error occurred during loading
            if (!loadError) {
                updateDisplayItems();
                // Ping servers only after successful server list load
                if (servers.length > 0) {
                    await tick();
                    pingAllServers();
                }
            } else {
                 displayItems = []; // Ensure list is empty on error
            }

        } catch (err) {
            // Catch synchronous errors or unexpected issues
            console.error('Unexpected error during data loading:', err);
            error = `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
            displayItems = []; // Ensure list is empty on error
        } finally {
            loading = false;
        }
    }

    function updateDisplayItems() {
        // Map worlds and servers to the combined type
        const typedWorlds: DisplayItem[] = worlds.map(w => ({ ...w, type: 'world' }));
        const typedServers: DisplayItem[] = servers.map(s => ({ ...s, type: 'server' }));

        // Sort worlds by last played (desc)
        typedWorlds.sort((a, b) => {
            if (a.type === 'world' && b.type === 'world') {
                return (b.last_played ?? 0) - (a.last_played ?? 0);
            }
            return 0; // Should not happen if types are correct
        });

        // Sort servers alphabetically by display name
        typedServers.sort((a, b) => {
             if (a.type === 'server' && b.type === 'server') {
                const nameA = getServerDisplayName(a).toLowerCase();
                const nameB = getServerDisplayName(b).toLowerCase();
                return nameA.localeCompare(nameB);
             }
             return 0; // Should not happen
        });

        // Combine sorted lists (worlds first, then servers)
        displayItems = [...typedWorlds, ...typedServers];
        console.log(`[ProfileWorlds] Updated displayItems: ${displayItems.length} items`);
    }

    function resetState() {
        worlds = [];
        servers = [];
        displayItems = [];
        error = null;
        loading = false;
        serverPings = {};
        pingingServers = new Set();
        showCopyDialog = false;
        worldToCopy = null;
        copyLoading = false;
        deleteLoading = {};
    }

    // --- Server Pinging ---
    async function pingAllServers() {
        const serversToPing = servers.filter(s => s.address); // Only ping servers with an address
        if (serversToPing.length === 0) return;

        console.log(`[ProfileWorlds] Pinging ${serversToPing.length} servers...`);
        const pingsToRun: Promise<void>[] = [];
        // Set pinging status only for those we actually ping
        pingingServers = new Set(serversToPing.map(s => s.address as string)); 
        serverPings = {}; // Clear previous pings

        for (const server of serversToPing) {
            // server.address is guaranteed to be non-null here due to filter
            const address = server.address as string; 
            pingsToRun.push(
                (async () => {
                    try {
                        console.log(`[ProfileWorlds] Pinging: ${address}`);
                        const pingResult = await invoke<ServerPingInfo>('ping_minecraft_server', { address });
                        serverPings[address] = pingResult;
                        console.log(`[ProfileWorlds] Ping result for ${address}:`, pingResult);
                    } catch (err) {
                        console.error(`[ProfileWorlds] Failed to ping ${address}:`, err);
                        serverPings[address] = { /* error structure */ error: err instanceof Error ? err.message : String(err), description:null, description_json:null, version_name:null, version_protocol:null, players_online:null, players_max:null, favicon_base64:null, latency_ms:null };
                    } finally {
                        pingingServers.delete(address);
                        pingingServers = new Set(pingingServers); // Trigger reactivity
                        serverPings = { ...serverPings }; // Trigger reactivity
                    }
                })()
            );
        }

        await Promise.allSettled(pingsToRun);
        console.log("[ProfileWorlds] All server pings finished.");
    }

    // --- Launching ---
    function launchItem(item: DisplayItem) {
        if (!profileId) return;
        if (item.type === 'world') {
            console.log(`[ProfileWorlds] Dispatching launch for world: ${item.folder_name}`);
            dispatch('launch', { profileId, quickPlaySingleplayer: item.folder_name });
        } else if (item.type === 'server' && item.address) {
            console.log(`[ProfileWorlds] Dispatching launch for server: ${item.address}`);
            dispatch('launch', { profileId, quickPlayMultiplayer: item.address });
        } else {
             console.warn("[ProfileWorlds] Cannot launch item:", item);
        }
    }

    // --- World Copying --- 
    function openCopyDialog(world: WorldInfo) {
        console.log(`[ProfileWorlds] Opening copy dialog for world: ${world.folder_name}`);
        worldToCopy = world;
        showCopyDialog = true;
    }

    // Event handler for the dialog confirmation
    async function handleCopyConfirm(event: CustomEvent<{ 
        sourceProfileId: string; 
        sourceWorldFolder: string; 
        targetProfileId: string; 
        targetWorldName: string; 
    }>) { 
        // Directly use event.detail which has the correct shape
        const paramsToInvoke = {
            source_profile_id: event.detail.sourceProfileId, 
            source_world_folder: event.detail.sourceWorldFolder, 
            target_profile_id: event.detail.targetProfileId, 
            target_world_name: event.detail.targetWorldName, 
        };

        error = null;
        copyLoading = true;
        try {
            console.log('[ProfileWorlds] Calling copy_world with params:', paramsToInvoke);
            
            const newFolderName: string = await invoke('copy_world', { 
                params: paramsToInvoke // Pass the mapped object
             });

            console.log('[ProfileWorlds] World copied successfully, new folder:', newFolderName);
            // Use event.detail for the user-facing names in the notification
            notificationStore.success(`World '${event.detail.sourceWorldFolder}' copied successfully as '${event.detail.targetWorldName}'!`);
            
            // Optionally refresh data if copying to the *current* profile
            if (event.detail.targetProfileId === profileId) {
                await loadData(); // Changed from loadData()
            }
            
            handleCopyClose(); // Close the dialog on success
        } catch (err) {
            console.error('[ProfileWorlds] Failed to copy world:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to copy world: ${errorMessage}`);
            // Keep dialog open on error? Or add error display to dialog? For now, just notify.
             // Optionally: Set an error message in the dialog if it remains open
             // error = `Failed to copy world: ${errorMessage}`; // This error is for the main component, maybe pass it to dialog?
        } finally {
            copyLoading = false;
        }
    }

    function handleCopyClose() {
        showCopyDialog = false;
        worldToCopy = null;
        copyLoading = false; // Reset loading state if dialog is closed prematurely
    }

    // --- World Deletion ---
    async function handleDeleteWorld(world: WorldInfo) {
        if (!profileId) return;

        const confirmation = window.confirm(
            `Are you sure you want to permanently delete the world "${getWorldDisplayName(world)}"? This action cannot be undone.`
        );

        if (!confirmation) {
            console.log("[ProfileWorlds] World deletion cancelled by user.");
            return;
        }

        console.log(`[ProfileWorlds] Attempting to delete world: ${world.folder_name}`);
        deleteLoading[world.folder_name] = true;
        deleteLoading = { ...deleteLoading }; // Trigger reactivity

        try {
            await invoke('delete_world', { profileId, worldFolder: world.folder_name });
            notificationStore.success(`World "${getWorldDisplayName(world)}" deleted successfully.`);
            // Reload data to reflect the deletion
            await loadData(); 
        } catch (err) {
            console.error("World deletion failed:", err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to delete world: ${errorMsg}`);
        } finally {
             delete deleteLoading[world.folder_name]; // Remove specific loading state
             deleteLoading = { ...deleteLoading }; // Trigger reactivity
        }
    }

    // --- Lifecycle and Helpers ---
    $effect(() => {
        loadData();
        // Cleanup function for $effect, if needed (e.g., abort controllers)
        // return () => { /* cleanup logic */ };
    });

    function getWorldDisplayName(world: WorldInfo): string {
        return world.display_name || world.folder_name;
    }

    function getWorldIconSrc(world: WorldInfo): string | null {
         if (world.icon_path) {
            try {
                return convertFileSrc(world.icon_path);
            } catch (error) {
                console.error(`Failed to convert icon path for world ${world.folder_name}:`, error);
                return null;
            }
        }
        return null;
    }

    function getServerDisplayName(server: ServerInfo): string {
        return server.name || server.address || 'Unnamed Server';
    }

    function getServerIconSrc(server: ServerInfo): string | null {
        if (server.icon_base64) {
            return server.icon_base64.startsWith('data:image') ? server.icon_base64 : `data:image/png;base64,${server.icon_base64}`;
        }
        return null;
    }

    function parseMotdToHtml(motd: any): string {
        if (!motd) return '<span style="color:#AAAAAA;">No description</span>'; // Return subtle text
        try {
            const html = motdParser.autoToHTML(motd);
            // Provide fallback styling if parser returns empty string for valid input
            return html || '<span style="color:#AAAAAA;">No description</span>';
        } catch (error) {
            console.error('Failed to parse MOTD:', error);
            if (typeof motd === 'string') return motdParser.cleanCodes(motd);
            try { return JSON.stringify(motd); } catch (e) { /* ignore */ }
            return '<span style="color:#dc3545;">Invalid MOTD format</span>'; // Error indication
        }
    }

</script>

<!-- Combined View -->
<div class="profile-play-options combined">
    <h4>
        Worlds & Servers 
        <!-- Refresh button only relevant for servers -->
        {#if servers.length > 0}
            <button 
                class="refresh-button" 
                onclick={pingAllServers} 
                disabled={pingingServers.size > 0}
                title="Refresh server status"
            >
                {#if pingingServers.size > 0} <span class="spinner"></span> {:else} 🔄 {/if}
            </button>
        {/if}
    </h4>

    {#if loading}
        <div class="loading-state">Loading worlds and servers...</div>
    {:else if error}
        <div class="error-state">{error}</div>
    {:else if displayItems.length === 0}
        <div class="empty-state">No worlds or servers found for this profile.</div>
    {:else}
        <ul class="item-list">
            {#each displayItems as item (item.type === 'world' ? item.folder_name : item.address || item.name || Math.random())}
                <li class="list-item" class:world-item={item.type === 'world'} class:server-item={item.type === 'server'}>
                    <!-- Icon Column -->
                    <div class="item-icon">
                        {#if item.type === 'world'}
                            {#if getWorldIconSrc(item)}
                                <img src={getWorldIconSrc(item)} alt="World icon" class="item-icon-img">
                            {:else}
                                <div class="default-icon world-default-icon">🌍</div>
                            {/if}
                        {:else if item.type === 'server'}
                             {#if getServerIconSrc(item)}
                                <img src={getServerIconSrc(item)} alt="Server icon" class="item-icon-img">
                            {:else}
                                <div class="default-icon server-default-icon">🌐</div>
                            {/if}
                        {/if}
                    </div>

                    <!-- Details Column -->
                    <div class="item-details">
                        {#if item.type === 'world'}
                            <span class="item-name">{getWorldDisplayName(item)}</span>
                            <span class="item-subtext">
                                {#if item.last_played} Last played: {timeAgo(item.last_played)} {:else} Never played {/if}
                            </span>
                        {:else if item.type === 'server'}
                            <span class="item-name">{getServerDisplayName(item)}</span>
                            <span class="item-subtext motd" title={serverPings[item.address || '']?.description || item.address || 'Address missing'}>
                                {#if item.address && pingingServers.has(item.address)}
                                    <span class="motd-loading">Pinging...</span>
                                {:else if item.address && serverPings[item.address]?.error}
                                    <span class="ping-error">Error: {serverPings[item.address]?.error}</span>
                                {:else if item.address && (serverPings[item.address]?.description || serverPings[item.address]?.description_json)}
                                     {@html parseMotdToHtml(serverPings[item.address]?.description_json || serverPings[item.address]?.description)}
                                {:else if item.address}
                                    {item.address} <!-- Show address if ping didn't return MOTD -->
                                {:else}
                                    Address missing
                                {/if}
                            </span>
                            <div class="server-status">
                                {#if item.address && !pingingServers.has(item.address) && serverPings[item.address] && !serverPings[item.address]?.error}
                                    <span class="player-count" title="Players Online">
                                        👥 {serverPings[item.address]?.players_online ?? '?'}/{serverPings[item.address]?.players_max ?? '?'}
                                    </span>
                                    <span class="latency" title="Ping Latency">
                                        📶 {serverPings[item.address]?.latency_ms ?? '?'} ms
                                    </span>
                                    {#if serverPings[item.address]?.version_name}
                                        <span class="version" title="Server Version">
                                            🏷️ {serverPings[item.address]?.version_name}
                                        </span>
                                    {/if}
                                {:else if item.address && pingingServers.has(item.address)}
                                    <span class="latency-loading">📶 Pinging...</span>
                                {:else if item.address && serverPings[item.address]?.error}
                                    <span class="latency-error">📶 Error</span>
                                {:else}
                                     <!-- Placeholder -->
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <!-- Button Column -->
                    <div class="item-actions">
                        {#if item.type === 'world'}
                            <!-- Add Copy Button for Worlds -->
                            <button 
                                class="action-button copy-button" 
                                onclick={() => openCopyDialog(item)}
                                title="Copy this world"
                                disabled={copyLoading} 
                            >
                                {#if copyLoading && worldToCopy?.folder_name === item.folder_name} <span class="spinner small"></span> {:else} 📋 {/if} <!-- Copy icon -->
                            </button>
                             <!-- Delete Button for Worlds -->
                            <button 
                                class="action-button delete-button" 
                                onclick={() => handleDeleteWorld(item)}
                                title="Delete this world permanently"
                                disabled={deleteLoading[item.folder_name]}
                            >
                                {#if deleteLoading[item.folder_name]} <span class="spinner small"></span> {:else} 🗑️ {/if} <!-- Delete icon -->
                            </button>
                        {/if}
                        <button
                            class="launch-button"
                            class:world-launch-button={item.type === 'world'}
                            class:server-join-button={item.type === 'server'}
                            onclick={() => launchItem(item)}
                            disabled={item.type === 'server' && !item.address}
                            title={item.type === 'world' ? 'Launch into this world' : (item.address ? 'Join this server' : 'Cannot join: Address missing')}
                        >
                            ▶ {item.type === 'world' ? 'Play' : 'Join'}
                        </button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<!-- Render the Dialog -->
{#if profileId && worldToCopy}
    <CopyWorldDialog 
        bind:isOpen={showCopyDialog} 
        sourceProfileId={profileId} 
        sourceWorldFolder={worldToCopy.folder_name} 
        on:confirm={handleCopyConfirm} 
        on:close={handleCopyClose}
    />
{/if}

<style>
    /* Remove specific section styles if they exist */
    /* .profile-worlds-section, .profile-servers-section { ... } */

    .profile-play-options.combined {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
    }

    h4 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #343a40;
        border-bottom: 1px solid #dee2e6;
        padding-bottom: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .loading-state, .error-state, .empty-state {
        padding: 1rem;
        text-align: center;
        color: #6c757d;
        font-style: italic;
        background-color: #fff;
        border: 1px dashed #ced4da;
        border-radius: 4px;
        margin-top: auto;
        margin-bottom: auto;
    }

    .error-state {
        color: #dc3545;
        background-color: #f8d7da;
        border-color: #f5c6cb;
    }

    .item-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
        max-height: 450px; /* Adjusted max height */
    }

    .list-item {
        display: flex;
        align-items: flex-start; /* Align items top for better layout with multi-line MOTD */
        gap: 1rem;
        padding: 0.75rem;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        transition: background-color 0.2s ease-in-out;
    }

    .list-item:hover {
        background-color: #f1f3f5;
    }

    .item-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .item-icon-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        image-rendering: pixelated;
    }

    .default-icon {
        font-size: 24px;
        color: #adb5bd;
    }

    .item-details {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-width: 0; 
        padding-top: 0.1rem; /* Small padding adjustment */
        padding-bottom: 0.1rem;
    }

    .item-name {
        font-weight: 500;
        color: #212529;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-subtext {
        font-size: 0.85rem;
        color: #6c757d;
        margin-top: 0.2rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-subtext.motd {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical; 
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.3;
        min-height: 2.6em; 
    }
    
    .motd-loading {
        font-style: italic;
        color: #adb5bd;
    }

    /* Minecraft MOTD styling */
    :global(.item-subtext.motd span) {
        font-family: 'Minecraft', monospace, sans-serif !important;
        line-height: 1.2;
        /* Prevent user selection if needed */
        /* user-select: none; */ 
    }
    :global(.item-subtext.motd span[style*="color: #000000;"]) {
        text-shadow: 1px 1px 0px #555555; /* Make black text slightly more visible */
    }
    /* Add other specific style adjustments for MOTD if needed */

    .ping-error {
        color: #dc3545;
        font-style: italic;
        font-size: 0.9em;
    }

    .server-status {
        display: flex;
        flex-wrap: wrap; /* Allow wrapping if space is tight */
        gap: 0.5rem 1rem; /* Row and column gap */
        font-size: 0.8rem;
        color: #6c757d;
        margin-top: 0.3rem;
        align-items: center;
    }

    .player-count,
    .latency,
    .version,
    .latency-loading,
    .latency-error {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        white-space: nowrap; /* Prevent wrapping within status items */
    }

    .latency-error {
        color: #dc3545;
    }

    .latency-loading {
        font-style: italic;
    }

    .launch-button {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        white-space: nowrap;
        margin-left: auto; 
        flex-shrink: 0; /* Prevent button from shrinking */
    }

    .world-launch-button,
    .server-join-button {
         background-color: #28a745;
    }

    .world-launch-button:hover,
    .server-join-button:hover {
        background-color: #218838;
    }

    .launch-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
        opacity: 0.7;
    }

    /* Refresh Button Styles */
    .refresh-button {
        padding: 0.2rem 0.5rem;
        font-size: 0.8rem;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        min-width: 28px; 
        min-height: 28px;
        flex-shrink: 0; /* Don't shrink */
    }

    .refresh-button:hover {
        background-color: #5a6268;
    }

    .refresh-button:disabled {
        background-color: #adb5bd;
        cursor: not-allowed;
        opacity: 0.6;
    }

    .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .item-actions { /* New container for buttons */
        margin-left: auto; 
        display: flex;
        align-items: center; /* Vertically align buttons */
        gap: 0.5rem; /* Space between buttons */
        flex-shrink: 0; 
        padding-top: 0.2rem; /* Align buttons better with world name */
    }
    
    .action-button {
        padding: 0.3rem 0.5rem;
        font-size: 0.9rem;
        background-color: #e9ecef;
        color: #495057;
        border: 1px solid #ced4da;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        line-height: 1; /* Ensure consistent height */
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .action-button:hover:not(:disabled) {
        background-color: #dee2e6;
    }

     .action-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .action-button .spinner.small {
        border-top-color: #495057; /* Spinner color for action buttons */
        border-left-color: rgba(73, 80, 87, 0.3);
        border-bottom-color: rgba(73, 80, 87, 0.3);
        border-right-color: rgba(73, 80, 87, 0.3);
    }

    .launch-button {
        /* Remove margin-left: auto */
    }

    /* Adjust motd height if needed */
    .item-subtext.motd {
         /* min-height: unset; Remove fixed height if causing issues */
    }

     /* Ensure spinner animation is defined */
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .spinner {
        /* ... ensure spinner styles exist ... */
    }
    .spinner.small {
        /* ... ensure small spinner styles exist ... */
    }

    .delete-button {
        color: #dc3545; /* Red color for delete */
    }

    .delete-button:hover:not(:disabled) {
        background-color: #f8d7da; /* Light red background on hover */
        border-color: #f5c6cb;
    }
</style> 