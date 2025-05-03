<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import type { Profile } from '$lib/types/profile'; // Import Profile type
    import { createEventDispatcher } from 'svelte';

    // Props from parent
    let { isOpen = $bindable(), sourceProfileId = '', sourceWorldFolder = '' } = $props<{
        isOpen: boolean;
        sourceProfileId: string;
        sourceWorldFolder: string;
    }>();

    // Internal State
    let targetProfileId = $state(sourceProfileId); // Default to source profile
    let targetWorldName = $state(sourceWorldFolder); // Default new name to source name
    let availableProfiles = $state<Profile[]>([]);
    let loadingProfiles = $state(false);
    let error = $state<string | null>(null);
    let isSubmitting = $state(false);

    // Event Dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        confirm: { 
            sourceProfileId: string;
            sourceWorldFolder: string;
            targetProfileId: string; 
            targetWorldName: string; 
        };
    }>();

    // Load profiles when the dialog opens
    $effect(() => {
        if (isOpen) {
            loadAvailableProfiles();
            targetProfileId = sourceProfileId; // Reset target on open
            targetWorldName = sourceWorldFolder; // Reset name to source name on open
            error = null;
            isSubmitting = false;
        }
    });

    async function loadAvailableProfiles() {
        loadingProfiles = true;
        error = null;
        try {
            console.log('[CopyWorldDialog] Loading available profiles...');
            availableProfiles = await invoke<Profile[]>('list_profiles');
            console.log(`[CopyWorldDialog] Loaded ${availableProfiles.length} profiles.`);
             // Ensure the source profile ID is still selected if it exists
            if (!availableProfiles.some(p => p.id === targetProfileId)) {
                 targetProfileId = availableProfiles[0]?.id || ''; 
            }
        } catch (err) {
            console.error('[CopyWorldDialog] Failed to load profiles:', err);
            error = `Failed to load profiles: ${err instanceof Error ? err.message : String(err)}`;
            availableProfiles = [];
        } finally {
            loadingProfiles = false;
        }
    }

    function handleConfirm() {
        if (!targetProfileId || !targetWorldName.trim()) {
            error = "Please select a target profile and enter a world name.";
            return;
        }
        isSubmitting = true;
        error = null;
        
        dispatch('confirm', {
            sourceProfileId: sourceProfileId,
            sourceWorldFolder: sourceWorldFolder,
            targetProfileId: targetProfileId,
            targetWorldName: targetWorldName.trim(),
        });
        // Parent component will handle the actual API call and closing
    }

    function handleClose() {
        dispatch('close');
    }

    // Close on Escape key
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            handleClose();
        }
    }

</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="dialog-overlay" onclick={handleClose} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div class="dialog-content" onclick={(event) => event.stopPropagation()} onkeydown={handleKeydown}>
            <h2 id="dialog-title">Copy World '{sourceWorldFolder}'</h2>
            
            {#if error}
                <div class="error-message">{error}</div>
            {/if}

            <div class="form-group">
                <label for="target-profile">Copy to Profile:</label>
                {#if loadingProfiles}
                    <span>Loading profiles...</span>
                {:else}
                    <select id="target-profile" bind:value={targetProfileId} disabled={isSubmitting}>
                         {#each availableProfiles as profile (profile.id)}
                            <option value={profile.id}>{profile.name} ({profile.game_version} {profile.loader})</option>
                         {:else}
                            <option value="" disabled>No profiles available</option>
                         {/each}
                    </select>
                {/if}
            </div>

            <div class="form-group">
                <label for="target-world-name">New World Name:</label>
                <input 
                    type="text" 
                    id="target-world-name" 
                    bind:value={targetWorldName} 
                    placeholder="Enter name for the copied world"
                    required
                    disabled={isSubmitting}
                >
            </div>

            <div class="dialog-actions">
                <button class="button secondary" onclick={handleClose} disabled={isSubmitting}>Cancel</button>
                <button class="button primary" onclick={handleConfirm} disabled={isSubmitting || !targetProfileId || !targetWorldName.trim()}>
                    {#if isSubmitting}
                        <span class="spinner small"></span> Copying...
                    {:else}
                        Copy World
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .dialog-overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(3px);
    }

    .dialog-content {
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        width: 90%;
        max-width: 500px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #333;
        font-size: 1.4rem;
        word-break: break-all; /* Prevent long world names from breaking layout */
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    label {
        font-weight: 500;
        color: #555;
    }

    input[type="text"],
    select {
        padding: 0.6rem 0.8rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        width: 100%; 
        box-sizing: border-box;
    }

    input:focus, select:focus {
        outline: none;
        border-color: var(--primary-color, #007bff);
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
    }

    .button {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        transition: background-color 0.2s, opacity 0.2s;
        display: inline-flex; /* Align spinner */
        align-items: center;
        gap: 0.5rem;
    }

    .button.primary {
        background-color: var(--primary-color, #007bff);
        color: white;
    }
    .button.primary:hover:not(:disabled) {
        background-color: var(--primary-color-dark, #0056b3);
    }

    .button.secondary {
        background-color: #f1f3f5;
        color: #333;
        border: 1px solid #dee2e6;
    }
    .button.secondary:hover:not(:disabled) {
        background-color: #e9ecef;
    }

    .button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .error-message {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
        padding: 0.75rem 1rem;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .spinner.small {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

</style> 