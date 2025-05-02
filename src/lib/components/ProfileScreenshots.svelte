<script lang="ts">
    import { onMount } from 'svelte';
    import { invoke } from '@tauri-apps/api/core';
    import { convertFileSrc } from '@tauri-apps/api/core';
    import { Image } from '@tauri-apps/api/image'; // Import Tauri Image
    import type { ScreenshotInfo } from '$lib/types/profile';
    import { writeText, writeImage } from '@tauri-apps/plugin-clipboard-manager';
    import { notificationStore } from '$lib/stores/notificationStore'; // For feedback

    let { profileId } = $props<{ profileId: string }>();

    let screenshots = $state<ScreenshotInfo[]>([]);
    let displayScreenshots = $state<ScreenshotInfo[]>([]);
    let loading = $state(false);
    let error = $state<string | null>(null);
    let sortOrder = $state<'asc' | 'desc'>('desc'); // Default: newest first
    let deleting = $state<Record<string, boolean>>({}); // Track deletion loading state per path
    let copyingImage = $state<Record<string, boolean>>({}); // State for image copy loading

    $effect(() => {
        console.log("Effect triggered: Sorting screenshots");
        const sorted = [...screenshots];
        sorted.sort((a, b) => {
            const dateA = a.modified ? new Date(a.modified).getTime() : 0;
            const dateB = b.modified ? new Date(b.modified).getTime() : 0;
            const timeA = isNaN(dateA) ? (sortOrder === 'desc' ? -Infinity : Infinity) : dateA;
            const timeB = isNaN(dateB) ? (sortOrder === 'desc' ? -Infinity : Infinity) : dateB;
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
        displayScreenshots = sorted;
    });

    async function fetchScreenshots() {
        if (!profileId) return;
        loading = true;
        error = null;
        screenshots = [];

        try {
            console.log(`Fetching screenshots for profile: ${profileId}`);
            const result = await invoke<ScreenshotInfo[]>('list_profile_screenshots', { profileId });
            screenshots = result;
            console.log(`Found ${result.length} screenshots.`);
        } catch (err) {
            console.error('Error fetching screenshots:', err);
            error = err instanceof Error ? err.message : String(err);
            screenshots = [];
        } finally {
            loading = false;
        }
    }

    async function openScreenshot(path: string) {
        try {
            await invoke('open_file', { filePath: path });
        } catch (err) {
            console.error(`Failed to open screenshot ${path}:`, err);
            error = `Failed to open screenshot: ${err instanceof Error ? err.message : String(err)}`;
            notificationStore.error(`Failed to open: ${error}`);
        }
    }

    async function deleteScreenshot(path: string, filename: string) {
        if (deleting[path]) return; // Prevent double clicks

        const confirmation = window.confirm(
            `Are you sure you want to permanently delete the screenshot "${filename}"?`
        );
        if (!confirmation) return;

        deleting[path] = true;
        deleting = {...deleting}; // Trigger reactivity

        try {
            await invoke('delete_file', { filePath: path });
            notificationStore.success(`Screenshot "${filename}" deleted.`);
            // Refresh the list after deletion
            await fetchScreenshots(); 
        } catch (err) {
            console.error(`Failed to delete screenshot ${path}:`, err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to delete: ${errorMsg}`);
        } finally {
            delete deleting[path];
            deleting = {...deleting}; // Trigger reactivity
        }
    }

    async function openScreenshotDirectory(path: string) {
        try {
            await invoke('open_file_directory', { filePath: path });
        } catch (err) {
            console.error(`Failed to open directory for ${path}:`, err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to open folder: ${errorMsg}`);
        }
    }

    async function copyScreenshotPath(path: string) {
        try {
            await writeText(path);
            notificationStore.info('Path copied to clipboard!');
        } catch (err) {
            console.error(`Failed to copy path ${path}:`, err);
             const errorMsg = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to copy path: ${errorMsg}`);
        }
    }

    async function copyScreenshotImage(path: string) {
        if (copyingImage[path]) return;
        copyingImage[path] = true;
        copyingImage = {...copyingImage};

        try {
            // Call the backend command to get the RAW encoded image bytes
            const rawImageBytes = await invoke<number[]>('read_file_bytes', { filePath: path });
            
            // Convert number[] to Uint8Array for fromBytes
            const imageBuffer = Uint8Array.from(rawImageBytes);

            // Create a Tauri Image object from the raw encoded bytes
            // This lets Tauri decode the image (requires image-png feature)
            const tauriImage = await Image.fromBytes(imageBuffer); 

            // Write the resolved Tauri Image object to the clipboard
            await writeImage(tauriImage); 
            notificationStore.info('Screenshot image copied to clipboard!');
        } catch (err) {
            console.error(`Failed to copy image data for ${path}:`, err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            notificationStore.error(`Failed to copy image: ${errorMsg}`);
        } finally {
            delete copyingImage[path];
            copyingImage = {...copyingImage};
        }
    }

    onMount(() => {
        fetchScreenshots();
    });

    function formatDateTime(dateString: string | null): string {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    }

    function toggleSortOrder() {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
</script>

<div class="screenshots-section">
    <div class="screenshots-header">
        <h4>Screenshots:</h4>
        {#if displayScreenshots.length > 0}
            <button 
                class="sort-button action-button"
                on:click={toggleSortOrder}
                title="Sort by date {sortOrder === 'desc' ? 'oldest first' : 'newest first'}"
            >
                Sort ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
                {sortOrder === 'desc' ? '▼' : '▲'}
            </button>
        {/if}
    </div>

    {#if loading}
        <p class="loading-text">Loading screenshots...</p>
    {:else if error}
        <p class="error-message small">Error loading screenshots: {error}</p>
    {:else if displayScreenshots.length > 0}
        <ul class="screenshots-list">
            {#each displayScreenshots as screenshot (screenshot.path)}
                <li class="screenshot-item">
                    <img 
                        src={convertFileSrc(screenshot.path)} 
                        alt="Screenshot preview" 
                        class="screenshot-preview"
                        loading="lazy"
                        title="Click image to open screenshot"
                        on:click={() => openScreenshot(screenshot.path)} 
                        role="button" 
                        tabindex="0" 
                        on:keypress={(e) => { if (e.key === 'Enter' || e.key === ' ') openScreenshot(screenshot.path); }}
                    />
                    <div class="screenshot-info">
                        <div class="screenshot-details">
                            <span 
                                class="screenshot-filename" 
                                title="{screenshot.filename}\nClick to open screenshot"
                                on:click={() => openScreenshot(screenshot.path)}
                                role="button"
                                tabindex="0"
                                on:keypress={(e) => { if (e.key === 'Enter' || e.key === ' ') openScreenshot(screenshot.path); }}
                            >
                                {screenshot.filename}
                            </span>
                            <span class="screenshot-modified">{formatDateTime(screenshot.modified)}</span>
                        </div>
                        <div class="screenshot-actions">
                            <button 
                                class="action-button copy-image-button"
                                title="Copy image to clipboard"
                                on:click={() => copyScreenshotImage(screenshot.path)}
                                disabled={copyingImage[screenshot.path]}
                            >
                                {#if copyingImage[screenshot.path]} <span class="spinner small"></span> {:else} 🖼️ {/if}
                            </button>
                            <button 
                                class="action-button copy-path-button"
                                title="Copy file path"
                                on:click={() => copyScreenshotPath(screenshot.path)}
                            >📋</button>
                            <button 
                                class="action-button open-dir-button"
                                title="Open containing folder"
                                on:click={() => openScreenshotDirectory(screenshot.path)}
                            >📁</button>
                             <button 
                                class="action-button delete-button"
                                title="Delete screenshot"
                                on:click={() => deleteScreenshot(screenshot.path, screenshot.filename)}
                                disabled={deleting[screenshot.path]}
                            >
                                {#if deleting[screenshot.path]} <span class="spinner small"></span> {:else} 🗑️ {/if}
                            </button>
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {:else}
        <p class="no-screenshots">No screenshots found for this profile.</p>
    {/if}
</div>

<style>
    .screenshots-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #ddd;
    }

    .screenshots-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.8em;
    }

    .screenshots-header h4 {
        margin: 0;
        font-size: 1em;
        color: #333;
    }

    .screenshots-list {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 350px;
        overflow-y: auto;
        padding-right: 5px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
    }

    .screenshot-item {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
        border: 1px solid #eee;
        border-radius: 5px;
        background-color: #fdfdfd;
        transition: box-shadow 0.2s ease-in-out;
        overflow: hidden;
    }

    .screenshot-item:hover {
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .screenshot-preview {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border: none;
        border-radius: 5px 5px 0 0;
        cursor: pointer;
        transition: opacity 0.2s ease-in-out;
        display: block;
    }
    .screenshot-preview:hover {
        opacity: 0.85;
    }

    .screenshot-info {
        padding: 0.5rem 0.7rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .screenshot-details {
        display: flex;
        flex-direction: column;
        font-size: 0.85em;
        text-align: left;
        overflow: hidden;
        flex-grow: 1;
    }

    .screenshot-filename {
        font-weight: 500;
        color: #333;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.2em;
        display: block;
        transition: color 0.2s;
    }
    .screenshot-filename:hover {
        color: var(--link-color, #007bff);
    }

    .screenshot-modified {
        color: #666;
        font-size: 0.9em;
    }

    .screenshot-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.4rem;
        margin-top: auto;
    }

    .action-button {
        padding: 0.2rem 0.4rem;
        font-size: 0.9em;
        background-color: #eee;
        color: #333;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        min-height: 26px;
    }
    .action-button:hover:not(:disabled) {
        background-color: #ddd;
    }
    .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .delete-button {
        color: #e74c3c;
    }
    .delete-button:hover:not(:disabled) {
        background-color: #fbeae8;
        border-color: #e74c3c;
    }

    .sort-button {
        padding: 0.3rem 0.6rem;
        font-size: 0.85em;
        margin-left: auto;
    }

    .loading-text,
    .no-screenshots {
        font-style: italic;
        color: #666;
        font-size: 0.9em;
        text-align: center;
        padding: 1rem;
    }

    .error-message.small {
        font-size: 0.9em;
        color: #e74c3c;
        background-color: #fbeae8;
        padding: 5px 8px;
        border-radius: 4px;
        text-align: center;
    }

    .spinner {
        display: inline-block;
        border-radius: 50%;
        animation: spin 1s ease-infinite;
        vertical-align: middle;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #666;
    }
    .spinner.small {
        width: 12px;
        height: 12px;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style> 