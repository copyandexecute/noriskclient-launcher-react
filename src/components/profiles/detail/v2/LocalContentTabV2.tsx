"use client";

import React, { useEffect, useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "../../../ui/buttons/Button";
import { IconButton } from "../../../ui/buttons/IconButton";
import { GenericDetailListItem } from "../items/GenericDetailListItem";
import { TagBadge } from "../../../ui/TagBadge";
import { useThemeStore } from "../../../../store/useThemeStore";
import { GenericContentTab } from "../../../ui/GenericContentTab";
import { preloadIcons } from "../../../../lib/icon-utils";
import type { Profile } from "../../../../types/profile";
import type { ModrinthVersion } from "../../../../types/modrinth";
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { formatFileSize } from "../../../../utils/format-file-size";
import { toast } from 'react-hot-toast';
import {
  useLocalContentManager,
  type LocalContentType, // UI type for specifying content
  type LocalContentItem // Base item type from the hook
} from "../../../../hooks/useLocalContentManager";
import type { NoriskModpacksConfig } from "../../../../types/noriskPacks";
import * as ProfileService from "../../../../services/profile-service";
import * as ContentService from "../../../../services/content-service"; // Added import
import { ContentType as BackendContentType } from "../../../../types/content"; // Added import
import { open, type DialogFilter } from "@tauri-apps/plugin-dialog"; // Corrected: DialogFile is not exported directly
import { Select, type SelectOption } from "../../../ui/Select";
import { ThemedSurface } from "../../../ui/ThemedSurface";

// Generic icons that can be used across different content types
const LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD = [
  "solar:gallery-bold-duotone",      // Fallback icon, empty state (can be overridden by prop)
  "solar:settings-bold-duotone",   // Placeholder for potential future settings
  "solar:info-circle-bold-duotone",// Placeholder for potential future info
  "solar:check-circle-bold",       // Enabled status
  "solar:close-circle-bold",       // Disabled status
  "solar:folder-open-bold-duotone",
  "solar:trash-bin-trash-bold",
  "solar:menu-dots-bold",
  "solar:sort-from_top_to_bottom-bold-duotone", // Placeholder for sort
  "solar:refresh-square-bold-duotone",          // Refresh button in list item (not used yet)
  "solar:cloud-download-bold-duotone",          // For Update Available button
  "solar:refresh-bold",                         // For Check for Updates loading spinner / general loading
  "solar:add-circle-bold-duotone",              // For Add Content button
  "solar:refresh-outline",                      // For primary refresh button normal state
  "solar:double-alt-arrow-up-bold-duotone",      // For Update All button
];

interface LocalContentTabV2Props<T extends LocalContentItem> {
  profile?: Profile;
  contentType: LocalContentType; // e.g., 'ResourcePack', 'ShaderPack'
  getDisplayFileName: (item: T) => string;
  itemTypeName: string; // Singular, e.g., "resource pack"
  itemTypeNamePlural: string; // Plural, e.g., "resource packs"
  addContentButtonText: string; // e.g., "Add Resource Packs"
  onAddContent?: () => void; // Action for the add button
  emptyStateIconOverride?: string; // Optional override for the main empty/fallback icon
  onRefreshRequired?: () => void;
}

export function LocalContentTabV2<T extends LocalContentItem>({
  profile,
  contentType,
  getDisplayFileName,
  itemTypeName,
  itemTypeNamePlural,
  addContentButtonText,
  onAddContent: onAddContentProp,
  emptyStateIconOverride,
  onRefreshRequired,
}: LocalContentTabV2Props<T>) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const [noriskPacksConfig, setNoriskPacksConfig] = useState<NoriskModpacksConfig | null>(null);
  const [isFetchingPacksConfig, setIsFetchingPacksConfig] = useState(false);
  const [isRefreshingPacksList, setIsRefreshingPacksList] = useState(false);

  const {
    items,
    isLoading,
    isFetchingHashes,
    isFetchingModrinthDetails,
    isAnyTaskRunning,
    error,
    searchQuery,
    setSearchQuery,
    selectedItemIds,
    handleItemSelectionChange,
    handleSelectAllToggle,
    areAllFilteredSelected,
    filteredItems,
    itemBeingToggled,
    itemBeingDeleted,
    isBatchToggling,
    isBatchDeleting,
    activeDropdownId,
    setActiveDropdownId,
    dropdownRef,
    isConfirmDeleteDialogOpen,
    isDialogActionLoading,
    handleConfirmDeletion,
    handleCloseDeleteDialog,
    itemToDeleteForDialog,
    modrinthIcons,
    localArchiveIcons,
    fetchData,
    handleToggleItemEnabled,
    handleDeleteItem,
    handleBatchToggleSelected,
    handleBatchDeleteSelected,
    handleOpenItemFolder,
    contentUpdates,
    isCheckingUpdates,
    itemsBeingUpdated,
    contentUpdateError,
    isUpdatingAll,
    checkForContentUpdates,
    handleUpdateContentItem,
    handleUpdateAllAvailableContent,
  } = useLocalContentManager<T>({ // Hook uses the generic type T
    profile,
    contentType,
    getDisplayFileName,
    onRefreshRequired,
  });

  // Fetch NoRiskPacksConfig if content type is NoRiskMod
  useEffect(() => {
    if (contentType === 'NoRiskMod' && profile) {
      const fetchPacks = async () => {
        setIsFetchingPacksConfig(true);
        try {
          const config = await ProfileService.getNoriskPacksResolved();
          setNoriskPacksConfig(config);
        } catch (err) {
          console.error("Failed to fetch NoRisk packs config:", err);
          toast.error("Failed to load NoRisk pack list.");
          setNoriskPacksConfig(null);
        } finally {
          setIsFetchingPacksConfig(false);
        }
      };
      fetchPacks();
    } else {
      setNoriskPacksConfig(null); // Clear if not NoRiskMod or no profile
    }
  }, [contentType, profile]);

  const handleRefreshPacksList = useCallback(async () => {
    if (contentType !== 'NoRiskMod') return;
    setIsRefreshingPacksList(true);
    try {
      await ProfileService.refreshNoriskPacks();
      const config = await ProfileService.getNoriskPacksResolved();
      setNoriskPacksConfig(config);
      toast.success("NoRisk Pack list refreshed.");
    } catch (err) {
      console.error("Failed to refresh NoRisk packs list:", err);
      toast.error("Failed to refresh NoRisk pack list.");
    } finally {
      setIsRefreshingPacksList(false);
    }
  }, [contentType]);

  const noriskPackOptions = useMemo((): SelectOption[] => {
    if (contentType !== 'NoRiskMod' || !noriskPacksConfig) {
      return [{ value: "", label: "- No Pack Selected -" }];
    }
    const options = Object.entries(noriskPacksConfig.packs).map(([id, packDef]) => ({
      value: id,
      label: packDef.displayName || id,
    }));
    options.sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "- No Pack Selected -" }, ...options];
  }, [contentType, noriskPacksConfig]);

  const handleSelectedPackChange = useCallback(async (newPackId: string | null) => {
    if (!profile || newPackId === profile.selected_norisk_pack_id) return;
    try {
      await ProfileService.updateProfile(profile.id, {
        selected_norisk_pack_id: newPackId,
      });
      if (onRefreshRequired) {
        onRefreshRequired();
      }
    } catch (err) {
      console.error("Failed to update selected NoRisk pack:", err);
      toast.error(`Failed to switch NoRisk pack: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [profile, onRefreshRequired]);

  // Update default onAddContent to use the new dialog and service call
  const defaultOnAddContent = async () => {
    if (!profile) {
      toast.error("Profile data is not available to add content.");
      return;
    }

    let dialogFilters: DialogFilter[] = [];
    const currentContentType = contentType; // from component props

    switch (currentContentType) {
      case 'Mod':
        dialogFilters = [{ name: 'Java Archives', extensions: ['jar', 'jar.disabled'] }];
        break;
      case 'ResourcePack':
        dialogFilters = [
          { name: 'Resource Pack Archives', extensions: ['zip', 'zip.disabled'] }, 
        ];
        break;
      case 'ShaderPack':
        dialogFilters = [{ name: 'Shader Pack Archives', extensions: ['zip', 'zip.disabled'] }];
        break;
      case 'DataPack':
        dialogFilters = [{ name: 'Data Pack Archives', extensions: ['zip', 'zip.disabled'] }];
        break;
      default:
        toast.error(`Local import is not configured for content type: ${currentContentType}`);
        return;
    }

    try {
      // `open` with `multiple: true` and `directory: false` returns `Promise<string[] | null>` 
      // representing absolute paths if no `baseDir` is specified.
      const selectedPathsArray = await open({
        multiple: true,
        directory: false, 
        filters: dialogFilters,
        title: `Select ${itemTypeNamePlural} to Import for profile: ${profile.name}`,
      });

      if (selectedPathsArray && selectedPathsArray.length > 0) {
        // selectedPathsArray is already string[]
        const filePaths = selectedPathsArray;

        const toastId = toast.loading(`Importing ${filePaths.length} ${itemTypeNamePlural.toLowerCase()}...`);
        try {
          await ContentService.installLocalContentToProfile({
            profile_id: profile.id,
            file_paths: filePaths,
            content_type: currentContentType as BackendContentType,
          });
          toast.success(
            `${filePaths.length} ${itemTypeNamePlural.toLowerCase()} import process initiated. List will refresh.`, 
            { id: toastId }
          );
          fetchData(true); 
          if (onRefreshRequired) {
            onRefreshRequired();
          }
        } catch (importError) {
          console.error(`Error importing local ${itemTypeNamePlural.toLowerCase()}:`, importError);
          toast.error(
            `Failed to import ${itemTypeNamePlural.toLowerCase()}: ${importError instanceof Error ? importError.message : String(importError)}`,
            { id: toastId }
          );
        }
      } else {
        // User cancelled or selected no files
      }
    } catch (dialogError) {
      console.error("Error opening file dialog:", dialogError);
      toast.error(
        `Could not open file dialog: ${dialogError instanceof Error ? dialogError.message : String(dialogError)}`
      );
    }
  };

  // Use the provided onAddContent prop if available, otherwise use the new default implementation.
  const effectiveOnAddContent = onAddContentProp || defaultOnAddContent;

  console.log(`LocalContentTabV2 (${contentType}): Render. isLoading: ${isLoading}, hook items: ${items.length}, filteredItems: ${filteredItems.length}, error: ${error}, searchQuery: '${searchQuery}'`);

  useEffect(() => {
    preloadIcons(LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD);
  }, []);

  const renderListItem = useCallback((item: T) => {
    const itemTitle = getDisplayFileName(item);
    const isToggling = itemBeingToggled === item.filename;
    const isDeleting = itemBeingDeleted === item.filename;
    const isCurrentlyUpdating = itemsBeingUpdated.has(item.filename);
    
    const updateAvailableVersion = item.sha1_hash ? contentUpdates[item.sha1_hash] : null;

    // Determine if this specific item is still waiting for hash or modrinth details
    // These flags help in showing per-item loading indicators if needed, though not explicitly used in UI yet
    const isItemWaitingForHash = item.sha1_hash === null && (isLoading || isFetchingHashes);
    const isItemWaitingForModrinth = item.sha1_hash !== null && !item.modrinth_info && (isLoading || isFetchingHashes || isFetchingModrinthDetails);

    let iconToShow: React.ReactNode;
    const modrinthProjectId = item.modrinth_info?.project_id;
    const modrinthIconUrl = modrinthProjectId ? modrinthIcons[modrinthProjectId] : null;
    const localIconDataUrl = item.path ? localArchiveIcons[item.path] : null;

    if (modrinthIconUrl) {
      iconToShow = (
        <img 
          src={modrinthIconUrl} 
          alt={`${itemTitle} Modrinth icon`} 
          className="w-full h-full object-contain image-pixelated"
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} 
        />
      );
    } else if (localIconDataUrl) {
      iconToShow = (
        <img 
          src={localIconDataUrl} 
          alt={`${itemTitle} local icon`} 
          className="w-full h-full object-contain image-pixelated"
        />
      );
    } else {
      iconToShow = (
        <Icon icon={emptyStateIconOverride || LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[0]} className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
      );
    }

    const itemIconNode = (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {iconToShow}
        </div>
    );

    // Reverting to IIFE for itemDescriptionNode to avoid "Rendered more hooks" error
    const itemDescriptionNode = (() => {
      let descriptionText: string;
      let titleText: string;

      const isItemWaitingForHash = item.sha1_hash === null && isFetchingHashes;
      const isItemStillLoadingDetails = isItemWaitingForHash || 
                                      (item.sha1_hash !== null && !item.modrinth_info && isFetchingModrinthDetails);

      // First check for fallback_version, especially useful for NoRisk mods
      if (item.fallback_version) {
        descriptionText = `Version: ${item.fallback_version}`;
        titleText = `Version: ${item.fallback_version}`;
      } else if (item.modrinth_info?.version_number) {
        descriptionText = `Version: ${item.modrinth_info.version_number}`;
        titleText = `Modrinth Version: ${item.modrinth_info.version_number}`;
      } else if (isItemStillLoadingDetails) {
        descriptionText = "Loading...";
        titleText = "Loading details...";
      } else {
        descriptionText = formatFileSize(item.file_size || 0);
        titleText = `Size: ${formatFileSize(item.file_size || 0)}`;
      }

      return (
        <span title={titleText}>
          {descriptionText}
          {item.is_directory && <span className="ml-1 text-xs text-white/60">(Folder)</span>}
        </span>
      );
    })(); // Immediately invoke the function

    const itemBadgesNode = (
      <>
        <TagBadge 
          size="sm"
          variant={!item.is_disabled ? "success" : "destructive"} 
          iconElement={!item.is_disabled ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[3]} className="w-3 h-3"/> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[4]} className="w-3 h-3"/>}
        >
          {!item.is_disabled ? "Enabled" : "Disabled"}
        </TagBadge>
        {item.modrinth_info && <TagBadge size="sm" variant="info">Modrinth</TagBadge>}
        {item.source_type && (
          <TagBadge size="sm" variant="warning">
            {item.source_type.charAt(0).toUpperCase() + item.source_type.slice(1)}
          </TagBadge>
        )}
      </>
    );
    
    let itemUpdateActionNode: React.ReactNode = null;
    // Prevent update action for NoRisk mods
    if (updateAvailableVersion && !isCurrentlyUpdating && !item.norisk_info) {
        if (!item.modrinth_info || item.modrinth_info.version_id !== updateAvailableVersion.id) {
            itemUpdateActionNode = (
                <IconButton
                size="sm"
                colorScheme="success"
                onClick={() => handleUpdateContentItem(item, updateAvailableVersion)}
                icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[10]} className="w-3.5 h-3.5" />}
                title={`Update to ${updateAvailableVersion.version_number}`}
                />
            );
        }
    } else if (isCurrentlyUpdating && !item.norisk_info) { // Also ensure no update indicator for NoRisk mods
      itemUpdateActionNode = (
         <IconButton
          size="sm"
          colorScheme="secondary"
          icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin w-3.5 h-3.5" />}
          title={`Updating...`} 
        />
      );
    }

    const itemMainActionNode = (
      <Button 
        size="sm"
        variant={!item.is_disabled ? "secondary" : "default"}
        onClick={() => handleToggleItemEnabled(item)}
      >
        {isToggling ? "..." : (!item.is_disabled ? "Disable" : "Enable")}
      </Button>
    );

    // Prevent delete action for NoRisk mods
    const itemDeleteActionNode: React.ReactNode = item.norisk_info ? null : (
      <IconButton
        title={`Delete ${itemTypeName}`}
        icon={isDeleting ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin w-3.5 h-3.5" /> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[6]} className="w-3.5 h-3.5" />}
        colorScheme="destructive"
        size="sm"
        onClick={() => handleDeleteItem(item)}
      />
    );

    const itemMoreActionsTriggerNode = (
      <IconButton
        title="More Actions"
        icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[7]} className="w-3.5 h-3.5" />} 
        colorScheme="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setActiveDropdownId(activeDropdownId === item.filename ? null : item.filename);
        }}
        data-item-id={item.filename} 
      />
    );
    
    const itemDropdownNode = (
      <ThemedSurface 
        className="absolute top-full right-0 mt-1 w-44 z-20" 
      >
        <div 
          ref={dropdownRef}
          className="flex flex-col gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { if(item.path) handleOpenItemFolder(item); setActiveDropdownId(null); }}
            className="w-full text-left px-2 py-1.5 text-[11px] font-minecraft-ten hover:bg-[var(--accent-color-soft)] rounded-sm text-white/80 hover:text-white transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[5]} className="w-3 h-3 flex-shrink-0" />
            Open Folder
          </button>
          {/* Add other generic actions here if needed */}
        </div>
      </ThemedSurface>
    );

    return (
      <GenericDetailListItem
        key={item.filename}
        id={item.filename}
        isSelected={selectedItemIds.has(item.filename)}
        onSelectionChange={(checked) => handleItemSelectionChange(item.filename, checked)}
        iconNode={itemIconNode}
        title={itemTitle}
        descriptionNode={itemDescriptionNode}
        badgesNode={itemBadgesNode}
        updateActionNode={itemUpdateActionNode}
        mainActionNode={itemMainActionNode}
        deleteActionNode={itemDeleteActionNode}
        moreActionsTriggerNode={itemMoreActionsTriggerNode}
        dropdownNode={itemDropdownNode}
        isDropdownVisible={activeDropdownId === item.filename}
        accentColor={accentColor.value}
      />
    );
  }, [
    accentColor.value, 
    getDisplayFileName, 
    handleToggleItemEnabled,
    itemBeingToggled,
    itemBeingDeleted,
    handleDeleteItem,
    handleOpenItemFolder,
    profile, 
    selectedItemIds,
    handleItemSelectionChange,
    isBatchToggling,
    isBatchDeleting,
    isCheckingUpdates,
    itemsBeingUpdated,
    contentUpdates,
    activeDropdownId,
    setActiveDropdownId,
    dropdownRef,
    handleUpdateContentItem,
    modrinthIcons,
    localArchiveIcons,
    isUpdatingAll,
    isAnyTaskRunning,
    isLoading, // Added for item-specific loading states
    isFetchingHashes,
    isFetchingModrinthDetails,
    itemTypeName,
    emptyStateIconOverride
  ]);

  const isBusyWithEssentialLoad = isLoading || (contentType === 'NoRiskMod' && (isFetchingPacksConfig || isRefreshingPacksList));
  const isAnyBatchActionInProgress = isBatchToggling || isBatchDeleting || isUpdatingAll;

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder={`Search ${itemTypeNamePlural}...`}
          className="flex-grow !h-9"
        />
        {effectiveOnAddContent && contentType !== 'NoRiskMod' && (
            <IconButton
                icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[12]} />}
                onClick={effectiveOnAddContent}
                colorScheme="secondary"
                size="sm"
                title={addContentButtonText}
                className="!h-9 !w-9 flex-shrink-0"
            />
        )}
        <IconButton
            icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[13]} />}
            onClick={() => fetchData(true)}
            colorScheme="secondary"
            size="sm"
            title="Refresh List"
            className="!h-9 !w-9 flex-shrink-0"
        />
      </div>
      {contentUpdateError && (
         <div className="text-xs text-red-400 p-1 bg-red-900/30 border border-red-700/50 rounded">
            Update Check Error: {contentUpdateError}
        </div>
      )}
      <>
        <div 
          className="h-px w-full my-1"
          style={{ backgroundColor: `${accentColor.value}30` }} 
        />
        <div className="flex items-center justify-between w-full min-h-14">
          {/* Left side: Select All Checkbox */} 
          <Checkbox
            customSize="md"
            checked={areAllFilteredSelected}
            onChange={(e) => handleSelectAllToggle(e.target.checked)}
            label={selectedItemIds.size > 0 ? `${selectedItemIds.size} selected` : "Select All"}
            title={areAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
          />

          {/* Right side: Action Buttons and NoRiskPack Dropdown */} 
          <div className="flex items-center gap-2">
            {/* Batch Toggle Button - Common for all types if items are selected */} 
            {selectedItemIds.size > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBatchToggleSelected}
                icon={isBatchToggling ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : undefined}
              >
                {isBatchToggling ? "Toggling..." : `Toggle (${selectedItemIds.size})`}
              </Button>
            )}

            {/* NoRisk Pack Selector - Only for NoRiskMod type */} 
            {contentType === 'NoRiskMod' && noriskPacksConfig && noriskPackOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <Select
                  value={profile?.selected_norisk_pack_id || ""}
                  onChange={(value) => handleSelectedPackChange(value === "" ? null : value)}
                  options={noriskPackOptions}
                  placeholder="Select Pack..."
                  className="!h-9 text-sm min-w-[180px] max-w-[250px] truncate"
                  size="sm"
                />
                {profile?.selected_norisk_pack_id && noriskPacksConfig?.packs[profile.selected_norisk_pack_id]?.isExperimental && (
                  <div className="text-xs text-yellow-500/80 font-minecraft">
                    (Experimental)
                  </div>
                )}
              </div>
            )}

            {/* Delete and Update All buttons - Only for non-NoRiskMod types */} 
            {contentType !== 'NoRiskMod' && (
              <>
                {selectedItemIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBatchDeleteSelected}
                    icon={isBatchDeleting ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : undefined}
                  >
                    {isBatchDeleting ? "Deleting..." : `Delete (${selectedItemIds.size})`}
                  </Button>
                )}
                {Object.keys(contentUpdates).length > 0 && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleUpdateAllAvailableContent}
                    icon={isUpdatingAll ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[14]} className="mr-1.5" />}
                    className={selectedItemIds.size > 0 ? "ml-2" : ""}
                  >
                    {isUpdatingAll ? "Updating All..." : `Update All (${Object.keys(contentUpdates).length})`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </>
    </div>
  );

  const primaryRightActionsContent = null;
  
  if (!profile) {
    return (
      <div className="p-4 font-minecraft text-center text-white/70">
        Profile data is not available. Cannot display {itemTypeNamePlural.toLowerCase()}.
      </div>
    );
  }

  const hasSelectedItems = selectedItemIds.size > 0;
  const showNoRiskPackSelector = contentType === 'NoRiskMod';
  const isNoRiskPackSelected = showNoRiskPackSelector && profile?.selected_norisk_pack_id;

  // Dynamic empty state messages
  const getEmptyStateMessage = () => {
    if (contentType === 'NoRiskMod' && !profile?.selected_norisk_pack_id) {
      return "No NoRisk Pack Selected";
    } else if (error) {
      return `Error loading ${itemTypeNamePlural}`;
    } else if ((isLoading || isFetchingPacksConfig) && items.length === 0) {
      return `Loading ${itemTypeNamePlural}...`;
    } else if (!searchQuery && items.length === 0 && selectedItemIds.size === 0) {
      return `No ${itemTypeNamePlural} found in this profile.`;
    } else if (searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0) {
      return `No ${itemTypeNamePlural} match your search.`;
    } else {
      return `Manage your ${itemTypeNamePlural}`;
    }
  };

  const getEmptyStateDescription = () => {
    if (contentType === 'NoRiskMod' && !profile?.selected_norisk_pack_id) {
      return "Please select a NoRisk Modpack from the dropdown to manage its mods.";
    } else if (error) {
      return "Please try refreshing or check the console.";
    } else if ((isLoading || isFetchingPacksConfig) && items.length === 0) {
      return "Please wait while content is being loaded.";
    } else if (!searchQuery && items.length === 0 && selectedItemIds.size === 0) {
      return `You can add ${itemTypeNamePlural} to this profile or via Modrinth (if supported).`;
    } else if (searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0) {
      return "Try a different search term or clear the search filter.";
    } else {
      return `Select ${itemTypeNamePlural} to perform batch actions or manage them individually.`;
    }
  };

  return (
    <>
      <GenericContentTab<T> 
        items={contentType === 'NoRiskMod' && !profile?.selected_norisk_pack_id ? [] : filteredItems}
        renderListItem={renderListItem} 
        isLoading={isLoading} 
        error={error} 
        searchQuery={searchQuery} 
        primaryLeftActions={primaryLeftActionsContent}
        primaryRightActions={primaryRightActionsContent}
        emptyStateIcon={emptyStateIconOverride || LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[0]} 
        emptyStateMessage={getEmptyStateMessage()}
        emptyStateDescription={getEmptyStateDescription()}
        loadingItemCount={Math.min(items.length > 0 ? items.length : 5, 10)}
        showSkeletons={false} 
        accentColorOverride={accentColor.value}
      />
    
      <ConfirmDeleteDialog
        isOpen={isConfirmDeleteDialogOpen}
        itemName={itemToDeleteForDialog ? getDisplayFileName(itemToDeleteForDialog) : `${selectedItemIds.size} ${itemTypeName}${selectedItemIds.size === 1 ? '' : 's'}`}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeletion}
        isDeleting={isDialogActionLoading}
        title={itemToDeleteForDialog ? `Delete ${getDisplayFileName(itemToDeleteForDialog)}?` : `Delete Selected ${itemTypeNamePlural}?`}
      />
    </>
  );
} 