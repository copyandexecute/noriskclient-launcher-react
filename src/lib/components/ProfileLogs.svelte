<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import { onMount } from 'svelte';

    // Props
    let { profileId } = $props<{ profileId: string }>();

    // State
    let logFiles = $state<string[]>([]);
    let selectedLogPath = $state<string | null>(null);
    let logContent = $state<string | null>(null);
    let isLoadingList = $state(false);
    let isLoadingContent = $state(false);
    let errorList = $state<string | null>(null);
    let errorContent = $state<string | null>(null);

    async function loadLogFiles() {
        if (!profileId) return;
        isLoadingList = true;
        errorList = null;
        logFiles = []; // Clear previous list
        selectedLogPath = null; // Reset selection
        logContent = null; // Clear content

        try {
            console.log(`[ProfileLogs] Fetching logs for profile: ${profileId}`);
            // Call the backend command to get log file paths
            const paths = await invoke<string[]>('get_profile_log_files', { profileId });
            logFiles = paths;
            console.log(`[ProfileLogs] Found ${paths.length} log files.`);
        } catch (err) {
            console.error('[ProfileLogs] Error fetching log files:', err);
            errorList = err instanceof Error ? err.message : 'Failed to load log files';
        } finally {
            isLoadingList = false;
        }
    }

    async function loadLogContent(path: string | null) {
        selectedLogPath = path;
        if (!path) {
            logContent = null;
            errorContent = null;
            isLoadingContent = false;
            return;
        }

        isLoadingContent = true;
        errorContent = null;
        logContent = null;

        try {
            console.log(`[ProfileLogs] Fetching content for log: ${path}`);
            // Call the backend command to get log content
            const content = await invoke<string>('get_log_file_content', { logFilePath: path });
            logContent = content;
            console.log(`[ProfileLogs] Loaded content for ${path} (${content.length} chars)`);
        } catch (err) {
            console.error(`[ProfileLogs] Error fetching log content for ${path}:`, err);
            errorContent = err instanceof Error ? err.message : 'Failed to load log content';
        } finally {
            isLoadingContent = false;
        }
    }

    // Load log files when profileId changes
    $effect(() => {
        if (profileId) {
            loadLogFiles();
        }
    });

    // Helper to get filename from path
    function getFilename(path: string): string {
        return path.split(/[\/]/).pop() || path;
    }
</script>

<div class="profile-logs-section">
    <h4>Logs</h4>

    {#if isLoadingList}
        <p>Loading logs...</p>
    {:else if errorList}
        <p class="error-message">Error loading logs: {errorList}</p>
    {:else if logFiles.length > 0}
        <div class="log-selector">
            <label for="log-select-{profileId}">Select Log:</label>
            <select 
                id="log-select-{profileId}" 
                value={selectedLogPath} 
                on:change={(e) => loadLogContent((e.target as HTMLSelectElement).value || null)}
            >
                <option value={null}>-- Select a log file --</option>
                {#each logFiles as path (path)}
                    <option value={path}>{getFilename(path)}</option>
                {/each}
            </select>
        </div>

        {#if selectedLogPath}
            <div class="log-content-viewer">
                <h5>Content of: {getFilename(selectedLogPath)}</h5>
                {#if isLoadingContent}
                    <p>Loading content...</p>
                {:else if errorContent}
                    <p class="error-message">Error loading content: {errorContent}</p>
                {:else if logContent !== null && logContent.length > 0}
                    <pre><code>{logContent}</code></pre>
                {:else if logContent !== null}
                     <p><i>Log file is empty.</i></p>
                {/if}
            </div>
        {/if}
    {:else}
        <p>No log files found for this profile.</p>
    {/if}
</div>

<style>
    .profile-logs-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
    }

    .profile-logs-section h4 {
        margin-bottom: 0.5rem;
        font-size: 1.1em;
    }
    
    .profile-logs-section h5 {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-size: 1em;
        color: #555;
    }

    .log-selector {
        margin-bottom: 1rem;
    }

    .log-selector label {
        margin-right: 0.5rem;
    }

    .log-selector select {
        padding: 5px;
        border-radius: 4px;
        border: 1px solid #ccc;
        max-width: 300px;
    }
    
    .log-content-viewer pre {
        background-color: #f8f8f8;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        max-height: 400px; /* Limit height and make scrollable */
        overflow: auto;
        white-space: pre-wrap; /* Allow wrapping */
        word-wrap: break-word; /* Break long lines */
        font-size: 0.9em;
        color: #333;
    }
    
    .log-content-viewer code {
        font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    }

    .error-message {
        color: #e74c3c;
        background-color: #fbeae8;
        padding: 5px 8px;
        border-radius: 4px;
        font-size: 0.9em;
    }
</style> 