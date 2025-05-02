<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import { convertFileSrc } from '@tauri-apps/api/core';
    // Removed onMount, onDestroy as $effect handles lifecycle
    import type { WorldInfo, ServerInfo } from '$lib/types/minecraft'; // Added ServerInfo
    import { createEventDispatcher } from 'svelte';
    import { timeAgo } from '$lib/utils/timeUtils'; // Make sure this path and helper exist

    // Props
    let { profileId = null } = $props<{ profileId?: string | null }>();

    // State for Worlds
    let worlds = $state<WorldInfo[]>([]);
    let worldsLoading = $state(false);
    let worldsError = $state<string | null>(null);

    // State for Servers
    let servers = $state<ServerInfo[]>([]);
    let serversLoading = $state(false);
    let serversError = $state<string | null>(null);

    // Event dispatcher for launching
    const dispatch = createEventDispatcher<{
        launch: {
            profileId: string;
            quickPlaySingleplayer?: string; // Optional
            quickPlayMultiplayer?: string;  // Optional
        }
    }>();

    async function loadData() {
        if (!profileId) {
            worlds = [];
            servers = [];
            worldsError = null;
            serversError = null;
            worldsLoading = false;
            serversLoading = false;
            return;
        }

        console.log(`[ProfileWorlds] Loading data for profile: ${profileId}`);
        
        // Reset states
        worlds = [];
        servers = [];
        worldsError = null;
        serversError = null;
        worldsLoading = true;
        serversLoading = true;

        try {
            // Fetch worlds and servers concurrently
            const [worldsResult, serversResult] = await Promise.allSettled([
                invoke<WorldInfo[]>('get_worlds_for_profile', { profileId }),
                invoke<ServerInfo[]>('get_servers_for_profile', { profileId })
            ]);

            // Handle worlds result
            if (worldsResult.status === 'fulfilled') {
                worlds = worldsResult.value;
                console.log(`[ProfileWorlds] Loaded ${worlds.length} worlds`);
            } else {
                console.error('Failed to load worlds:', worldsResult.reason);
                worldsError = `Error loading worlds: ${worldsResult.reason instanceof Error ? worldsResult.reason.message : String(worldsResult.reason)}`;
            }

            // Handle servers result
            if (serversResult.status === 'fulfilled') {
                servers = serversResult.value;
                console.log(`[ProfileWorlds] Loaded ${servers.length} servers`);
            } else {
                console.error('Failed to load servers:', serversResult.reason);
                serversError = `Error loading servers: ${serversResult.reason instanceof Error ? serversResult.reason.message : String(serversResult.reason)}`;
            }

        } catch (err) {
            // This catch block might not be strictly necessary with Promise.allSettled
            // unless invoke itself throws synchronously before returning a promise
            console.error('Unexpected error during data loading:', err);
            worldsError = `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
            serversError = `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            worldsLoading = false;
            serversLoading = false;
        }
    }

    // Function to handle launching a world
    function launchWorld(world: WorldInfo) {
        if (!profileId) return;
        console.log(`[ProfileWorlds] Dispatching launch event for world: ${world.folder_name}`);
        dispatch('launch', {
            profileId: profileId,
            quickPlaySingleplayer: world.folder_name // Use folder name as the identifier
        });
    }

    // Function to handle joining a server
    function joinServer(server: ServerInfo) {
        if (!profileId || !server.address) return; // Need address to join
        console.log(`[ProfileWorlds] Dispatching launch event for server: ${server.address}`);
        dispatch('launch', {
            profileId: profileId,
            quickPlayMultiplayer: server.address
        });
    }

    // Load data when profileId changes
    $effect(() => {
        loadData();
    });

    // Helper to get a display name for worlds
    function getWorldDisplayName(world: WorldInfo): string {
        return world.display_name || world.folder_name;
    }

    // Helper to get icon using Tauri's asset protocol for worlds
    function getWorldIconSrc(world: WorldInfo): string | null {
        if (world.icon_path) { // Check if the string path exists
            try {
                // Convert the string path directly
                const url = convertFileSrc(world.icon_path);
                return url;
            } catch (error) {
                console.error(`Failed to convert icon path for world ${world.folder_name}:`, error);
                return null;
            }
        }
        return null;
    }

    // Helper to get a display name for servers
    function getServerDisplayName(server: ServerInfo): string {
        return server.name || server.address || 'Unnamed Server';
    }

    // Helper to get server icon (base64 data URI)
    function getServerIconSrc(server: ServerInfo): string | null {
        if (server.icon_base64) {
            // Ensure it doesn't already have the prefix
            if (server.icon_base64.startsWith('data:image')) {
                return server.icon_base64;
            }
            return `data:image/png;base64,${server.icon_base64}`;
        }
        return null;
    }

</script>

<div class="profile-play-options">

    <!-- Worlds Section -->
    <div class="profile-worlds-section">
        <h4>Singleplayer Worlds</h4>
        {#if worldsLoading}
            <div class="loading-state">Loading worlds...</div>
        {:else if worldsError}
            <div class="error-state">{worldsError}</div>
        {:else if worlds.length === 0}
            <div class="empty-state">No singleplayer worlds found in this profile's saves folder.</div>
        {:else}
            <ul class="item-list">
                {#each worlds as world (world.folder_name)}
                    <li class="list-item world-item">
                        <div class="item-icon">
                            {#if getWorldIconSrc(world)}
                                <img src={getWorldIconSrc(world)} alt="World icon" class="item-icon-img">
                            {:else}
                                <div class="default-icon world-default-icon">🌍</div> <!-- Default World Icon -->
                            {/if}
                        </div>
                        <div class="item-details">
                            <span class="item-name">{getWorldDisplayName(world)}</span>
                            <span class="item-subtext">
                                {#if world.last_played}
                                    Last played: {timeAgo(world.last_played)}
                                {:else}
                                    Never played
                                {/if}
                            </span>
                        </div>
                        <button
                            class="launch-button world-launch-button"
                            onclick={() => launchWorld(world)}
                            title="Launch into this world (Quick Play)"
                        >
                            ▶ Play
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <!-- Servers Section -->
    <div class="profile-servers-section">
        <h4>Multiplayer Servers</h4>
         {#if serversLoading}
            <div class="loading-state">Loading servers...</div>
        {:else if serversError}
            <div class="error-state">{serversError}</div>
        {:else if servers.length === 0}
            <div class="empty-state">No multiplayer servers found (servers.dat missing or empty).</div>
        {:else}
            <ul class="item-list">
                 {#each servers as server (server.address || server.name || Math.random())} 
                    <li class="list-item server-item">
                        <div class="item-icon">
                            {#if getServerIconSrc(server)}
                                <img src={getServerIconSrc(server)} alt="Server icon" class="item-icon-img">
                            {:else}
                                <div class="default-icon server-default-icon">🌐</div> <!-- Default Server Icon -->
                            {/if}
                        </div>
                        <div class="item-details">
                            <span class="item-name">{getServerDisplayName(server)}</span>
                            <span class="item-subtext">{server.address || 'Address missing'}</span>
                        </div>
                        <button
                            class="launch-button server-join-button"
                            onclick={() => joinServer(server)}
                            disabled={!server.address} 
                            title={server.address ? "Join this server (Quick Play)" : "Cannot join: Server address missing"}
                        >
                            ▶ Join
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

</div>

<style>
    .profile-play-options { /* Renamed outer container */
        margin-top: 1.5rem;
        display: flex; /* Arrange sections side-by-side */
        gap: 1.5rem; /* Space between sections */
        flex-wrap: wrap; /* Allow wrapping on smaller screens */
    }

    .profile-worlds-section,
    .profile-servers-section {
        flex: 1; /* Allow sections to grow */
        min-width: 300px; /* Minimum width before wrapping */
        padding: 1rem;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        display: flex;
        flex-direction: column; /* Stack title and list */
    }

    h4 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #343a40;
        border-bottom: 1px solid #dee2e6;
        padding-bottom: 0.5rem;
    }

    .loading-state, .error-state, .empty-state {
        padding: 1rem;
        text-align: center;
        color: #6c757d;
        font-style: italic;
        background-color: #fff;
        border: 1px dashed #ced4da;
        border-radius: 4px;
        margin-top: auto; /* Push to bottom if list is empty */
        margin-bottom: auto;
    }

    .error-state {
        color: #dc3545;
        background-color: #f8d7da;
        border-color: #f5c6cb;
    }

    .item-list { /* Generic list style */
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto; /* Allow scrolling if list is long */
        max-height: 400px; /* Example max height */
    }

    .list-item { /* Generic item style */
        display: flex;
        align-items: center;
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

    .item-icon { /* Generic icon container */
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
    
    .item-icon-img { /* Generic icon image */
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* Prevents blurry icons in some cases */
        image-rendering: pixelated; /* Or -webkit-optimize-contrast */
    }

    .default-icon { /* Generic default icon */
        font-size: 24px;
        color: #adb5bd;
    }

    .item-details { /* Generic details container */
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        /* Prevent text overflow */
        min-width: 0; 
    }

    .item-name { /* Generic name style */
        font-weight: 500;
        color: #212529;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-subtext { /* Generic subtext style */
        font-size: 0.85rem;
        color: #6c757d;
        margin-top: 0.2rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .launch-button { /* Generic button style */
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        white-space: nowrap;
        margin-left: auto; /* Push button to the right */
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
</style> 