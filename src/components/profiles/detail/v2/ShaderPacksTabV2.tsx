"use client";

import { Icon } from "@iconify/react";
import { Button } from "../../../ui/buttons/Button";
import { IconButton } from "../../../ui/buttons/IconButton";
import { GenericDetailListItem } from "../items/GenericDetailListItem";
import { TagBadge } from "../../../ui/TagBadge";
import { useThemeStore } from "../../../../store/useThemeStore";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { GenericContentTab } from "../../../ui/GenericContentTab";
import { preloadIcons } from "../../../../lib/icon-utils";
import type { Profile } from "../../../../types/profile";
import type { 
  ShaderPackInfo, // Specific to ShaderPacks
  ModrinthVersion,
} from "../../../../types/modrinth";
import { ModrinthService } from "../../../../services/modrinth-service";
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { invoke } from "@tauri-apps/api/core";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { formatFileSize } from "../../../../utils/format-file-size";
import { toast } from 'react-hot-toast';
// Potentially: import { toggleContentFromProfile } from "../../../../services/content-service"; if switching to that model
// For now, we'll use direct invoke calls for enable/disable like the original ShaderPacksTab

// Icons specific to ShaderPacksTabV2
const SHADER_PACKS_TAB_ICONS_TO_PRELOAD = [
  "solar:sun-bold-duotone", // Fallback icon, empty state
  "solar:settings-bold-duotone", 
  "solar:info-circle-bold-duotone", 
  "solar:check-circle-bold", // Enabled status
  "solar:close-circle-bold", // Disabled status
  "solar:shield-flash-bold-duotone", // Generic shader pack icon
  "solar:folder-open-bold-duotone",
  "solar:trash-bin-trash-bold",
  "solar:menu-dots-bold",
  "solar:sort-from_top_to_bottom-bold-duotone",
  "solar:refresh-square-bold-duotone",
  "solar:cloud-download-bold-duotone", 
  "solar:refresh-bold", 
  "solar:add-circle-bold-duotone", 
  "solar:refresh-outline", 
  "solar:double-alt-arrow-up-bold-duotone" 
];

interface ShaderPacksTabV2Props {
  profile?: Profile;
  onRefreshRequired?: () => void;
}

// Helper to get a displayable file name from shader pack info
const getShaderPackFileName = (pack: ShaderPackInfo | null | undefined): string | null => {
  if (!pack) return null;
  if (pack.filename && pack.filename !== "0") return pack.filename;
  if (pack.path) {
    const parts = pack.path.split(/[\/\\]/);
    return parts[parts.length - 1] || "Unknown file";
  }
  return "Unknown file";
};

export function ShaderPacksTabV2({ profile, onRefreshRequired }: ShaderPacksTabV2Props) {
  if (!profile) {
    return (
      <div className="p-4 font-minecraft text-center text-white/70">
        Profile data is not available. Cannot display shader packs.
      </div>
    );
  }

  const accentColor = useThemeStore((state) => state.accentColor);
  const [shaderPacks, setShaderPacks] = useState<ShaderPackInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [packBeingToggled, setPackBeingToggled] = useState<string | null>(null);
  const [packBeingDeleted, setPackBeingDeleted] = useState<string | null>(null); // For individual row delete button state
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());
  const [isBatchToggling, setIsBatchToggling] = useState(false);
  // const [isBatchDeleting, setIsBatchDeleting] = useState(false); // Will add later
  const [shaderPackUpdates, setShaderPackUpdates] = useState<Record<string, ModrinthVersion | null>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPacks, setUpdatingPacks] = useState<Set<string>>(new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State for Modrinth icons (project_id -> icon_url)
  const [shaderPackModrinthIcons, setShaderPackModrinthIcons] = useState<Record<string, string | null>>({});
  // State for local archive icons (pack.path -> base64_icon_string)
  const [localArchiveIcons, setLocalArchiveIcons] = useState<Record<string, string | null>>({});

  // State for ConfirmDeleteDialog
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<ShaderPackInfo | null>(null);
  const [isDialogActionLoading, setIsDialogActionLoading] = useState(false); // For dialog's confirm button loading state


  useEffect(() => {
    preloadIcons(SHADER_PACKS_TAB_ICONS_TO_PRELOAD);
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchShaderPacksData();
    }
  }, [profile?.id]);

  // Fetch Modrinth icons for shader packs (similar to ResourcePacksTabV2)
  useEffect(() => {
    const fetchModrinthIconsForPacks = async () => {
      if (!shaderPacks || shaderPacks.length === 0) {
        setShaderPackModrinthIcons({});
        return;
      }
      const projectIdsToFetch = shaderPacks
        .filter(pack => pack.modrinth_info?.project_id && shaderPackModrinthIcons[pack.modrinth_info.project_id] === undefined)
        .map(pack => pack.modrinth_info!.project_id!)
      const uniqueProjectIds = [...new Set(projectIdsToFetch)];
      
      if (uniqueProjectIds.length > 0) {
        console.log("[ShaderPacksTabV2] Fetching Modrinth project details for IDs:", uniqueProjectIds); // Log a
        try {
          // const projectDetailsList = await ModrinthService.getProjectDetails(uniqueProjectIds);
          // To better debug, let's get the raw response first
          const rawResponse = await ModrinthService.getProjectDetails(uniqueProjectIds);
          console.log("[ShaderPacksTabV2] Raw response from ModrinthService.getProjectDetails:", rawResponse); // Log b

          // Now, assuming rawResponse is what projectDetailsList was, proceed with caution
          // It's good practice to check if it's an array before calling forEach
          const projectDetailsList = Array.isArray(rawResponse) ? rawResponse : [];
          if (!Array.isArray(rawResponse)) {
            console.warn("[ShaderPacksTabV2] ModrinthService.getProjectDetails did not return an array. Received:", rawResponse);
          }

          const newIcons: Record<string, string | null> = {};
          projectDetailsList.forEach(detail => {
            // It's also good to check if detail is an object and has an id
            if (detail && typeof detail === 'object' && detail.id) {
              newIcons[detail.id] = detail.icon_url || null;
            } else {
              console.warn("[ShaderPacksTabV2] Invalid project detail item:", detail);
            }
          });
          setShaderPackModrinthIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        } catch (err) {
          console.error("Failed to fetch Modrinth project details for shader pack icons:", err);
        }
      }
    };
    fetchModrinthIconsForPacks();
  }, [shaderPacks]);

  // Fetch local archive icons for shader packs (similar to ResourcePacksTabV2)
  useEffect(() => {
    const fetchLocalArchiveIconsForPacks = async () => {
      if (!shaderPacks || shaderPacks.length === 0) {
        setLocalArchiveIcons({});
        return;
      }
      const pathsToFetchIconsFor = shaderPacks
        .filter(pack => pack.path && localArchiveIcons[pack.path] === undefined)
        .map(pack => pack.path!); // Ensure pack.path is not null/undefined before pushing
      const uniquePaths = [...new Set(pathsToFetchIconsFor)];

      if (uniquePaths.length > 0) {
        try {
          const iconsResult = await invoke<Record<string, string | null>>(
            "get_icons_for_archives",
            { archivePaths: uniquePaths }
          );
          if (iconsResult) {
            const newLocalIcons: Record<string, string | null> = {};
            for (const path of uniquePaths) {
              newLocalIcons[path] = iconsResult[path] || null;
            }
            setLocalArchiveIcons(prevIcons => ({ ...prevIcons, ...newLocalIcons }));
          }
        } catch (err) {
          console.error("Failed to fetch local archive icons for shader packs:", err);
        }
      }
    };
    fetchLocalArchiveIconsForPacks();
  }, [shaderPacks]);
  
    // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const moreActionsButton = (event.target as HTMLElement).closest(`[data-item-id="${activeDropdownId}"] [title="More Actions"]`);
        if (!moreActionsButton) {
          setActiveDropdownId(null);
        }
      }
    };

    if (activeDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdownId]);


  const fetchShaderPacksData = async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const packsFromBackend = await invoke<ShaderPackInfo[]>(
        "get_local_shaderpacks", // Adapted from ShaderPacksTab
        { profileId: profile.id }
      );
      const processedPacks = (packsFromBackend || []).map((pack) => ({
        ...pack,
        filename: getShaderPackFileName(pack) || 'Unknown Shader Pack' // Use helper
      })); 
      setShaderPacks(processedPacks);
      setSelectedPackIds(new Set()); // Reset selection
      if (onRefreshRequired) onRefreshRequired();
      // TODO: Call checkForShaderPackUpdates(profile, processedPacks) later
    } catch (err) {
      console.error("Failed to fetch shader packs data:", err);
      setError(`Failed to fetch shader packs: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleShaderPackEnabled = useCallback(async (packId: string) => {
    const pack = shaderPacks.find(p => p.filename === packId);
    if (!pack || !pack.path || !profile) return;

    setPackBeingToggled(packId);
    const shouldBeEnabled = pack.is_disabled === true; // If it IS disabled, we want to enable it.

    try {
      await invoke("set_file_enabled", { // From original ShaderPacksTab
        filePath: pack.path,
        enabled: shouldBeEnabled,
      });
      
      // Optimistic update
      setShaderPacks(prevPacks =>
        prevPacks.map(p =>
          p.filename === packId ? { ...p, is_disabled: !shouldBeEnabled } : p
        )
      );
      // No toast on success for toggle, consistent with ModsTabV2
      if (onRefreshRequired) onRefreshRequired();
    } catch (err) {
      console.error(`Failed to toggle shader pack ${pack.filename}:`, err);
      toast.error(`Failed to toggle ${pack.filename}: ${err instanceof Error ? err.message : String(err)}`);
      // Revert optimistic update on error if needed, or refetch
      fetchShaderPacksData(); 
    } finally {
      setPackBeingToggled(null);
    }
  }, [shaderPacks, profile, onRefreshRequired, fetchShaderPacksData]);


  const filteredShaderPacks = useMemo(() => {
    if (!searchQuery) return shaderPacks;
    return shaderPacks.filter((pack) => {
      const name = pack.filename || getShaderPackFileName(pack) || "";
      const id = pack.filename || ""; // Assuming filename is the ID here
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [shaderPacks, searchQuery]);

  const handlePackSelectionChange = useCallback((packId: string, isSelected: boolean) => {
    setSelectedPackIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isSelected) {
        newSelectedIds.add(packId);
      } else {
        newSelectedIds.delete(packId);
      }
      return newSelectedIds;
    });
  }, []);
  
  const areAllFilteredSelected = useMemo(() => {
    return filteredShaderPacks.length > 0 && filteredShaderPacks.every(pack => selectedPackIds.has(pack.filename));
  }, [filteredShaderPacks, selectedPackIds]);

  const handleSelectAllToggle = useCallback((isChecked: boolean) => {
    setSelectedPackIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isChecked) {
        filteredShaderPacks.forEach(pack => newSelectedIds.add(pack.filename));
      } else {
        filteredShaderPacks.forEach(pack => newSelectedIds.delete(pack.filename));
      }
      return newSelectedIds;
    });
  }, [filteredShaderPacks]);

  // Placeholder actions
  const handleAddShaderPacks = () => toast.error("PROTOTYPE: Add Shader Packs not implemented");
  const handleOpenFolder = useCallback((pack: ShaderPackInfo) => {
    if (!pack.path) {
      toast.error("Path not available for this pack.");
      return;
    }
    invoke("open_file_directory", { filePath: pack.path })
      .catch(err => {
        console.error("Failed to open pack directory:", err);
        toast.error(`Failed to open directory: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);
  
  const handleCloseDeleteDialog = () => {
    setIsConfirmDeleteDialogOpen(false);
    setPackToDelete(null);
  };

  const handleConfirmDeletion = async () => {
    if (!profile || !packToDelete || !packToDelete.path) {
      toast.error("Profile or pack path missing, cannot delete.");
      handleCloseDeleteDialog();
      return;
    }
    setIsDialogActionLoading(true);
    setPackBeingDeleted(packToDelete.filename); // Indicate loading on the specific item's button
    try {
      await invoke("delete_file", { filePath: packToDelete.path });
      toast.success(`Deleted ${getShaderPackFileName(packToDelete)}.`);
      await fetchShaderPacksData(); // Refresh list
      if (onRefreshRequired) onRefreshRequired();
    } catch (err) {
      toast.error(`Failed to delete ${getShaderPackFileName(packToDelete)}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDialogActionLoading(false);
      setPackBeingDeleted(null);
      handleCloseDeleteDialog();
    }
  };

  const handleDeleteShaderPack = useCallback(async (pack: ShaderPackInfo) => {
    if (!profile || !pack.path) {
      toast.error("Profile or pack path missing, cannot initiate delete.");
      return;
    }
    setPackToDelete(pack);
    setIsConfirmDeleteDialogOpen(true);
  }, [profile]);


  const renderShaderPackItem = useCallback((pack: ShaderPackInfo) => {
    const itemTitle = getShaderPackFileName(pack) || "Unknown Shader Pack";
    const isToggling = packBeingToggled === pack.filename;
    const isDeleting = packBeingDeleted === pack.filename; 
    // const isCurrentlyUpdating = updatingPacks.has(pack.filename); // Will use later
    // const updateAvailableVersion = pack.sha1_hash ? shaderPackUpdates[pack.sha1_hash] : null; // Will use later

    let iconToShow: React.ReactNode;
    const modrinthProjectId = pack.modrinth_info?.project_id;
    const modrinthIconUrl = modrinthProjectId ? shaderPackModrinthIcons[modrinthProjectId] : null;
    const localIconData = pack.path ? localArchiveIcons[pack.path] : null;

    if (modrinthIconUrl) {
      iconToShow = <img src={modrinthIconUrl} alt={`${itemTitle} Modrinth icon`} className="w-full h-full object-contain image-pixelated"/>;
    } else if (localIconData) {
      iconToShow = <img src={`data:image/png;base64,${localIconData}`} alt={`${itemTitle} local icon`} className="w-full h-full object-contain image-pixelated"/>;
    } else {
      iconToShow = <Icon icon="solar:sun-bold-duotone" className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />;
    }
    const itemIconNode = (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {iconToShow}
      </div>
    );

    const itemDescriptionNode = (
      <span title={`Size: ${formatFileSize(pack.file_size || 0)}`}>
        {formatFileSize(pack.file_size || 0)}
      </span>
    );

    const itemBadgesNode = (
      <>
        <TagBadge 
          size="sm"
          variant={!pack.is_disabled ? "success" : "destructive"} 
          iconElement={!pack.is_disabled ? <Icon icon={SHADER_PACKS_TAB_ICONS_TO_PRELOAD[3]} className="w-3 h-3"/> : <Icon icon={SHADER_PACKS_TAB_ICONS_TO_PRELOAD[4]} className="w-3 h-3"/>}
        >
          {!pack.is_disabled ? "Enabled" : "Disabled"}
        </TagBadge>
        {pack.modrinth_info && <TagBadge size="sm" variant="info">Modrinth</TagBadge>}
      </>
    );

    const itemMainActionNode = (
      <Button 
        size="sm"
        variant={!pack.is_disabled ? "secondary" : "default"}
        onClick={() => handleToggleShaderPackEnabled(pack.filename)}
        disabled={isToggling || isDeleting /* || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating */}
      >
        {isToggling ? "..." : (!pack.is_disabled ? "Disable" : "Enable")}
      </Button>
    );
    
    const itemDeleteActionNode = (
      <IconButton
        title="Delete Shader Pack"
        icon={isDeleting ? <Icon icon="solar:refresh-circle-bold-duotone" className="animate-spin w-3.5 h-3.5" /> :  <Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />} 
        variant="destructive"
        size="sm"
        onClick={() => handleDeleteShaderPack(pack)} // Changed to call new handler
        disabled={isToggling || isDeleting /* || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating */}
      />
    );
    
    const itemMoreActionsTriggerNode = (
      <IconButton
        title="More Actions"
        icon={<Icon icon="solar:menu-dots-bold" className="w-3.5 h-3.5" />} 
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setActiveDropdownId(prevId => prevId === pack.filename ? null : pack.filename); // Corrected logic here
        }}
        disabled={isDeleting /*|| isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating*/}
        data-item-id={pack.filename} 
      />
    );
    
    const itemDropdownNode = (
      <div 
        ref={dropdownRef}
        className="absolute top-full right-0 mt-1 w-44 bg-opacity-80 backdrop-blur-md border rounded-md shadow-lg z-20 p-1 flex flex-col gap-0.5"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: `${accentColor.value}CC`, borderColor: `${accentColor.value}50` }}
      >
        <button 
          onClick={() => { if(pack.path) handleOpenFolder(pack); setActiveDropdownId(null); }}
          disabled={!pack.path}
          className="w-full text-left px-2 py-1.5 text-[11px] font-minecraft-ten hover:bg-[var(--accent-color-soft)] rounded-sm text-white/80 hover:text-white transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Icon icon="solar:folder-open-bold-duotone" className="w-3 h-3 flex-shrink-0" />
          Open Folder
        </button>
      </div>
    );


    return (
      <GenericDetailListItem
        key={pack.filename}
        id={pack.filename}
        isSelected={selectedPackIds.has(pack.filename)}
        onSelectionChange={(checked) => handlePackSelectionChange(pack.filename, checked)}
        iconNode={itemIconNode}
        title={itemTitle}
        descriptionNode={itemDescriptionNode}
        badgesNode={itemBadgesNode}
        // updateActionNode={itemUpdateActionNode} // Will add later
        mainActionNode={itemMainActionNode}
        deleteActionNode={itemDeleteActionNode}
        moreActionsTriggerNode={itemMoreActionsTriggerNode}
        dropdownNode={itemDropdownNode}
        isDropdownVisible={activeDropdownId === pack.filename}
        accentColor={accentColor.value}
      />
    );
  }, [
    accentColor.value,
    handleToggleShaderPackEnabled,
    packBeingToggled,
    packBeingDeleted, 
    handleDeleteShaderPack,
    handleOpenFolder,
    profile,
    selectedPackIds,
    handlePackSelectionChange,
    // isBatchToggling, // Will add later
    // isBatchDeleting, // Will add later
    // checkingUpdates, // Will add later
    // updatingPacks, // Will add later
    // shaderPackUpdates, // Will add later
    activeDropdownId,
    setActiveDropdownId,
    // handleUpdateShaderPack, // Will add later
    shaderPackModrinthIcons,
    localArchiveIcons,
  ]);

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search shader packs..."
          className="flex-grow !h-9"
          // disabled={isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll}
        />
        <IconButton
            icon={<Icon icon="solar:add-circle-bold-duotone" />} // Using a consistent icon
            onClick={handleAddShaderPacks}
            // disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
            variant="secondary"
            size="sm"
            title="Add Shader Packs"
            className="!h-9 !w-9 flex-shrink-0"
        />
        <IconButton
            icon={isLoading ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : <Icon icon="solar:refresh-outline" />} // Using a consistent icon
            onClick={fetchShaderPacksData}
            // disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
            variant="secondary"
            size="sm"
            title={isLoading ? "Refreshing..." : "Refresh Shader Packs"}
            className="!h-9 !w-9 flex-shrink-0 ml-auto"
        />
      </div>
      {/* Show horizontal divider and select all only if there are items, or if some are selected */} 
      {/* This logic might be further refined based on UX for V2 tabs */} 
      <>
        <div className="h-px w-full my-1" style={{ backgroundColor: `${accentColor.value}30` }} />
        <div className="flex items-center justify-between w-full">
          <Checkbox
            customSize="md" 
            checked={areAllFilteredSelected}
            onChange={(e) => handleSelectAllToggle(e.target.checked)}
            disabled={filteredShaderPacks.length === 0 /* || isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll */}
            label={selectedPackIds.size > 0 ? `${selectedPackIds.size} selected` : "Select All"}
            title={areAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
            className="self-start"
          />
          <div className="flex items-center gap-2">
            {/* Placeholder for batch action buttons */}
            {/* Example: Add batch delete/toggle later if needed */}
            {/* {selectedPackIds.size > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={() => alert("Batch Toggle")} disabled={true}>Toggle ({selectedPackIds.size})</Button>
                <Button size="sm" variant="destructive" onClick={() => alert("Batch Delete")} disabled={true}>Delete ({selectedPackIds.size})</Button>
              </>
            )} */}
          </div>
        </div>
      </>
    </div>
  );

  const primaryRightActionsContent = null; // Or define as needed

  return (
    <>
      <GenericContentTab<ShaderPackInfo>
        items={filteredShaderPacks}
        renderListItem={renderShaderPackItem}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        primaryLeftActions={primaryLeftActionsContent}
        primaryRightActions={primaryRightActionsContent}
        emptyStateIcon={SHADER_PACKS_TAB_ICONS_TO_PRELOAD[0]}
        emptyStateMessage={
          error ? "Error loading shader packs" :
          isLoading && shaderPacks.length === 0 ? "Loading shader packs..." :
          !searchQuery && shaderPacks.length === 0 && selectedPackIds.size === 0 ? "No shader packs found in this profile." :
          searchQuery && filteredShaderPacks.length === 0 && selectedPackIds.size === 0 ? "No shader packs match your search." :
          "Manage your shader packs"
        }
        emptyStateDescription={
          error ? "Please try refreshing or check the console." :
          isLoading && shaderPacks.length === 0 ? "Please wait while packs are being loaded." :
          !searchQuery && shaderPacks.length === 0 && selectedPackIds.size === 0 ? "You can add shader packs to this profile by placing them in the profile's shaderpacks folder." :
          searchQuery && filteredShaderPacks.length === 0 && selectedPackIds.size === 0 ? "Try a different search term or clear the search filter." :
          "Select packs to perform batch actions or manage them individually."
        }
        loadingItemCount={Math.min(shaderPacks.length > 0 ? shaderPacks.length : 5, 10)}
        showSkeletons={false} // As per previous decision
        accentColorOverride={accentColor.value}
      />
      <ConfirmDeleteDialog 
        isOpen={isConfirmDeleteDialogOpen}
        itemName={getShaderPackFileName(packToDelete) || "the selected shader pack"}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeletion}
        isDeleting={isDialogActionLoading} // This controls the dialog's confirm button state
        title={"Delete Shader Pack?"} // Generic title for single deletion
      />
    </>
  );
} 