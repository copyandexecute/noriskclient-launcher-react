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
  ResourcePackInfo,
  ModrinthVersion,
} from "../../../../types/modrinth";
import { ModrinthService } from "../../../../services/modrinth-service";
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { invoke } from "@tauri-apps/api/core";
import type {
  ModrinthBulkUpdateRequestBody,
  ModrinthHashAlgorithm,
} from "../../../../types/modrinth";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { formatFileSize } from "../../../../utils/format-file-size";
import { toast } from 'react-hot-toast';
import { toggleContentFromProfile } from "../../../../services/content-service";
import type { ToggleContentPayload } from "../../../../types/content";
import { ContentType } from "../../../../types/content";

// Icons specific to ResourcePacksTabV2
const RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD = [
  "solar:gallery-bold-duotone", // Fallback icon, empty state
  "solar:settings-bold-duotone", // Mod settings button (placeholder)
  "solar:info-circle-bold-duotone", // Mod info button (placeholder)
  "solar:check-circle-bold", // Enabled status
  "solar:close-circle-bold", // Disabled status
  "solar:image-gallery-bold", // Generic pack icon
  "solar:folder-open-bold-duotone",
  "solar:trash-bin-trash-bold",
  "solar:menu-dots-bold",
  "solar:sort-from_top_to_bottom-bold-duotone",
  "solar:refresh-square-bold-duotone",
  "solar:cloud-download-bold-duotone", // For Update Available button
  "solar:refresh-bold", // For Check for Updates loading spinner
  "solar:add-circle-bold-duotone", // For Add Packs
  "solar:refresh-outline", // For primary refresh button normal state
  "solar:double-alt-arrow-up-bold-duotone" // For Update All button
];

interface ResourcePacksTabV2Props {
  profile?: Profile; // Make profile prop optional to handle undefined case gracefully
  onRefreshRequired?: () => void; // Callback if profile data changes internally
}

// Helper to get a displayable file name from mod source
const getResourcePackFileName = (pack: ResourcePackInfo | null | undefined): string | null => {
  if (!pack) return null; // Add null check for pack itself
  if (pack.filename && pack.filename !== "0") return pack.filename;
  if (pack.path) {
    const parts = pack.path.split(/[\\/\\\\]/); // Original regex from ResourcePacksTab
    return parts[parts.length - 1] || "Unknown file";
  }
  return "Unknown file";
};

export function ResourcePacksTabV2({ profile, onRefreshRequired }: ResourcePacksTabV2Props) {
  // Early return or loading state if profile is not yet available
  if (!profile) {
    // Optionally, render a more specific loading/error state for this case
    return (
      <div className="p-4 font-minecraft text-center text-white/70">
        Profile data is not available. Cannot display resource packs.
      </div>
    );
  }

  const accentColor = useThemeStore((state) => state.accentColor);
  const [resourcePacks, setResourcePacks] = useState<ResourcePackInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For general loading like initial fetch or refresh
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // This state will drive our own SearchInput
  const [packBeingToggled, setPackBeingToggled] = useState<string | null>(null);
  const [packBeingDeleted, setPackBeingDeleted] = useState<string | null>(null);
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());
  const [isBatchToggling, setIsBatchToggling] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [resourcePackUpdates, setResourcePackUpdates] = useState<Record<string, ModrinthVersion | null>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPacks, setUpdatingPacks] = useState<Set<string>>(new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown menu

  // State for delete confirmation dialog
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<ResourcePackInfo | null>(null);
  const [isBatchDeleteConfirmActive, setIsBatchDeleteConfirmActive] = useState(false);
  const [isDialogActionLoading, setIsDialogActionLoading] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // State for Modrinth icons (project_id -> icon_url)
  const [resourcePackModrinthIcons, setResourcePackModrinthIcons] = useState<Record<string, string | null>>({});
  // State for local archive icons (pack.path -> base64_icon_string)
  const [localArchiveIcons, setLocalArchiveIcons] = useState<Record<string, string | null>>({});

  useEffect(() => {
    preloadIcons(RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD);
  }, []);

  // Fetch resource packs when profile changes
  useEffect(() => {
    if (profile?.id) {
      fetchResourcePacksData();
    }
  }, [profile?.id]); // Depend on profile.id

  // Fetch Modrinth icons for resource packs
  useEffect(() => {
    const fetchModrinthIconsForPacks = async () => {
      if (!resourcePacks || resourcePacks.length === 0) {
        setResourcePackModrinthIcons({});
        return;
      }
      const projectIdsToFetch = resourcePacks
        .filter(pack => pack.modrinth_info?.project_id && resourcePackModrinthIcons[pack.modrinth_info.project_id] === undefined)
        .map(pack => pack.modrinth_info!.project_id!)
      const uniqueProjectIds = [...new Set(projectIdsToFetch)];
      if (uniqueProjectIds.length > 0) {
        try {
          const projectDetailsList = await ModrinthService.getProjectDetails(uniqueProjectIds);
          const newIcons: Record<string, string | null> = {};
          projectDetailsList.forEach(detail => {
            if (detail?.id) {
              newIcons[detail.id] = detail.icon_url || null;
            }
          });
          setResourcePackModrinthIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        } catch (err) {
          console.error("Failed to fetch Modrinth project details for resource pack icons:", err);
        }
      }
    };
    fetchModrinthIconsForPacks();
  }, [resourcePacks]); // Removed resourcePackModrinthIcons from dep array to avoid loop, logic inside filters already fetched

  // Fetch local archive icons for resource packs
  useEffect(() => {
    const fetchLocalArchiveIconsForPacks = async () => {
      if (!resourcePacks || resourcePacks.length === 0) {
        setLocalArchiveIcons({});
        return;
      }

      const pathsToFetchIconsFor = resourcePacks
        .filter(pack => pack.path && localArchiveIcons[pack.path] === undefined) // Only fetch if path exists and not already fetched
        .map(pack => pack.path!);

      const uniquePaths = [...new Set(pathsToFetchIconsFor)];

      if (uniquePaths.length > 0) {
        try {
          // The invoke call expects { archivePaths: string[] }
          const iconsResult = await invoke<Record<string, string | null>>(
            "get_icons_for_archives",
            { archivePaths: uniquePaths } // Pass the array of paths directly
          );
          
          if (iconsResult) {
            const newLocalIcons: Record<string, string | null> = {};
            for (const path of uniquePaths) {
              newLocalIcons[path] = iconsResult[path] || null; // Store null if not found for a specific path
            }
            setLocalArchiveIcons(prevIcons => ({ ...prevIcons, ...newLocalIcons }));
          }
        } catch (err) {
          console.error("Failed to fetch local archive icons for resource packs:", err);
          // Optionally mark these paths as errored to prevent constant refetching
        }
      }
    };

    fetchLocalArchiveIconsForPacks();
  }, [resourcePacks]); // Removed localArchiveIcons from dep array

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Also check if the click was on the toggle button itself, if so, the button's own handler will manage it.
        // This check might need to be more robust if the button is deeply nested or event propagation is stopped.
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

  const handleToggleResourcePackEnabled = useCallback(async (packId: string, currentIsEnabled?: boolean) => {
    const pack = resourcePacks.find(p => p.filename === packId);
    if (!pack || !profile ) return;

    const newEnabledStateForBackend = pack.is_disabled === true; 

    if (!pack.sha1_hash) {
      toast.error(`Cannot toggle pack ${pack.filename}: missing SHA1 hash.`);
      console.error("Attempted to toggle resource pack without an SHA1 hash:", pack);
      return;
    }

    setPackBeingToggled(packId);
    const toastMessage = newEnabledStateForBackend ? "Enabling" : "Disabling"; // For error message

    const payload: ToggleContentPayload = {
      profile_id: profile.id,
      sha1_hash: pack.sha1_hash,
      enabled: newEnabledStateForBackend, 
      content_type: ContentType.ResourcePack,
    };

    try {
      await toggleContentFromProfile(payload); // Directly await
      // Success case: update state, no toast
      setResourcePacks(prevPacks =>
        prevPacks.map((p) =>
          p.filename === packId ? { ...p, is_disabled: !newEnabledStateForBackend } : p
        )
      );
      if (onRefreshRequired) onRefreshRequired();
    } catch (err) {
      console.error(`Failed to ${toastMessage.toLowerCase()} ${pack.filename}:`, err);
      toast.error(`Failed to ${toastMessage.toLowerCase()} ${pack.filename}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPackBeingToggled(null);
    }
  }, [resourcePacks, profile, onRefreshRequired]);

  const handleDeleteResourcePack = useCallback(async (pack: ResourcePackInfo) => {
    if (!profile) {
      setError("Profile data is missing, cannot initiate delete.");
      return;
    }
    setPackToDelete(pack);
    setIsBatchDeleteConfirmActive(false);
    setIsConfirmDeleteDialogOpen(true);
  }, [profile]);

  const handleOpenFolder = useCallback((pack: ResourcePackInfo) => {
    if (!pack.path) {
      alert("PROTOTYPE: Path not available for this pack.");
      return;
    }
    invoke("open_file_directory", { filePath: pack.path })
      .catch(err => {
        console.error("Failed to open pack directory:", err);
        setError(`Failed to open directory: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  const handleMoreActions = useCallback((pack: ResourcePackInfo) => {
    alert(`PROTOTYPE: More actions for ${pack.filename}`);
  }, []);

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

  const filteredResourcePacks = useMemo(() => {
    if (!searchQuery) return resourcePacks;
    return resourcePacks.filter((pack) => {
      const name = pack.filename || getResourcePackFileName(pack) || "";
      const id = pack.filename || "";
      const fileName = getResourcePackFileName(pack) || "";
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [resourcePacks, searchQuery]);

  const handleSelectAllToggle = useCallback((isChecked: boolean) => {
    setSelectedPackIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isChecked) {
        filteredResourcePacks.forEach(pack => newSelectedIds.add(pack.filename));
      } else {
        filteredResourcePacks.forEach(pack => newSelectedIds.delete(pack.filename));
      }
      return newSelectedIds;
    });
  }, [filteredResourcePacks]);

  const areAllFilteredSelected = useMemo(() => {
    return filteredResourcePacks.length > 0 && filteredResourcePacks.every(pack => selectedPackIds.has(pack.filename));
  }, [filteredResourcePacks, selectedPackIds]);

  const handleAddResourcePacks = () => alert("PROTOTYPE: Add Resource Packs");

  const fetchResourcePacksData = async () => {
    if (!profile) return; 
    setIsLoading(true);
    setError(null);
    try {
      const packsFromBackend = await invoke<ResourcePackInfo[]>(
        "get_local_resourcepacks",
        { profileId: profile.id }
      );
      const processedPacks = (packsFromBackend || []).map((pack) => ({
        ...pack,
        filename: getResourcePackFileName(pack) || 'Unknown Pack'
      }));
      setResourcePacks(processedPacks);
      setSelectedPackIds(new Set());
      if (onRefreshRequired) onRefreshRequired(); 
      if (processedPacks.length > 0) {
        await checkForResourcePackUpdates(profile, processedPacks);
      }
    } catch (err) {
      console.error("Failed to fetch resource packs data:", err);
      setError(`Failed to fetch resource packs: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForResourcePackUpdates = async (currentProfile = profile, currentPacks = resourcePacks) => {
    if (!currentProfile || !currentPacks || currentPacks.length === 0) {
      setResourcePackUpdates({});
      return;
    }

    const packsWithHashes = currentPacks.filter(
      (pack: ResourcePackInfo) => pack.modrinth_info && pack.sha1_hash
    );

    if (packsWithHashes.length === 0) {
      setResourcePackUpdates({});
      return;
    }

    const hashes = packsWithHashes.map((pack: ResourcePackInfo) => pack.sha1_hash!);

    setCheckingUpdates(true);
    setUpdateError(null);

    try {
      const request: ModrinthBulkUpdateRequestBody = {
        hashes,
        algorithm: "sha1" as ModrinthHashAlgorithm,
        loaders: [],
        game_versions: [currentProfile.game_version],
      };

      const updates = await invoke<Record<string, ModrinthVersion>>(
        "check_modrinth_updates",
        { request },
      );

      const filteredUpdates: Record<string, ModrinthVersion> = {};
      const packsByHash = new Map<string, ResourcePackInfo>();
      for (const pack of packsWithHashes) {
        if(pack.sha1_hash) packsByHash.set(pack.sha1_hash, pack);
      }

      for (const [hash, versionInfo] of Object.entries(updates)) {
        const pack = packsByHash.get(hash);
        if (pack && pack.modrinth_info && pack.modrinth_info.version_id !== versionInfo.id) {
          filteredUpdates[hash] = versionInfo;
        } else if (pack && !pack.modrinth_info) {
          filteredUpdates[hash] = versionInfo;
        }
      }
      setResourcePackUpdates(filteredUpdates);
    } catch (error) {
      console.error("Error checking for resource pack updates:", error);
      setUpdateError(
        error instanceof Error
          ? error.message
          : "Error checking for resource pack updates",
      );
      setResourcePackUpdates({});
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdateResourcePack = async (pack: ResourcePackInfo, updateVersion: ModrinthVersion) => {
    if (!profile || !pack.path) {
      setError("Profile or pack path missing, cannot update.");
      return;
    }
    if (!pack.modrinth_info || !pack.sha1_hash) {
      setError(`Pack ${pack.filename} is not linked to Modrinth or missing hash, cannot auto-update.`);
        return;
    }

    setUpdatingPacks(prev => new Set(prev).add(pack.filename));
    setError(null);
    setUpdateError(null);

    try {
      await invoke("update_resourcepack_from_modrinth", {
        profileId: profile.id,
        resourcepack: pack,
        newVersionDetails: updateVersion,
      });

      if (pack.sha1_hash) {
        setResourcePackUpdates(prevUpdates => {
          const newUpdates = { ...prevUpdates };
          delete newUpdates[pack.sha1_hash!];
            return newUpdates;
        });
      }
      await fetchResourcePacksData();
    } catch (err) {
      console.error("Failed to update resource pack:", err);
      const displayName = pack.filename || getResourcePackFileName(pack) || pack.filename;
      setError(`Failed to update ${displayName}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingPacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(pack.filename);
        return newSet;
      });
    }
  };

  const handleBatchToggleSelected = async () => {
    if (!profile || selectedPackIds.size === 0) return;
    
    setIsBatchToggling(true);
    const errors: string[] = [];
    let successfulToggles = 0;

    for (const packId of selectedPackIds) {
      const pack = resourcePacks.find(p => p.filename === packId);
      if (pack?.sha1_hash && profile) {
        const newEnabledStateForBackend = pack.is_disabled === true;
        const payload: ToggleContentPayload = {
          profile_id: profile.id,
          sha1_hash: pack.sha1_hash,
          enabled: newEnabledStateForBackend,
          content_type: ContentType.ResourcePack,
        };
        const toastMessage = newEnabledStateForBackend ? "Enabling" : "Disabling"; // For error message

        try {
          await toggleContentFromProfile(payload); // Directly await
          // Success case for this item
          successfulToggles++;
          setResourcePacks(prevPacks =>
            prevPacks.map(p => 
              p.filename === packId ? { ...p, is_disabled: !newEnabledStateForBackend } : p
            )
          );
        } catch (err) {
          const errorDetail = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to ${toastMessage.toLowerCase()} ${pack.filename}: ${errorDetail}`);
          console.error(`Batch toggle: Failed to ${toastMessage.toLowerCase()} ${pack.filename}:`, err);
          toast.error(`Failed to ${toastMessage.toLowerCase()} ${pack.filename}: ${errorDetail}`);
        }
      } else {
        const errorMsg = !pack 
          ? `Could not find pack with ID ${packId} to toggle.` 
          : `Pack ${pack.filename || 'ID: '+packId} is missing SHA1 hash for toggling.`;
        errors.push(errorMsg);
        toast.error(errorMsg); // Show toast for this specific failure
      }
    }
    
    setIsBatchToggling(false);
    if (errors.length > 0) {
      console.warn("Batch toggle finished with errors:", errors);
      // Individual errors already toasted
    }
    if (successfulToggles > 0) {
      if (onRefreshRequired) onRefreshRequired(); 
    }
    setSelectedPackIds(new Set());
  };

  const handleBatchDeleteSelected = async () => {
    if (!profile || selectedPackIds.size === 0) return;
    setPackToDelete(null);
    setIsBatchDeleteConfirmActive(true);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsConfirmDeleteDialogOpen(false);
    setPackToDelete(null);
    setIsBatchDeleteConfirmActive(false);
  };

  const handleConfirmDeletion = async () => {
    if (!profile) {
      setError("Profile data missing, cannot complete deletion.");
      handleCloseDeleteDialog();
      return;
    }
    setIsDialogActionLoading(true);
    setError(null);

    if (isBatchDeleteConfirmActive) {
      setIsBatchDeleting(true);
      const errors: string[] = [];
      for (const packId of selectedPackIds) {
        const pack = resourcePacks.find(p => p.filename === packId);
        if (pack?.path) {
        try {
            await invoke("delete_file", { filePath: pack.path });
        } catch (err) {
            errors.push(`Failed to delete ${pack.filename}: ${err instanceof Error ? err.message : String(err)}`);
            console.error(`Failed to delete pack ${packId} during batch:`, err);
          }
      } else {
          errors.push(`Could not find path for ${packId} to delete.`);
        }
      }
      if (errors.length > 0) setError(`Batch delete: ${errors.join(". ")}`);
      setIsBatchDeleting(false);
    } else if (packToDelete?.path) {
      setPackBeingDeleted(packToDelete.filename);
      try {
        await invoke("delete_file", { filePath: packToDelete.path });
      } catch (err) {
        setError(`Failed to delete ${packToDelete.filename}: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`Failed to delete pack ${packToDelete.filename}:`, err);
      } finally {
        setPackBeingDeleted(null);
      }
    }
    setIsDialogActionLoading(false);
    handleCloseDeleteDialog();
    await fetchResourcePacksData();
    if (onRefreshRequired) onRefreshRequired();
  };
  
  const handleUpdateAllAvailableResourcePacks = async () => {
    if (Object.keys(resourcePackUpdates).length === 0 || !profile) return;
    setIsUpdatingAll(true);
    setError(null);
    setUpdateError(null);
    let updateCount = 0;

    const packsToUpdateWithDetails: {pack: ResourcePackInfo, version: ModrinthVersion}[] = [];
    for (const pack of resourcePacks) {
      if (pack.sha1_hash && resourcePackUpdates[pack.sha1_hash]) {
        packsToUpdateWithDetails.push({ pack, version: resourcePackUpdates[pack.sha1_hash]! });
      }
    }

    if (packsToUpdateWithDetails.length === 0) {
        setIsUpdatingAll(false);
        return;
    }

    for (const { pack, version } of packsToUpdateWithDetails) {
      await handleUpdateResourcePack(pack, version);
      updateCount++;
    }
    
    setIsUpdatingAll(false);
    if (updateCount > 0) {
        await checkForResourcePackUpdates(profile, resourcePacks);
    }
  };

  // renderResourcePackItem is now defined here, outside useEffect
  const renderResourcePackItem = useCallback((pack: ResourcePackInfo) => {
    const itemTitle = getResourcePackFileName(pack) || "Unknown Pack";
    const isToggling = packBeingToggled === pack.filename;
    const isDeleting = packBeingDeleted === pack.filename;
    const isCurrentlyUpdating = updatingPacks.has(pack.filename);
    
    const updateAvailableVersion = pack.sha1_hash ? resourcePackUpdates[pack.sha1_hash] : null;

    // Determine Icon
    let iconToShow: React.ReactNode;
    const modrinthProjectId = pack.modrinth_info?.project_id;
    const modrinthIconUrl = modrinthProjectId ? resourcePackModrinthIcons[modrinthProjectId] : null;
    const localIconData = pack.path ? localArchiveIcons[pack.path] : null;

    if (modrinthIconUrl) {
      iconToShow = (
        <img 
          src={modrinthIconUrl} 
          alt={`${itemTitle} Modrinth icon`} 
          className="w-full h-full object-contain image-pixelated"
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} // Hide on error
        />
      );
    } else if (localIconData) {
      iconToShow = (
        <img 
          src={`data:image/png;base64,${localIconData}`} 
          alt={`${itemTitle} local icon`} 
          className="w-full h-full object-contain image-pixelated"
        />
      );
    } else {
      iconToShow = (
        <Icon icon="solar:gallery-bold-duotone" className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
      );
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
          iconElement={!pack.is_disabled ? <Icon icon={RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD[3]} className="w-3 h-3"/> : <Icon icon={RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD[4]} className="w-3 h-3"/>}
        >
          {!pack.is_disabled ? "Enabled" : "Disabled"}
        </TagBadge>
        {pack.modrinth_info && <TagBadge size="sm" variant="info">Modrinth</TagBadge>}
      </>
    );
    
    let itemUpdateActionNode: React.ReactNode = null;
    if (updateAvailableVersion && !isCurrentlyUpdating) {
        if (!pack.modrinth_info || pack.modrinth_info.version_id !== updateAvailableVersion.id) {
            itemUpdateActionNode = (
                <IconButton
                size="sm"
                colorScheme="success"
                onClick={() => handleUpdateResourcePack(pack, updateAvailableVersion)}
                disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating}
                icon={<Icon icon="solar:cloud-download-bold-duotone" className="w-3.5 h-3.5" />}
                title={`Update to ${updateAvailableVersion.version_number}`}
                />
            );
        }
    } else if (isCurrentlyUpdating) {
      itemUpdateActionNode = (
         <IconButton
          size="sm"
          colorScheme="secondary"
          disabled={true}
          icon={<Icon icon="solar:refresh-bold" className="animate-spin w-3.5 h-3.5" />}
          title={`Updating...`} 
        />
      );
    }

    const itemMainActionNode = (
      <Button 
        size="sm"
        variant={!pack.is_disabled ? "secondary" : "default"}
        onClick={() => handleToggleResourcePackEnabled(pack.filename, !pack.is_disabled)}
        disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating}
      >
        {isToggling ? "..." : (!pack.is_disabled ? "Disable" : "Enable")}
      </Button>
    );

    const itemDeleteActionNode = (
      <IconButton
        title="Delete Resource Pack"
        icon={isDeleting ? <Icon icon="solar:refresh-circle-bold-duotone" className="animate-spin w-3.5 h-3.5" /> : <Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />} 
        colorScheme="destructive"
        size="sm"
        onClick={() => handleDeleteResourcePack(pack)}
        disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating}
      />
    );

    const itemMoreActionsTriggerNode = (
      <IconButton
        title="More Actions"
        icon={<Icon icon="solar:menu-dots-bold" className="w-3.5 h-3.5" />} 
        colorScheme="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setActiveDropdownId(prevId => prevId === pack.filename ? null : pack.filename);
        }}
        disabled={isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating}
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
        updateActionNode={itemUpdateActionNode}
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
    handleToggleResourcePackEnabled,
    packBeingToggled, 
    packBeingDeleted, 
    handleDeleteResourcePack, 
    handleOpenFolder, 
    profile, 
    selectedPackIds, 
    handlePackSelectionChange,
    isBatchToggling,
    isBatchDeleting,
    checkingUpdates,
    updatingPacks,
    resourcePackUpdates, 
    activeDropdownId,
    setActiveDropdownId,
    handleUpdateResourcePack,
    resourcePackModrinthIcons,
    localArchiveIcons
  ]);

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search resource packs..." 
          className="flex-grow !h-9"
          disabled={isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll}
        />
        <IconButton
            icon={<Icon icon="solar:add-circle-bold-duotone" />}
            onClick={handleAddResourcePacks} 
            disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
            colorScheme="secondary"
            size="sm"
            title="Add Resource Packs" 
            className="!h-9 !w-9 flex-shrink-0"
        />
        <IconButton
            icon={isLoading ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : <Icon icon="solar:refresh-outline" />}
            onClick={fetchResourcePacksData} 
            disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
            colorScheme="secondary"
            size="sm"
            title={isLoading ? "Refreshing..." : "Refresh Resource Packs"} 
            className="!h-9 !w-9 flex-shrink-0 ml-auto"
        />
      </div>
      {/* {updateError && ( ... )} */}
      {/* Always show this section, regardless of resourcePacks.length */}
      <>
        <div 
          className="h-px w-full my-1"
          style={{ backgroundColor: `${accentColor.value}30` }} 
        />
        <div className="flex items-center justify-between w-full min-h-14">
          <Checkbox
            customSize="md" 
            checked={areAllFilteredSelected}
            onChange={(e) => handleSelectAllToggle(e.target.checked)}
            disabled={filteredResourcePacks.length === 0 || isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll}
            label={selectedPackIds.size > 0 ? `${selectedPackIds.size} selected` : "Select All"}
            title={areAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
          />
          <div className="flex items-center gap-2">
            {selectedPackIds.size > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={handleBatchToggleSelected} disabled={isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll} icon={isBatchToggling ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchToggling ? "Toggling..." : `Toggle (${selectedPackIds.size})`}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setIsBatchDeleteConfirmActive(true); setIsConfirmDeleteDialogOpen(true);}} disabled={isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll} icon={isBatchDeleting ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchDeleting ? "Deleting..." : `Delete (${selectedPackIds.size})`}
                </Button>
              </>
            )}
            {Object.keys(resourcePackUpdates).length > 0 && (
              <Button size="sm" variant="success" onClick={handleUpdateAllAvailableResourcePacks} disabled={isUpdatingAll || isLoading || isBatchToggling || isBatchDeleting || checkingUpdates} icon={isUpdatingAll ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : <Icon icon="solar:double-alt-arrow-up-bold-duotone" className="mr-1.5" />} className={selectedPackIds.size > 0 ? "ml-2" : ""}>
              {isUpdatingAll ? "Updating All..." : `Update All (${Object.keys(resourcePackUpdates).length})`}
            </Button>
          )}
          </div>
        </div>
      </>
      {/* End of always shown section */}
    </div>
  );

  const primaryRightActionsContent = null;

  return (
    <>
      <GenericContentTab<ResourcePackInfo> 
        items={filteredResourcePacks} 
        renderListItem={renderResourcePackItem} 
        isLoading={isLoading} 
        error={error} 
        searchQuery={searchQuery} 
        primaryLeftActions={primaryLeftActionsContent}
        primaryRightActions={primaryRightActionsContent}
        emptyStateIcon={RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD[0]} 
        emptyStateMessage={ 
          error ? "Error loading resource packs" :
          isLoading && resourcePacks.length === 0 ? "Loading resource packs..." :
          !searchQuery && resourcePacks.length === 0 && selectedPackIds.size === 0 ? "No resource packs found in this profile." :
          searchQuery && filteredResourcePacks.length === 0 && selectedPackIds.size === 0 ? "No resource packs match your search." :
          "Manage your resource packs"
        }
        emptyStateDescription={
          error ? "Please try refreshing or check the console." :
          isLoading && resourcePacks.length === 0 ? "Please wait while packs are being loaded." :
          !searchQuery && resourcePacks.length === 0 && selectedPackIds.size === 0 ? "You can add resource packs to this profile by placing them in the profile's resourcepacks folder or via Modrinth (if supported)." :
          searchQuery && filteredResourcePacks.length === 0 && selectedPackIds.size === 0 ? "Try a different search term or clear the search filter." :
          "Select packs to perform batch actions or manage them individually."
        }
        loadingItemCount={Math.min(resourcePacks.length > 0 ? resourcePacks.length : 5, 10)}
        showSkeletons={false}
        accentColorOverride={accentColor.value}
      />
    
      <ConfirmDeleteDialog
        isOpen={isConfirmDeleteDialogOpen}
        itemName={isBatchDeleteConfirmActive ? `${selectedPackIds.size} pack${selectedPackIds.size === 1 ? '' : 's'}` : (packToDelete?.filename || "item")}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeletion}
        isDeleting={isDialogActionLoading}
        title={isBatchDeleteConfirmActive ? "Delete Selected Packs?" : `Delete Pack?`}
      />
    </>
  );
} 


