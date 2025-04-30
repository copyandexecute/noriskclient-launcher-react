<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount, onDestroy } from 'svelte';
  import type { ResourcePackInfo, ShaderPackInfo } from '$lib/types/modrinth';
  import type { ModrinthProject } from '$lib/types/modrinth';

  // Properties
  let { profileId = null } = $props<{ profileId?: string | null }>();

  // Tab states
  let activeTab = $state<'mods' | 'resourcepacks' | 'shaderpacks'>('mods');
  

  // State
  let resourcePacks = $state<ResourcePackInfo[]>([]);
  let shaderPacks = $state<ShaderPackInfo[]>([]);
  let loadingResourcePacks = false;
  let loadingShaderPacks = false;
  let errorResourcePacks: string | null = null;
  let errorShaderPacks: string | null = null;
  let loadingOperation = false;
  
  // State for Modrinth project details
  let modrinthProjects = $state<Record<string, ModrinthProject>>({});
  let loadingModrinthProjects = $state(false);
  let modrinthProjectsError = $state<string | null>(null);
  
  // State for locally extracted icons (Base64)
  let localPackIcons = $state<Record<string, string>>({});
  let loadingLocalIcons = $state(false);
  let localIconsError = $state<string | null>(null);
  
  // Interval for auto-refresh
  let refreshInterval: number | null = null;
  
  // Load data based on active tab
  $effect(() => {
    console.log(`[ProfileContent] $effect triggered. profileId: ${profileId}, activeTab: ${activeTab}`);
    if (profileId && activeTab) {
      loadTabData(activeTab);
    }
  });

  // Format file size nicely
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Load data for the active tab
  async function loadTabData(tab: string) {
    console.log(`[ProfileContent] loadTabData called for tab: ${tab}, profileId: ${profileId}`);
    if (!profileId) {
      console.log('[ProfileContent] loadTabData aborted: profileId is null or undefined.');
      return;
    }

    if (tab === 'resourcepacks') {
      await loadResourcePacks();
    } else if (tab === 'shaderpacks') {
      await loadShaderPacks();
    }
  }

  // Load ResourcePacks for the current profile
  async function loadResourcePacks() {
    if (!profileId) return;
    
    loadingResourcePacks = true;
    errorResourcePacks = null;

    try {
      resourcePacks = await invoke<ResourcePackInfo[]>('get_local_resourcepacks', {
        profileId
      });
      console.log(`Loaded ${resourcePacks.length} resource packs`);
      
      // Fetch Modrinth project details for icons - MOVED to separate effect
      // await fetchModrinthProjectDetails();
    } catch (err) {
      console.error('Failed to load resource packs:', err);
      errorResourcePacks = `Error loading resource packs: ${err instanceof Error ? err.message : String(err)}`;
      resourcePacks = [];
    } finally {
      loadingResourcePacks = false;
    }
  }

  // Load ShaderPacks for the current profile
  async function loadShaderPacks() {
    if (!profileId) return;
    
    loadingShaderPacks = true;
    errorShaderPacks = null;

    try {
      shaderPacks = await invoke<ShaderPackInfo[]>('get_local_shaderpacks', {
        profileId
      });
      console.log(`Loaded ${shaderPacks.length} shader packs`);
      
      // Fetch Modrinth project details for icons - MOVED to separate effect
      // await fetchModrinthProjectDetails();
    } catch (err) {
      console.error('Failed to load shader packs:', err);
      errorShaderPacks = `Error loading shader packs: ${err instanceof Error ? err.message : String(err)}`;
      shaderPacks = [];
    } finally {
      loadingShaderPacks = false;
    }
  }

  // NEW: Effect to fetch Modrinth details AND local icons when packs change
  $effect(() => {
    // Combine packs for easier processing
    const allPacks = [...resourcePacks, ...shaderPacks];

    if (allPacks.length > 0) {
      console.log('[ProfileContent] Pack lists updated, fetching details/icons...');

      // 1. Fetch Modrinth Details (for packs with modrinth_info)
      const modrinthProjectIds = allPacks
        .map(p => p.modrinth_info?.project_id)
        .filter((id): id is string => !!id); // Filter out undefined/null and ensure type string
      
      if (modrinthProjectIds.length > 0) {
        fetchModrinthProjectDetails(modrinthProjectIds);
      }

      // 2. Fetch Local Icons (for packs WITHOUT modrinth_info)
      const localArchivePaths = allPacks
        .filter(p => !p.modrinth_info) // Only packs without modrinth info
        .map(p => p.path);
        
      if (localArchivePaths.length > 0) {
        fetchLocalPackIcons(localArchivePaths);
      }
    }
  });

  // Function to fetch Modrinth project details for given IDs
  async function fetchModrinthProjectDetails(ids: string[]) {
    if (ids.length === 0) return;
    
    loadingModrinthProjects = true;
    modrinthProjectsError = null;
    console.log(`[ProfileContent] Fetching Modrinth project details for ${ids.length} IDs...`);

    try {
      const projectDetails = await invoke<ModrinthProject[]>("get_modrinth_project_details", {
        ids
      });
      
      // Update the existing map, don't overwrite
      const currentProjects = $state.snapshot(modrinthProjects);
      for (const project of projectDetails) {
        currentProjects[project.id] = project;
      }
      modrinthProjects = currentProjects; // Assign the updated map back
      console.log('[ProfileContent] Modrinth project details fetched successfully.');

    } catch (error) {
      console.error("Error fetching Modrinth project details:", error);
      modrinthProjectsError = error instanceof Error ? error.message : "Error fetching icons";
    } finally {
      loadingModrinthProjects = false;
    }
  }

  // NEW: Function to fetch icons for local archives
  async function fetchLocalPackIcons(paths: string[]) {
    if (paths.length === 0) return;

    loadingLocalIcons = true;
    localIconsError = null;
    console.log(`[ProfileContent] Fetching local icons for ${paths.length} archives...`);

    try {
      // Type assertion needed because HashMap<String, Option<String>> isn't directly representable
      const iconsResult = await invoke<Record<string, string | null>>('get_icons_for_archives', {
        archivePaths: paths
      });

      const currentLocalIcons = $state.snapshot(localPackIcons);
      let iconsFoundCount = 0;
      for (const [path, base64Icon] of Object.entries(iconsResult)) {
        if (base64Icon) { // Only add if an icon was found (not null)
          currentLocalIcons[path] = base64Icon;
          iconsFoundCount++;
        }
      }
      localPackIcons = currentLocalIcons; // Assign the updated map back
      console.log(`[ProfileContent] Local icons fetched. Found ${iconsFoundCount} icons.`);

    } catch (error) {
      console.error("Error fetching local archive icons:", error);
      localIconsError = error instanceof Error ? error.message : "Error fetching local icons";
    } finally {
      loadingLocalIcons = false;
    }
  }

  // Toggle enabled state of a resource pack or shader pack
  async function togglePackEnabled(path: string, isDisabled: boolean) {
    if (loadingOperation) return;
    loadingOperation = true;
    
    try {
      // We need to enable the file if it is currently disabled, and vice versa
      const shouldBeEnabled = isDisabled; // If it's currently disabled, we want to enable it
      
      console.log(`Toggling pack ${path}, currently disabled: ${isDisabled}, setting enabled to: ${shouldBeEnabled}`);
      
      await invoke('set_file_enabled', {
        filePath: path,
        enabled: shouldBeEnabled
      });
      
      // Refresh the data
      if (activeTab === 'resourcepacks') {
        await loadResourcePacks();
      } else if (activeTab === 'shaderpacks') {
        await loadShaderPacks();
      }
      
    } catch (err) {
      console.error('Failed to toggle pack enabled state:', err);
      alert(`Failed to toggle pack: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      loadingOperation = false;
    }
  }

  // Delete a resource pack or shader pack
  async function deletePack(path: string) {
    if (loadingOperation) return;
    
    // Ask for confirmation
    if (!confirm('Are you sure you want to delete this pack? This cannot be undone.')) {
      return;
    }
    
    loadingOperation = true;
    
    try {
      await invoke('delete_file', {
        filePath: path
      });
      
      // Refresh the data
      if (activeTab === 'resourcepacks') {
        await loadResourcePacks();
      } else if (activeTab === 'shaderpacks') {
        await loadShaderPacks();
      }
      
    } catch (err) {
      console.error('Failed to delete pack:', err);
      alert(`Failed to delete pack: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      loadingOperation = false;
    }
  }

  // Open the directory containing a pack
  async function openPackDirectory(path: string) {
    if (loadingOperation) return;
    loadingOperation = true;
    
    try {
      await invoke('open_file_directory', {
        filePath: path
      });
    } catch (err) {
      console.error('Failed to open directory:', err);
      alert(`Failed to open directory: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      loadingOperation = false;
    }
  }

  // Setup auto-refresh on mount
  onMount(() => {
    // Initial load - Handled by $effect now
    // if (profileId) {
    //   loadTabData(activeTab);
    // }

    // Setup refresh interval (every 10 seconds) - Temporarily disabled
    // refreshInterval = window.setInterval(() => {
    //   console.log(`[ProfileContent] Interval refresh triggered for tab: ${activeTab}, profileId: ${profileId}`);
    //   if (profileId) {
    //     loadTabData(activeTab);
    //   }
    // }, 10000);
  });

  // Cleanup on destroy
  onDestroy(() => {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }
  });
</script>

<div class="profile-content">
  <!-- Tab Navigation -->
  <div class="tabs">
    <button 
      class="tab-button {activeTab === 'mods' ? 'active' : ''}" 
      on:click={() => activeTab = 'mods'}
    >
      Mods
    </button>
    <button 
      class="tab-button {activeTab === 'resourcepacks' ? 'active' : ''}" 
      on:click={() => activeTab = 'resourcepacks'}
    >
      Resource Packs
    </button>
    <button 
      class="tab-button {activeTab === 'shaderpacks' ? 'active' : ''}" 
      on:click={() => activeTab = 'shaderpacks'}
    >
      Shader Packs
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    <!-- Mods Tab -->
    {#if activeTab === 'mods'}
      <div class="mods-tab">
        <p class="info-text">Mods are managed in the main Profile view.</p>
      </div>
    {/if}

    <!-- Resource Packs Tab -->
    {#if activeTab === 'resourcepacks'}
      <div class="resourcepacks-tab">
        <h3>Resource Packs</h3>

        {#if loadingResourcePacks}
          <div class="loading">Loading resource packs...</div>
        {:else if errorResourcePacks}
          <div class="error-message">{errorResourcePacks}</div>
        {:else if resourcePacks.length === 0}
          <div class="empty-state">
            <p>No resource packs found for this profile.</p>
            <p class="tip">You can download resource packs from Modrinth or add them manually to your profile's resourcepacks folder.</p>
          </div>
        {:else}
          <div class="pack-list">
            {#each resourcePacks as pack (pack.path)}
              <div class="pack-item {pack.is_disabled ? 'disabled' : ''}">
                <div class="pack-controls">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={!pack.is_disabled}
                      disabled={loadingOperation}
                      on:change={() => togglePackEnabled(pack.path, pack.is_disabled)} 
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="pack-icon">
                  {#if pack.modrinth_info?.project_id && modrinthProjects[pack.modrinth_info.project_id]?.icon_url}
                    <!-- Modrinth Icon -->
                    <img 
                      src={modrinthProjects[pack.modrinth_info.project_id].icon_url} 
                      alt="Modrinth resource pack icon" 
                      class="pack-icon-img" 
                      loading="lazy"
                    />
                  {:else if localPackIcons[pack.path]}
                    <!-- Local Icon -->
                    <img 
                      src="data:image/png;base64,{localPackIcons[pack.path]}" 
                      alt="Local resource pack icon" 
                      class="pack-icon-img" 
                      loading="lazy"
                    />
                  {:else}
                    <!-- Default Icon -->
                    <div class="default-icon">🖼️</div>
                  {/if}
                </div>
                <div class="pack-details">
                  <div class="pack-name">
                    {pack.modrinth_info ? pack.modrinth_info.name : pack.filename}
                    {#if pack.is_disabled}<span class="disabled-badge">Disabled</span>{/if}
                  </div>
                  <div class="pack-meta">
                    {#if pack.modrinth_info}
                      <span class="version">Version: {pack.modrinth_info.version_number}</span>
                      <span class="source">From Modrinth</span>
                    {:else}
                      <span class="source">Local File</span>
                    {/if}
                    <span class="size">Size: {formatFileSize(pack.file_size)}</span>
                  </div>
                </div>
                <div class="pack-actions">
                  <button 
                    class="folder-button" 
                    title="Open folder"
                    disabled={loadingOperation}
                    on:click={() => openPackDirectory(pack.path)}
                  >
                    <span class="folder-icon">📁</span>
                  </button>
                  <button 
                    class="delete-button" 
                    title="Delete resource pack"
                    disabled={loadingOperation}
                    on:click={() => deletePack(pack.path)}
                  >
                    <span class="trash-icon">🗑️</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Shader Packs Tab -->
    {#if activeTab === 'shaderpacks'}
      <div class="shaderpacks-tab">
        <h3>Shader Packs</h3>

        {#if loadingShaderPacks}
          <div class="loading">Loading shader packs...</div>
        {:else if errorShaderPacks}
          <div class="error-message">{errorShaderPacks}</div>
        {:else if shaderPacks.length === 0}
          <div class="empty-state">
            <p>No shader packs found for this profile.</p>
            <p class="tip">You can download shader packs from Modrinth or add them manually to your profile's shaderpacks folder.</p>
          </div>
        {:else}
          <div class="pack-list">
            {#each shaderPacks as pack (pack.path)}
              <div class="pack-item {pack.is_disabled ? 'disabled' : ''}">
                <div class="pack-controls">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={!pack.is_disabled}
                      disabled={loadingOperation}
                      on:change={() => togglePackEnabled(pack.path, pack.is_disabled)} 
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="pack-icon">
                  {#if pack.modrinth_info?.project_id && modrinthProjects[pack.modrinth_info.project_id]?.icon_url}
                    <!-- Modrinth Icon -->
                    <img 
                      src={modrinthProjects[pack.modrinth_info.project_id].icon_url} 
                      alt="Modrinth shader pack icon" 
                      class="pack-icon-img" 
                      loading="lazy"
                    />
                  {:else if localPackIcons[pack.path]}
                    <!-- Local Icon -->
                    <img 
                      src="data:image/png;base64,{localPackIcons[pack.path]}" 
                      alt="Local shader pack icon" 
                      class="pack-icon-img" 
                      loading="lazy"
                    />
                  {:else}
                    <!-- Default Icon -->
                    <div class="default-icon">🌈</div>
                  {/if}
                </div>
                <div class="pack-details">
                  <div class="pack-name">
                    {pack.modrinth_info ? pack.modrinth_info.name : pack.filename}
                    {#if pack.is_disabled}<span class="disabled-badge">Disabled</span>{/if}
                  </div>
                  <div class="pack-meta">
                    {#if pack.modrinth_info}
                      <span class="version">Version: {pack.modrinth_info.version_number}</span>
                      <span class="source">From Modrinth</span>
                    {:else}
                      <span class="source">Local File</span>
                    {/if}
                    <span class="size">Size: {formatFileSize(pack.file_size)}</span>
                  </div>
                </div>
                <div class="pack-actions">
                  <button 
                    class="folder-button" 
                    title="Open folder"
                    disabled={loadingOperation}
                    on:click={() => openPackDirectory(pack.path)}
                  >
                    <span class="folder-icon">📁</span>
                  </button>
                  <button 
                    class="delete-button" 
                    title="Delete shader pack"
                    disabled={loadingOperation}
                    on:click={() => deletePack(pack.path)}
                  >
                    <span class="trash-icon">🗑️</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    gap: 0.2rem;
  }

  .tab-button {
    padding: 0.5rem 1rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .tab-button:hover {
    background-color: #e9e9e9;
  }

  .tab-button.active {
    background-color: white;
    border-bottom: 2px solid white;
    margin-bottom: -1px;
    color: #007bff;
  }

  .tab-content {
    padding: 1rem;
    background-color: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
  }

  .loading {
    padding: 1rem;
    color: #666;
    text-align: center;
  }

  .error-message {
    padding: 1rem;
    color: #dc3545;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #666;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

  .tip {
    font-size: 0.9rem;
    color: #6c757d;
    margin-top: 0.5rem;
  }

  .pack-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pack-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .pack-item:hover {
    background-color: #e9ecef;
  }

  .pack-item.disabled {
    opacity: 0.7;
    background-color: #f1f1f1;
    border-style: dashed;
  }

  .pack-controls {
    display: flex;
    align-items: center;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 22px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #28a745;
  }

  input:focus + .toggle-slider {
    box-shadow: 0 0 1px #28a745;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(18px);
  }

  input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pack-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background-color: #e9ecef;
    overflow: hidden;
  }

  .pack-icon-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .default-icon {
    font-size: 24px;
    color: #6c757d;
  }

  .pack-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .pack-name {
    font-weight: 500;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .disabled-badge {
    font-size: 0.75rem;
    background-color: #dc3545;
    color: white;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-weight: normal;
  }

  .pack-meta {
    font-size: 0.9rem;
    color: #6c757d;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pack-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .folder-button, .delete-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .folder-button {
    color: #0275d8;
  }

  .folder-button:hover {
    background-color: rgba(2, 117, 216, 0.1);
  }

  .delete-button {
    color: #dc3545;
  }

  .delete-button:hover {
    background-color: rgba(220, 53, 69, 0.1);
  }

  .folder-button:disabled, .delete-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .folder-icon, .trash-icon {
    font-size: 1.2rem;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .mods-tab {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .info-text {
    font-style: italic;
  }
</style>