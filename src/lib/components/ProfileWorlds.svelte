<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import { convertFileSrc } from '@tauri-apps/api/core';
    // Removed onMount, onDestroy as $effect handles lifecycle
    import type { WorldInfo } from '$lib/types/minecraft'; // Updated import path
    import { createEventDispatcher } from 'svelte';
    import { timeAgo } from '$lib/utils/timeUtils'; // Make sure this path and helper exist

    // Props
    let { profileId = null } = $props<{ profileId?: string | null }>();

    // State
    let worlds = $state<WorldInfo[]>([]);
    let loading = $state(false);
    let error = $state<string | null>(null);

    // Event dispatcher for launching
    const dispatch = createEventDispatcher<{
        launch: { 
            profileId: string; 
            quickPlaySingleplayer: string; 
        }
    }>();

    async function loadWorlds() {
        if (!profileId) {
            worlds = [];
            error = null;
            loading = false;
            return;
        }

        loading = true;
        error = null;
        console.log(`[ProfileWorlds] Loading worlds for profile: ${profileId}`);

        try {
            worlds = await invoke<WorldInfo[]>('get_worlds_for_profile', { profileId });
            console.log('[ProfileWorlds] Raw worlds data received:', JSON.stringify(worlds, null, 2));
            console.log(`[ProfileWorlds] Loaded ${worlds.length} worlds`);
        } catch (err) {
            console.error('Failed to load worlds:', err);
            error = `Error loading worlds: ${err instanceof Error ? err.message : String(err)}`;
            worlds = [];
        } finally {
            loading = false;
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

    // Load worlds when profileId changes
    $effect(() => {
        loadWorlds();
    });

    // Helper to get a display name
    function getWorldDisplayName(world: WorldInfo): string {
        return world.display_name || world.folder_name;
    }

    // Helper to get icon using Tauri's asset protocol
    function getIconSrc(world: WorldInfo): string | null {
        if (world.icon_path) { // Check if the string path exists
            try {
                // Convert the string path directly
                console.log(`[ProfileWorlds] Converting path: ${world.icon_path}`); // Log path being converted
                const url = convertFileSrc(world.icon_path);
                console.log(`[ProfileWorlds] Converted URL: ${url}`); // Log resulting URL
                return url;
            } catch (error) {
                console.error(`Failed to convert icon path for world ${world.folder_name}:`, error);
                return null;
            }
        }
        return null;
    }

</script>

<div class="profile-worlds">
    <h4>Singleplayer Worlds</h4>

    {#if loading}
        <div class="loading-state">Loading worlds...</div>
    {:else if error}
        <div class="error-state">{error}</div>
    {:else if worlds.length === 0}
        <div class="empty-state">No singleplayer worlds found in this profile's saves folder.</div>
    {:else}
        <ul class="world-list">
            {#each worlds as world (world.folder_name)}
                <li class="world-item">
                    <div class="world-icon">
                        {#if getIconSrc(world)}
                            <img src={getIconSrc(world)} alt="World icon" class="world-icon-img">
                        {:else}
                            <div class="default-icon">🌍</div> <!-- Default Globe Icon -->
                        {/if}
                    </div>
                    <div class="world-details">
                        <span class="world-name">{getWorldDisplayName(world)}</span>
                        <span class="last-played">
                            {#if world.last_played}
                                Last played: {timeAgo(world.last_played)}
                            {:else}
                                Never played
                            {/if}
                        </span>
                    </div>
                    <button 
                        class="launch-button" 
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

<style>
    .profile-worlds {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
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
    }

    .error-state {
        color: #dc3545;
        background-color: #f8d7da;
        border-color: #f5c6cb;
    }

    .world-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .world-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        transition: background-color 0.2s ease-in-out;
    }

    .world-item:hover {
        background-color: #f1f3f5;
    }

    .world-icon {
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
    
    .world-icon-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .default-icon {
        font-size: 24px;
        color: #adb5bd;
    }

    .world-details {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }

    .world-name {
        font-weight: 500;
        color: #212529;
    }

    .last-played {
        font-size: 0.85rem;
        color: #6c757d;
        margin-top: 0.2rem;
    }

    .launch-button {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        white-space: nowrap;
    }

    .launch-button:hover {
        background-color: #218838;
    }

    .launch-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style> 