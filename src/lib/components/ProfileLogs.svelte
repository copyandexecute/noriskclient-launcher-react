<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import { onMount } from 'svelte';
    import { openUrl } from '@tauri-apps/plugin-opener';
    // Import clipboard manager for copy function
    import { writeText } from '@tauri-apps/plugin-clipboard-manager';

    // Props
    let { profileId } = $props<{ profileId: string }>();

    // Interface for parsed log line
    interface ParsedLogLine {
        id: number; // Unique ID for #each key
        raw: string; // Original raw line
        timestamp?: string;
        thread?: string;
        level?: string;
        text: string;
    }

    // Log levels for filtering
    const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;
    type LogLevel = typeof LOG_LEVELS[number];

    // State
    let logFiles = $state<string[]>([]);
    let selectedLogPath = $state<string | null>(null);
    // Store parsed lines instead of raw content
    let parsedLogLines = $state<ParsedLogLine[]>([]);
    let rawLogContentForCopy = $state<string | null>(null); // Keep raw content for copy/upload
    let isLoadingList = $state(false);
    let isLoadingContent = $state(false);
    let errorList = $state<string | null>(null);
    let errorContent = $state<string | null>(null);

    // Search State
    let searchTerm = $state('');
    // Level Filter State
    let levelFilters = $state<Record<LogLevel, boolean>>({
        ERROR: true,
        WARN: true,
        INFO: true,
        DEBUG: true,
        TRACE: true,
    });

    // Upload State
    let isUploading = $state(false);
    let uploadUrl = $state<string | null>(null);
    let uploadError = $state<string | null>(null);

    // Copy State
    let copied = $state(false);
    let copyTimeout: ReturnType<typeof setTimeout> | null = null;

    // State for the lines actually displayed after filtering
    let displayLines = $state<ParsedLogLine[]>([]);

    // Regex to parse typical Minecraft/Forge/Fabric log lines
    // Example: [15:30:00] [main/INFO]: Loading Minecraft 1.20.1
    const logLineRegex = /^\s*\[(\d{2}:\d{2}:\d{2})\]\s+\[([^\/]+)\/(.+?)\]:\s*(.*)$/;

    function parseLogLine(line: string, id: number): ParsedLogLine {
        const match = line.match(logLineRegex);
        if (match) {
            const level = match[3].toUpperCase() as LogLevel;
            return {
                id,
                raw: line,
                timestamp: match[1],
                thread: match[2],
                level: LOG_LEVELS.includes(level) ? level : undefined, // Only assign known levels
                text: match[4],
            };
        }
        // Default if no match (e.g., stack trace line)
        return {
            id,
            raw: line,
            text: line,
        };
    }

    function getLineStyle(level?: LogLevel): string {
        switch (level) {
            case 'ERROR':
                return 'color: #FF6B6B; font-weight: bold;'; // Red
            case 'WARN':
                return 'color: #FFA94D; font-weight: bold;'; // Orange
            case 'INFO':
                return 'color: #74C0FC;'; // Blue
            case 'DEBUG':
                return 'color: #99E9F2;'; // Cyan
            case 'TRACE':
                return 'color: #B197FC;'; // Purple
            default:
                return ''; // Default color (or maybe slightly dimmed?)
        }
    }

    async function loadLogFiles() {
        if (!profileId) return;
        isLoadingList = true;
        errorList = null;
        logFiles = []; // Clear previous list
        selectedLogPath = null; // Reset selection
        parsedLogLines = []; // Clear parsed lines
        rawLogContentForCopy = null;
        uploadUrl = null; // Clear upload status
        uploadError = null;
        copied = false; // Reset copy status
        displayLines = []; // Also reset displayLines

        try {
            console.log(`[ProfileLogs] Fetching logs for profile: ${profileId}`);
            const paths = await invoke<string[]>('get_profile_log_files', { profileId });
            paths.sort((a, b) => {
                const aName = getFilename(a).toLowerCase();
                const bName = getFilename(b).toLowerCase();
                if (aName === 'latest.log') return -1;
                if (bName === 'latest.log') return 1;
                return bName.localeCompare(aName); 
            });
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
        uploadUrl = null; 
        uploadError = null;
        copied = false;
        searchTerm = ''; 
        parsedLogLines = []; // Clear previous content
        rawLogContentForCopy = null;
        displayLines = []; // Also reset displayLines

        if (!path) {
            errorContent = null;
            isLoadingContent = false;
            return;
        }

        isLoadingContent = true;
        errorContent = null;

        try {
            console.log(`[ProfileLogs] Fetching content for log: ${path}`);
            const rawContent = await invoke<string>('get_log_file_content', { logFilePath: path });
            rawLogContentForCopy = rawContent; // Store raw content
            // Parse the content into lines
            parsedLogLines = rawContent
                .split('\n')
                .map((line, index) => parseLogLine(line, index));
            console.log(`[ProfileLogs] Loaded and parsed ${parsedLogLines.length} lines for ${path}`);
        } catch (err) {
            console.error(`[ProfileLogs] Error fetching/parsing log content for ${path}:`, err);
            errorContent = err instanceof Error ? err.message : 'Failed to load log content';
        } finally {
            isLoadingContent = false;
        }
    }

    // Effect to manually calculate displayLines when dependencies change
    $effect(() => {
        // Capture dependencies for the effect
        const currentParsedLines = parsedLogLines;
        const currentSearchTerm = searchTerm;
        const currentLevelFilters = levelFilters;

        if (currentParsedLines.length === 0) {
            displayLines = [];
            return;
        }

        const searchLower = currentSearchTerm.toLowerCase().trim();
        const isSearchActive = searchLower !== '';
        const activeLevelFilters = Object.entries(currentLevelFilters)
            .filter(([, isActive]) => isActive)
            .map(([level]) => level as LogLevel);

        displayLines = currentParsedLines.filter(line => {
            const levelMatch = !line.level || activeLevelFilters.includes(line.level);
            if (!levelMatch) return false; 

            const searchMatch = isSearchActive ? line.raw.toLowerCase().includes(searchLower) : true;
            return searchMatch;
        });

        // Optional: Log the result of the effect
        // console.log(`[ProfileLogs $effect] Updated displayLines: ${displayLines.length} lines`);
    });

    // Upload the currently selected log content (use raw content)
    async function handleUploadLog() {
        if (!rawLogContentForCopy || !selectedLogPath) return;

        isUploading = true;
        uploadUrl = null;
        uploadError = null;

        try {
            console.log(`[ProfileLogs] Uploading log: ${getFilename(selectedLogPath)}`);
            const resultUrl = await invoke<string>('upload_log_to_mclogs_command', { logContent: rawLogContentForCopy });
            uploadUrl = resultUrl;
            console.log(`[ProfileLogs] Upload successful: ${resultUrl}`);
        } catch (err) {
            console.error(`[ProfileLogs] Error uploading log:`, err);
            uploadError = err instanceof Error ? err.message : 'Failed to upload log';
        } finally {
            isUploading = false;
        }
    }

     // Copy the currently selected log content (use raw content)
    async function handleCopyLog() {
        if (!rawLogContentForCopy) return;
        try {
            await writeText(rawLogContentForCopy);
            copied = true;
            if (copyTimeout) clearTimeout(copyTimeout);
            copyTimeout = setTimeout(() => { copied = false; }, 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('[ProfileLogs] Failed to copy log to clipboard:', err);
            // Optionally show an error to the user
        }
    }

    // Open the directory containing the first log file (which is the logs folder)
    async function handleOpenLogsFolder() {
        const path_to_open = logFiles.find(p => getFilename(p).toLowerCase() === 'latest.log') || logFiles[0];
        if (!path_to_open) {
            errorList = 'No log files found to determine folder path.';
            return;
        }
        try {
            console.log(`[ProfileLogs] Requesting to open directory for file: ${path_to_open}`);
            await invoke('open_file_directory', { filePath: path_to_open }); 
        } catch (err) {
            console.error('[ProfileLogs] Error opening logs folder:', err);
            errorList = err instanceof Error ? err.message : 'Failed to open logs folder';
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
        return path?.split(/[\/]/).pop() || path || '' ;
    }

    // Helper to open the URL using the opener plugin
    async function handleOpenUrl(url: string | null) {
        if (!url) return;
        try {
            await openUrl(url);
        } catch (err) {
            console.error(`[ProfileLogs] Failed to open URL ${url}:`, err);
        }
    }
</script>

<div class="profile-logs-section">
    <div class="logs-header">
        <h4>Logs</h4>
        <button class="open-folder-btn" on:click={handleOpenLogsFolder} title="Open Logs Folder" disabled={logFiles.length === 0}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8"/><path d="m18 3 4 4-4 4"/><path d="M10 12H4"/><path d="m14 3 4 4-4 4"/></svg>
            Open Folder
        </button>
    </div>

    {#if isLoadingList}
        <p>Loading logs...</p>
    {:else if errorList}
        <p class="error-message">Error loading logs: {errorList}</p>
    {:else if logFiles.length > 0}
        <div class="log-controls">
            <div class="log-selector">
                <label for="log-select-{profileId}">Select Log:</label>
                <select 
                    id="log-select-{profileId}" 
                    value={selectedLogPath ?? ''} 
                    on:change={(e) => loadLogContent((e.target as HTMLSelectElement).value || null)}
                    disabled={isLoadingList}
                >
                    <option value="">-- Select a log file --</option>
                    {#each logFiles as path (path)}
                        <option value={path}>{getFilename(path)}</option>
                    {/each}
                </select>
            </div>
            
            {#if selectedLogPath}
                 <button 
                     class="copy-btn" 
                     on:click={handleCopyLog} 
                     disabled={!rawLogContentForCopy || isLoadingContent}
                     title="Copy full log content to clipboard"
                     data-copied={copied}
                 >
                     {#if copied}
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                         Copied!
                     {:else}
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                         Copy Log
                     {/if}
                 </button>

                <div class="upload-section">
                     <button 
                        class="upload-btn" 
                        on:click={handleUploadLog} 
                        disabled={!rawLogContentForCopy || isLoadingContent || isUploading}
                        title="Upload selected log to mclo.gs"
                    >
                         {#if isUploading}
                             Uploading...
                         {:else}
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                             Upload Log
                         {/if}
                     </button>
                     {#if uploadUrl}
                         <div class="upload-result success">
                             Uploaded: <a href={uploadUrl} target="_blank" on:click|preventDefault={() => handleOpenUrl(uploadUrl)}>{uploadUrl}</a>
                         </div>
                     {/if}
                     {#if uploadError}
                         <div class="upload-result error" title={uploadError}>Upload failed!</div>
                     {/if}
                 </div>
            {/if}
        </div>
        
        <!-- Filter Controls -->
        {#if parsedLogLines.length > 0}
             <div class="filter-controls">
                 <div class="search-section">
                    <input 
                        type="text" 
                        placeholder="Filter lines..." 
                        bind:value={searchTerm} 
                        disabled={isLoadingContent}
                    />
                 </div>
                 <div class="level-filter-section">
                    <span>Levels:</span>
                    {#each LOG_LEVELS as level (level)}
                        <label class="level-checkbox {level.toLowerCase()}">
                            <input type="checkbox" bind:checked={levelFilters[level]} />
                            {level}
                        </label>
                    {/each}
                 </div>
             </div>
        {/if}

        {#if selectedLogPath}
            <div class="log-content-viewer">
                {#if isLoadingContent}
                    <p>Loading content...</p>
                {:else if errorContent}
                    <p class="error-message">Error loading content: {errorContent}</p>
                {:else if parsedLogLines.length === 0 && !isLoadingContent}
                    <p><i>Log file appears empty or contains no parsable lines.</i></p>
                {:else if displayLines.length === 0 && (searchTerm.trim() || !Object.values(levelFilters).every(v => v))}
                    <p><i>No lines match the current filters.</i></p>
                {:else if displayLines.length > 0}
                     <div class="log-lines">
                         {#each displayLines as line (line.id)} 
                             <div class="log-line">
                                 {#if line.timestamp}
                                     <span class="log-meta timestamp">[{line.timestamp}]</span>
                                     <span class="log-meta thread">[{line.thread}/{line.level ?? '-'}]</span>
                                     <span class="log-text" style={getLineStyle(line.level)}>{line.text}</span>
                                 {:else}
                                     <span class="log-text fallback" style={getLineStyle(line.level)}>{line.text}</span>
                                 {/if}
                             </div>
                         {/each}
                     </div>
                 {:else if parsedLogLines.length > 0 && displayLines.length === 0}
                     <p><i>No lines match the current filters.</i></p>
                 {:else}
                     <p><i>Unable to display log content.</i></p>
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
        font-size: 0.9rem; /* Slightly smaller base font for the section */
    }

    .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .profile-logs-section h4 {
        margin: 0;
        font-size: 1.1em;
    }

    .open-folder-btn,
    .copy-btn,
    .upload-btn {
        padding: 4px 8px;
        font-size: 0.9em;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid #ccc;
        background-color: #f0f0f0;
    }
    .open-folder-btn:disabled,
    .copy-btn:disabled,
    .upload-btn:disabled {
        background-color: #e9ecef;
        color: #adb5bd;
        cursor: not-allowed;
        border-color: #ced4da;
    }
    .open-folder-btn:hover:not(:disabled),
    .copy-btn:hover:not(:disabled):not([data-copied="true"]) {
        background-color: #e0e0e0;
    }
    .open-folder-btn svg,
    .copy-btn svg,
    .upload-btn svg {
        width: 14px; 
        height: 14px;
    }
    .upload-btn {
         background-color: #3498db;
         color: white;
         border: none;
    }
     .upload-btn:hover:not(:disabled) {
        background-color: #2980b9;
    }
    .copy-btn {
         background-color: #95a5a6;
         color: white;
         border: none;
    }
     .copy-btn:hover:not(:disabled):not([data-copied="true"]) {
        background-color: #7f8c8d;
    }
    .copy-btn:disabled:not([data-copied="true"]) {
         background-color: #bdc3c7;
    }
    .copy-btn[data-copied="true"] {
        background-color: #2ecc71; 
    }
    
    .log-controls {
        display: flex;
        flex-wrap: wrap; 
        gap: 1rem;
        margin-bottom: 1rem;
        align-items: center;
    }

    .log-selector label {
        margin-right: 0.5rem;
    }

    .log-selector select {
        padding: 5px;
        border-radius: 4px;
        border: 1px solid #ccc;
        max-width: 300px;
        min-width: 200px; 
        font-size: 0.9em;
    }

    .filter-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        align-items: center;
    }
    
    .search-section input {
        padding: 5px 8px;
        border-radius: 4px;
        border: 1px solid #ccc;
        min-width: 180px;
        font-size: 0.9em;
    }

    .level-filter-section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
    .level-filter-section span {
        font-weight: 500;
        margin-right: 0.25rem;
    }

    .level-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.85em;
        border: 1px solid transparent;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .level-checkbox input {
        margin: 0;
        cursor: pointer;
    }
    /* Style checkboxes based on level */
    .level-checkbox.error { border-color: #FF6B6B; background-color: #FFE3E3; }
    .level-checkbox.warn { border-color: #FFA94D; background-color: #FFF3E0; }
    .level-checkbox.info { border-color: #74C0FC; background-color: #E3F2FD; }
    .level-checkbox.debug { border-color: #99E9F2; background-color: #E0FCFF; }
    .level-checkbox.trace { border-color: #B197FC; background-color: #F3E8FF; }


    .upload-section {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .upload-result {
        font-size: 0.9em;
        margin-left: 5px;
    }
    .upload-result.success a {
        color: #2ecc71;
        text-decoration: underline;
        cursor: pointer; 
    }
     .upload-result.error {
        color: #e74c3c;
        font-style: italic;
        cursor: help;
    }

    /* Update log content viewer styles */
    .log-content-viewer {
        background-color: #2B2B2B; /* Dark background */
        color: #A9B7C6; /* Default light text */
        font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 10px;
        max-height: 500px; /* Increased height */
        overflow: auto;
        font-size: 0.85em; /* Slightly smaller font */
        white-space: pre; /* Prevent default wrapping, rely on overflow */
        color-scheme: dark; /* Hint for scrollbars */
    }
    
    .log-lines {
        display: flex;
        flex-direction: column;
    }

    .log-line {
        display: flex;
        flex-wrap: nowrap; /* Keep parts on one line */
    }

    .log-meta {
        flex-shrink: 0; /* Prevent meta info from shrinking */
        margin-right: 0.5em;
        color: #6B8EAE; /* Dim color for meta */
        white-space: pre; /* Ensure spacing is kept */
    }

    .log-meta.timestamp {
         color: #6A8759; /* Greenish for timestamp */
    }
    
    .log-meta.thread {
        color: #8A8A8A; /* Grey for thread/level prefix */
    }

    .log-text {
        /* Let text take remaining space and wrap if needed (though pre prevents it now) */
        /* word-wrap: break-word; */ 
        white-space: pre-wrap; /* Allow wrapping within the text part if needed */
        flex-grow: 1; 
    }
    
    .log-text.fallback {
        color: #A9B7C6; /* Default text color for non-parsed lines */
        padding-left: 1em; /* Indent fallback lines slightly */
    }

    .error-message {
        color: #e74c3c;
        background-color: #fbeae8;
        padding: 5px 8px;
        border-radius: 4px;
        font-size: 0.9em;
    }
</style> 