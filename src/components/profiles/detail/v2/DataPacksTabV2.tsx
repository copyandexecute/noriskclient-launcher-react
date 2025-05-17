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
  DataPackInfo, // Specific to DataPacks
  ModrinthVersion,
  ModrinthBulkUpdateRequestBody,
  ModrinthHashAlgorithm,
} from "../../../../types/modrinth";
import { ModrinthService } from "../../../../services/modrinth-service";
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { invoke } from "@tauri-apps/api/core";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { formatFileSize } from "../../../../utils/format-file-size";
import { toast } from 'react-hot-toast';
import { toggleContentFromProfile } from "../../../../services/content-service";
import type { ToggleContentPayload } from "../../../../types/content";

// Icons specific to DataPacksTabV2
const DATA_PACKS_TAB_ICONS_TO_PRELOAD = [
  "solar:server-bold-duotone", // Fallback icon, empty state (database/server icon often used for data)
  "solar:settings-bold-duotone",
  "solar:info-circle-bold-duotone",
  "solar:check-circle-bold", // Enabled status
  "solar:close-circle-bold", // Disabled status
  "solar:document-text-bold-duotone", // Generic data pack icon (document-like)
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

interface DataPacksTabV2Props {
  profile?: Profile;
  onRefreshRequired?: () => void;
}

// Helper to get a displayable file name from data pack info
const getDataPackFileName = (pack: DataPackInfo | null | undefined): string | null => {
  if (!pack) return null;
  if (pack.filename && pack.filename !== "0") return pack.filename; // filename seems to be used as an ID
  if (pack.path) {
    const parts = pack.path.split(/[\\/\\\\]/);
    return parts[parts.length - 1] || "Unknown file";
  }
  // if (pack.file_name) return pack.file_name; // From DataPacksTab.tsx, if filename isn't the primary display
  return "Unknown file";
};

export function DataPacksTabV2({ profile, onRefreshRequired }: DataPacksTabV2Props) {
  if (!profile) {
    return (
      <div className="p-4 font-minecraft text-center text-white/70">
        Profile data is not available. Cannot display data packs.
      </div>
    );
  }

  const accentColor = useThemeStore((state) => state.accentColor);
  const [dataPacks, setDataPacks] = useState<DataPackInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [packBeingToggled, setPackBeingToggled] = useState<string | null>(null);
  const [packBeingDeleted, setPackBeingDeleted] = useState<string | null>(null);
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());
  const [isBatchToggling, setIsBatchToggling] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [dataPackUpdates, setDataPackUpdates] = useState<Record<string, ModrinthVersion | null>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPacks, setUpdatingPacks] = useState<Set<string>>(new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<DataPackInfo | null>(null);
  const [isBatchDeleteConfirmActive, setIsBatchDeleteConfirmActive] = useState(false);
  const [isDialogActionLoading, setIsDialogActionLoading] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  const [dataPackModrinthIcons, setDataPackModrinthIcons] = useState<Record<string, string | null>>({});
  // Data packs are often folders, local archive icons might be less relevant unless they are zipped.
  // For consistency, we'll include the logic, but it might often be empty.
  const [localArchiveIcons, setLocalArchiveIcons] = useState<Record<string, string | null>>({});

  useEffect(() => {
    preloadIcons(DATA_PACKS_TAB_ICONS_TO_PRELOAD);
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchDataPacksData();
    }
  }, [profile?.id]);

  useEffect(() => {
    const fetchModrinthIconsForPacks = async () => {
      if (!dataPacks || dataPacks.length === 0) {
        setDataPackModrinthIcons({});
        return;
      }
      const projectIdsToFetch = dataPacks
        .filter(pack => pack.modrinth_info?.project_id && dataPackModrinthIcons[pack.modrinth_info.project_id] === undefined)
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
          setDataPackModrinthIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        } catch (err) {
          console.error("Failed to fetch Modrinth project details for data pack icons:", err);
        }
      }
    };
    fetchModrinthIconsForPacks();
  }, [dataPacks]);

  useEffect(() => {
    const fetchLocalArchiveIconsForPacks = async () => {
      if (!dataPacks || dataPacks.length === 0) {
        setLocalArchiveIcons({});
        return;
      }
      const pathsToFetchIconsFor = dataPacks
        .filter(pack => pack.path && localArchiveIcons[pack.path] === undefined)
        .map(pack => pack.path!);
      const uniquePaths = [...new Set(pathsToFetchIconsFor)];

      if (uniquePaths.length > 0) {
        try {
          const iconsResult = await invoke<Record<string, string | null>>(
            "get_icons_for_archives", // This might not be effective for folder-based data packs
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
          console.error("Failed to fetch local archive icons for data packs:", err);
        }
      }
    };
    fetchLocalArchiveIconsForPacks();
  }, [dataPacks]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const moreActionsButton = (event.target as HTMLElement).closest(`[data-item-id="${activeDropdownId}"] [title="More Actions"]`);
        if (!moreActionsButton) {
          setActiveDropdownId(null);
        }
      }
    };
    if (activeDropdownId) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdownId]);

  const fetchDataPacksData = async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const packsFromBackend = await invoke<DataPackInfo[]>(
        "get_local_datapacks",
        { profileId: profile.id }
      );
      const processedPacks = (packsFromBackend || []).map((pack) => ({
        ...pack,
        // Ensure `filename` is the primary ID and display name if not already set
        // `getDataPackFileName` uses pack.path as fallback if pack.filename is "0" or missing
        filename: pack.filename && pack.filename !== "0" ? pack.filename : (getDataPackFileName(pack) || 'Unknown Pack')
      }));
      setDataPacks(processedPacks);
      setSelectedPackIds(new Set());
      if (onRefreshRequired) onRefreshRequired();
      if (processedPacks.length > 0) {
        await checkForDataPackUpdates(profile, processedPacks);
      }
    } catch (err) {
      console.error("Failed to fetch data packs data:", err);
      setError(`Failed to fetch data packs: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleDataPackEnabled = useCallback(async (packId: string) => {
    const pack = dataPacks.find(p => p.filename === packId);
    if (!pack || !profile ) return;

    const newEnabledStateForBackend = pack.is_disabled === true; 

    if (!pack.sha1_hash) { // SHA1 hash is crucial for toggleContentFromProfile
      toast.error(`Cannot toggle pack ${getDataPackFileName(pack)}: missing SHA1 hash.`);
      console.error("Attempted to toggle data pack without an SHA1 hash:", pack);
      return;
    }

    setPackBeingToggled(packId);
    const toastMessage = newEnabledStateForBackend ? "Enabling" : "Disabling";

    const payload: ToggleContentPayload = {
      profile_id: profile.id,
      sha1_hash: pack.sha1_hash,
      enabled: newEnabledStateForBackend, 
    };

    try {
      await toggleContentFromProfile(payload);
      setDataPacks(prevPacks =>
        prevPacks.map((p) =>
          p.filename === packId ? { ...p, is_disabled: !newEnabledStateForBackend } : p
        )
      );
      if (onRefreshRequired) onRefreshRequired();
    } catch (err) {
      console.error(`Failed to ${toastMessage.toLowerCase()} ${getDataPackFileName(pack)}:`, err);
      toast.error(`Failed to ${toastMessage.toLowerCase()} ${getDataPackFileName(pack)}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPackBeingToggled(null);
    }
  }, [dataPacks, profile, onRefreshRequired]);

  const handleDeleteDataPack = useCallback(async (pack: DataPackInfo) => {
    if (!profile) {
      setError("Profile data is missing, cannot initiate delete.");
      return;
    }
    setPackToDelete(pack);
    setIsBatchDeleteConfirmActive(false);
    setIsConfirmDeleteDialogOpen(true);
  }, [profile]);

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
        const pack = dataPacks.find(p => p.filename === packId);
        if (pack?.path) {
          try {
            await invoke("delete_file", { filePath: pack.path });
          } catch (err) {
            errors.push(`Failed to delete ${getDataPackFileName(pack)}: ${err instanceof Error ? err.message : String(err)}`);
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
        toast.success(`Deleted ${getDataPackFileName(packToDelete)}.`);
      } catch (err) {
        toast.error(`Failed to delete ${getDataPackFileName(packToDelete)}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setPackBeingDeleted(null);
      }
    }
    setIsDialogActionLoading(false);
    handleCloseDeleteDialog();
    await fetchDataPacksData(); // Refresh list
    if (onRefreshRequired) onRefreshRequired();
  };

  const handleOpenFolder = useCallback((pack: DataPackInfo) => {
    if (!pack.path) {
      toast.error("Path not available for this data pack.");
      return;
    }
    invoke("open_file_directory", { filePath: pack.path })
      .catch(err => {
        toast.error(`Failed to open directory: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  const filteredDataPacks = useMemo(() => {
    if (!searchQuery) return dataPacks;
    return dataPacks.filter((pack) => {
      const name = getDataPackFileName(pack) || "";
      const id = pack.filename || ""; // Assuming filename is the ID
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [dataPacks, searchQuery]);

  const handlePackSelectionChange = useCallback((packId: string, isSelected: boolean) => {
    setSelectedPackIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(packId);
      else newSet.delete(packId);
      return newSet;
    });
  }, []);

  const areAllFilteredSelected = useMemo(() => {
    return filteredDataPacks.length > 0 && filteredDataPacks.every(pack => selectedPackIds.has(pack.filename));
  }, [filteredDataPacks, selectedPackIds]);

  const handleSelectAllToggle = useCallback((isChecked: boolean) => {
    setSelectedPackIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) filteredDataPacks.forEach(pack => newSet.add(pack.filename));
      else filteredDataPacks.forEach(pack => newSet.delete(pack.filename));
      return newSet;
    });
  }, [filteredDataPacks]);

  const checkForDataPackUpdates = async (currentProfile = profile, currentPacks = dataPacks) => {
    if (!currentProfile?.game_version || !currentPacks || currentPacks.length === 0) {
      setDataPackUpdates({});
      return;
    }
    const packsWithHashes = currentPacks.filter(p => p.modrinth_info && p.sha1_hash);
    if (packsWithHashes.length === 0) {
      setDataPackUpdates({});
      return;
    }
    const hashes = packsWithHashes.map(p => p.sha1_hash!);
    setCheckingUpdates(true);
    setUpdateError(null);
    try {
      const request: ModrinthBulkUpdateRequestBody = {
        hashes,
        algorithm: "sha1" as ModrinthHashAlgorithm,
        loaders: [], // Data packs are loader-agnostic
        game_versions: [currentProfile.game_version],
      };
      const updates = await invoke<Record<string, ModrinthVersion>>("check_modrinth_updates", { request });
      const filteredUpdates: Record<string, ModrinthVersion> = {};
      const packsByHash = new Map(packsWithHashes.map(p => [p.sha1_hash!, p]));
      for (const [hash, versionInfo] of Object.entries(updates)) {
        const pack = packsByHash.get(hash);
        if (pack && pack.modrinth_info && pack.modrinth_info.version_id !== versionInfo.id) {
          filteredUpdates[hash] = versionInfo;
        } else if (pack && !pack.modrinth_info) { // If not linked, any version is an update
          filteredUpdates[hash] = versionInfo;
        }
      }
      setDataPackUpdates(filteredUpdates);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Error checking updates");
      setDataPackUpdates({});
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdateDataPack = async (pack: DataPackInfo, updateVersion: ModrinthVersion) => {
    if (!profile || !pack.path || !pack.modrinth_info || !pack.sha1_hash) {
      toast.error("Cannot update: Pack information incomplete.");
      return;
    }
    setUpdatingPacks(prev => new Set(prev).add(pack.filename));
    setError(null);
    setUpdateError(null);
    try {
      await invoke("update_datapack_from_modrinth", { // Assuming this backend function exists
        profileId: profile.id,
        datapack: pack, // Ensure backend expects DataPackInfo
        newVersionDetails: updateVersion,
      });
      setDataPackUpdates(prev => {
        const newUpdates = { ...prev };
        if (pack.sha1_hash) delete newUpdates[pack.sha1_hash];
        return newUpdates;
      });
      await fetchDataPacksData(); // Refresh list
      toast.success(`Updated ${getDataPackFileName(pack)}.`);
    } catch (err) {
      toast.error(`Failed to update ${getDataPackFileName(pack)}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingPacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(pack.filename);
        return newSet;
      });
    }
  };
  
  const handleUpdateAllAvailableDataPacks = async () => {
    if (Object.keys(dataPackUpdates).length === 0 || !profile) return;
    setIsUpdatingAll(true);
    setError(null);
    setUpdateError(null);
    let updateCount = 0;

    const packsToUpdateWithDetails: {pack: DataPackInfo, version: ModrinthVersion}[] = [];
    for (const pack of dataPacks) {
      if (pack.sha1_hash && dataPackUpdates[pack.sha1_hash]) {
        packsToUpdateWithDetails.push({ pack, version: dataPackUpdates[pack.sha1_hash]! });
      }
    }
    if (packsToUpdateWithDetails.length === 0) {
      setIsUpdatingAll(false);
      return;
    }
    for (const { pack, version } of packsToUpdateWithDetails) {
      await handleUpdateDataPack(pack, version); // This will toast individually
      updateCount++;
    }
    setIsUpdatingAll(false);
    if (updateCount > 0) {
      // toast.info(`Update process finished for ${updateCount} data pack(s).`);
      await checkForDataPackUpdates(profile, dataPacks); // Recheck after updates
    }
  };


  const handleBatchToggleSelected = async () => {
    if (!profile || selectedPackIds.size === 0) return;
    setIsBatchToggling(true);
    const errors: string[] = [];
    for (const packId of selectedPackIds) {
      const pack = dataPacks.find(p => p.filename === packId);
      if (pack?.sha1_hash && profile) {
        const newEnabledState = pack.is_disabled === true;
        const payload: ToggleContentPayload = {
          profile_id: profile.id, sha1_hash: pack.sha1_hash, enabled: newEnabledState
        };
        try {
          await toggleContentFromProfile(payload);
          setDataPacks(prev => prev.map(p => p.filename === packId ? { ...p, is_disabled: !newEnabledState } : p));
        } catch (err) {
          errors.push(`Failed for ${getDataPackFileName(pack)}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        errors.push(!pack ? `Pack ID ${packId} not found.` : `${getDataPackFileName(pack)} missing SHA1.`);
      }
    }
    setIsBatchToggling(false);
    if (errors.length > 0) toast.error(`Batch toggle issues: ${errors.join("; ")}`);
    if (errors.length < selectedPackIds.size) {
      if (onRefreshRequired) onRefreshRequired();
    }
    setSelectedPackIds(new Set());
  };
  
  const handleCloseDeleteDialog = () => {
    setIsConfirmDeleteDialogOpen(false);
    setPackToDelete(null);
    setIsBatchDeleteConfirmActive(false);
  };
  
  const handleAddDataPacks = () => toast.error("PROTOTYPE: Add Data Packs not implemented");

  const renderDataPackItem = useCallback((pack: DataPackInfo) => {
    const itemTitle = getDataPackFileName(pack) || "Unknown Data Pack";
    const isToggling = packBeingToggled === pack.filename;
    const isDeleting = packBeingDeleted === pack.filename; // Not used in this version, but for consistency
    const isCurrentlyUpdating = updatingPacks.has(pack.filename);
    const updateAvailableVersion = pack.sha1_hash ? dataPackUpdates[pack.sha1_hash] : null;

    let iconToShow: React.ReactNode;
    const modrinthProjectId = pack.modrinth_info?.project_id;
    const modrinthIconUrl = modrinthProjectId ? dataPackModrinthIcons[modrinthProjectId] : null;
    const localIconData = pack.path ? localArchiveIcons[pack.path] : null; // May not apply if data packs are folders

    if (modrinthIconUrl) {
      iconToShow = <img src={modrinthIconUrl} alt={`${itemTitle} icon`} className="w-full h-full object-contain image-pixelated"/>;
    } else if (localIconData) {
      iconToShow = <img src={`data:image/png;base64,${localIconData}`} alt={`${itemTitle} icon`} className="w-full h-full object-contain image-pixelated"/>;
    } else {
      iconToShow = <Icon icon={DATA_PACKS_TAB_ICONS_TO_PRELOAD[5]} className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />;
    }
    const itemIconNode = <div className="absolute inset-0 w-full h-full flex items-center justify-center">{iconToShow}</div>;
    const itemDescriptionNode = <span title={`Size: ${formatFileSize(pack.file_size || 0)}`}>{formatFileSize(pack.file_size || 0)}</span>;
    const itemBadgesNode = (
      <>
        <TagBadge size="sm" variant={!pack.is_disabled ? "success" : "destructive"} iconElement={!pack.is_disabled ? <Icon icon={DATA_PACKS_TAB_ICONS_TO_PRELOAD[3]} /> : <Icon icon={DATA_PACKS_TAB_ICONS_TO_PRELOAD[4]} />}>
          {!pack.is_disabled ? "Enabled" : "Disabled"}
        </TagBadge>
        {pack.modrinth_info && <TagBadge size="sm" variant="info">Modrinth</TagBadge>}
      </>
    );
    let itemUpdateActionNode: React.ReactNode = null;
    if (updateAvailableVersion && !isCurrentlyUpdating && pack.modrinth_info?.version_id !== updateAvailableVersion.id) {
        itemUpdateActionNode = (
            <IconButton size="sm" variant="success" onClick={() => handleUpdateDataPack(pack, updateAvailableVersion)}
            disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates}
            icon={<Icon icon="solar:cloud-download-bold-duotone" />} title={`Update to ${updateAvailableVersion.version_number}`} />
        );
    } else if (isCurrentlyUpdating) {
      itemUpdateActionNode = <IconButton size="sm" variant="secondary" disabled icon={<Icon icon="solar:refresh-bold" className="animate-spin" />} title="Updating..." />;
    }
    const itemMainActionNode = (
      <Button size="sm" variant={!pack.is_disabled ? "secondary" : "default"} onClick={() => handleToggleDataPackEnabled(pack.filename)}
        disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating}>
        {isToggling ? "..." : (!pack.is_disabled ? "Disable" : "Enable")}
      </Button>
    );
    const itemDeleteActionNode = (
      <IconButton title="Delete Data Pack" icon={isDeleting ? <Icon icon="solar:refresh-circle-bold-duotone" className="animate-spin" /> : <Icon icon="solar:trash-bin-trash-bold" />} 
        variant="destructive" size="sm" onClick={() => handleDeleteDataPack(pack)} 
        disabled={isToggling || isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating} />
    );
    const itemMoreActionsTriggerNode = (
      <IconButton title="More Actions" icon={<Icon icon="solar:menu-dots-bold" />} variant="ghost" size="sm"
        onClick={(e) => { e.stopPropagation(); setActiveDropdownId(prev => prev === pack.filename ? null : pack.filename); }}
        disabled={isDeleting || isBatchToggling || isBatchDeleting || checkingUpdates || isCurrentlyUpdating} data-item-id={pack.filename} />
    );
    const itemDropdownNode = (
      <div ref={dropdownRef} className="absolute top-full right-0 mt-1 w-44 bg-opacity-80 backdrop-blur-md border rounded-md shadow-lg z-20 p-1 flex flex-col gap-0.5"
        onClick={(e) => e.stopPropagation()} style={{ backgroundColor: `${accentColor.value}CC`, borderColor: `${accentColor.value}50` }}>
        <button onClick={() => { if(pack.path) handleOpenFolder(pack); setActiveDropdownId(null); }} disabled={!pack.path}
          className="w-full text-left px-2 py-1.5 text-[11px] font-minecraft-ten hover:bg-[var(--accent-color-soft)] rounded-sm text-white/80 hover:text-white transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-50">
          <Icon icon="solar:folder-open-bold-duotone" className="w-3 h-3" /> Open Folder
        </button>
      </div>
    );

    return (
      <GenericDetailListItem key={pack.filename} id={pack.filename} isSelected={selectedPackIds.has(pack.filename)}
        onSelectionChange={(checked) => handlePackSelectionChange(pack.filename, checked)}
        iconNode={itemIconNode} title={itemTitle} descriptionNode={itemDescriptionNode} badgesNode={itemBadgesNode}
        updateActionNode={itemUpdateActionNode} mainActionNode={itemMainActionNode} deleteActionNode={itemDeleteActionNode}
        moreActionsTriggerNode={itemMoreActionsTriggerNode} dropdownNode={itemDropdownNode} isDropdownVisible={activeDropdownId === pack.filename}
        accentColor={accentColor.value}
      />
    );
  }, [
    accentColor.value, handleToggleDataPackEnabled, packBeingToggled, packBeingDeleted, handleDeleteDataPack, handleOpenFolder,
    profile, selectedPackIds, handlePackSelectionChange, isBatchToggling, isBatchDeleting, checkingUpdates, updatingPacks,
    dataPackUpdates, activeDropdownId, setActiveDropdownId, handleUpdateDataPack, dataPackModrinthIcons, localArchiveIcons
  ]);

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search data packs..." className="flex-grow !h-9"
          disabled={isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll} />
        <IconButton icon={<Icon icon="solar:add-circle-bold-duotone" />} onClick={handleAddDataPacks} 
          disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
          variant="secondary" size="sm" title="Add Data Packs" className="!h-9 !w-9 flex-shrink-0" />
        <IconButton icon={isLoading ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : <Icon icon="solar:refresh-outline" />}
          onClick={fetchDataPacksData} disabled={isLoading || isBatchToggling || isBatchDeleting || checkingUpdates || isUpdatingAll}
          variant="secondary" size="sm" title={isLoading ? "Refreshing..." : "Refresh Data Packs"} className="!h-9 !w-9 flex-shrink-0 ml-auto" />
      </div>
      {/* {updateError && ( ... )} */}
      {/* Always show this section, regardless of dataPacks.length */}
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
            disabled={filteredDataPacks.length === 0 || isBatchToggling || isBatchDeleting || isLoading || checkingUpdates || isUpdatingAll}
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
            {Object.keys(dataPackUpdates).length > 0 && (
              <Button size="sm" variant="success" onClick={handleUpdateAllAvailableDataPacks} disabled={isUpdatingAll || isLoading || isBatchToggling || isBatchDeleting || checkingUpdates} icon={isUpdatingAll ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : <Icon icon="solar:double-alt-arrow-up-bold-duotone" className="mr-1.5" />} className={selectedPackIds.size > 0 ? "ml-2" : ""}>
              {isUpdatingAll ? "Updating All..." : `Update All (${Object.keys(dataPackUpdates).length})`}
            </Button>
            )}
          </div>
        </div>
      </>
      {/* End of always shown section */}
    </div>
  );

  return (
    <>
      <GenericContentTab<DataPackInfo> items={filteredDataPacks} renderListItem={renderDataPackItem} isLoading={isLoading} error={error}
        searchQuery={searchQuery} primaryLeftActions={primaryLeftActionsContent} primaryRightActions={null}
        emptyStateIcon={DATA_PACKS_TAB_ICONS_TO_PRELOAD[0]}
        emptyStateMessage={
          error ? "Error loading data packs" :
          isLoading && dataPacks.length === 0 ? "Loading data packs..." :
          !searchQuery && dataPacks.length === 0 && selectedPackIds.size === 0 ? "No data packs found." :
          searchQuery && filteredDataPacks.length === 0 && selectedPackIds.size === 0 ? "No data packs match your search." :
          "Manage your data packs"
        }
        emptyStateDescription={
          error ? "Please try refreshing." :
          isLoading && dataPacks.length === 0 ? "Please wait..." :
          !searchQuery && dataPacks.length === 0 && selectedPackIds.size === 0 ? "Add data packs to this profile via its 'datapacks' folder." :
          searchQuery && filteredDataPacks.length === 0 && selectedPackIds.size === 0 ? "Try a different search." :
          "Select packs for batch actions or manage individually."
        }
        loadingItemCount={Math.min(dataPacks.length > 0 ? dataPacks.length : 5, 10)}
        showSkeletons={false} // Consistent with other V2 tabs
        accentColorOverride={accentColor.value}
      />
      <ConfirmDeleteDialog isOpen={isConfirmDeleteDialogOpen}
        itemName={isBatchDeleteConfirmActive ? `${selectedPackIds.size} data pack${selectedPackIds.size === 1 ? '' : 's'}` : (getDataPackFileName(packToDelete) || "item")}
        onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDeletion} isDeleting={isDialogActionLoading}
        title={isBatchDeleteConfirmActive ? "Delete Selected Data Packs?" : "Delete Data Pack?"}
      />
    </>
  );
} 