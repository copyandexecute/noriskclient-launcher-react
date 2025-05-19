"use client";

import React, { useEffect, useCallback, useMemo } from "react";
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
// import { debugLog } from "../../../../lib/debugLog"; // Commented out or remove if not used elsewhere

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
  "solar:double-alt-arrow-up-bold-duotone"      // For Update All button
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
  onAddContent = () => toast(`PROTOTYPE: ${addContentButtonText} feature not implemented yet.`),
  emptyStateIconOverride,
  onRefreshRequired,
}: LocalContentTabV2Props<T>) {
  const accentColor = useThemeStore((state) => state.accentColor);

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
    const localIconDataUrl = localArchiveIcons[item.filename];

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

      if (item.modrinth_info?.version_number) {
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
      </>
    );
    
    let itemUpdateActionNode: React.ReactNode = null;
    if (updateAvailableVersion && !isCurrentlyUpdating) {
        if (!item.modrinth_info || item.modrinth_info.version_id !== updateAvailableVersion.id) {
            itemUpdateActionNode = (
                <IconButton
                size="sm"
                colorScheme="success"
                onClick={() => handleUpdateContentItem(item, updateAvailableVersion)}
                disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting || isUpdatingAll || isAnyTaskRunning}
                icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[10]} className="w-3.5 h-3.5" />}
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
        disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting || isAnyTaskRunning}
      >
        {isToggling ? "..." : (!item.is_disabled ? "Disable" : "Enable")}
      </Button>
    );

    const itemDeleteActionNode = (
      <IconButton
        title={`Delete ${itemTypeName}`}
        icon={isDeleting ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin w-3.5 h-3.5" /> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[6]} className="w-3.5 h-3.5" />} 
        colorScheme="destructive"
        size="sm"
        onClick={() => handleDeleteItem(item)}
        disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting || isAnyTaskRunning}
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
        disabled={isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting || isAnyTaskRunning}
        data-item-id={item.filename} 
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
          onClick={() => { if(item.path) handleOpenItemFolder(item); setActiveDropdownId(null); }}
          disabled={!item.path}
          className="w-full text-left px-2 py-1.5 text-[11px] font-minecraft-ten hover:bg-[var(--accent-color-soft)] rounded-sm text-white/80 hover:text-white transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[5]} className="w-3 h-3 flex-shrink-0" />
          Open Folder
        </button>
        {/* Add other generic actions here if needed */}
      </div>
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

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder={`Search ${itemTypeNamePlural}...`} 
          className="flex-grow !h-9"
          disabled={isAnyTaskRunning || isLoading}
        />
        {onAddContent && (
            <IconButton
                icon={<Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[12]} />}
                onClick={onAddContent} 
                disabled={isAnyTaskRunning || isLoading}
                colorScheme="secondary"
                size="sm"
                title={addContentButtonText} 
                className="!h-9 !w-9 flex-shrink-0"
            />
        )}
        <IconButton
            icon={isAnyTaskRunning || isLoading ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin" /> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[13]} />}
            onClick={() => fetchData(true)} 
            disabled={isAnyTaskRunning || isLoading}
            colorScheme="secondary"
            size="sm"
            title={isAnyTaskRunning || isLoading ? "Refreshing..." : `Refresh ${itemTypeNamePlural}`} 
            className="!h-9 !w-9 flex-shrink-0 ml-auto"
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
          <Checkbox
            customSize="md" 
            checked={areAllFilteredSelected}
            onChange={(e) => handleSelectAllToggle(e.target.checked)}
            disabled={filteredItems.length === 0 || isAnyTaskRunning || isLoading}
            label={selectedItemIds.size > 0 ? `${selectedItemIds.size} selected` : "Select All"}
            title={areAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
          />
          <div className="flex items-center gap-2">
            {selectedItemIds.size > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={handleBatchToggleSelected} disabled={isAnyTaskRunning || isLoading} icon={isBatchToggling ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchToggling ? "Toggling..." : `Toggle (${selectedItemIds.size})`}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBatchDeleteSelected} disabled={isAnyTaskRunning || isLoading} icon={isBatchDeleting ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchDeleting ? "Deleting..." : `Delete (${selectedItemIds.size})`}
                </Button>
              </>
            )}
            {Object.keys(contentUpdates).length > 0 && (
              <Button size="sm" variant="success" onClick={handleUpdateAllAvailableContent} disabled={isAnyTaskRunning || isLoading} icon={isUpdatingAll ? <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[11]} className="animate-spin mr-1.5" /> : <Icon icon={LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[14]} className="mr-1.5" />} className={selectedItemIds.size > 0 ? "ml-2" : ""}>
              {isUpdatingAll ? "Updating All..." : `Update All (${Object.keys(contentUpdates).length})`}
            </Button>
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

  return (
    <>
      <GenericContentTab<T> 
        items={filteredItems}
        renderListItem={renderListItem} 
        isLoading={isLoading} // Only initial full load now
        error={error} 
        searchQuery={searchQuery} 
        primaryLeftActions={primaryLeftActionsContent}
        primaryRightActions={primaryRightActionsContent}
        emptyStateIcon={emptyStateIconOverride || LOCAL_CONTENT_TAB_ICONS_TO_PRELOAD[0]} 
        emptyStateMessage={ 
          error ? `Error loading ${itemTypeNamePlural}` :
          isLoading && items.length === 0 ? `Loading ${itemTypeNamePlural}...` :
          !searchQuery && items.length === 0 && selectedItemIds.size === 0 ? `No ${itemTypeNamePlural} found in this profile.` :
          searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0 ? `No ${itemTypeNamePlural} match your search.` :
          `Manage your ${itemTypeNamePlural}`
        }
        emptyStateDescription={
          error ? "Please try refreshing or check the console." :
          isLoading && items.length === 0 ? "Please wait while content is being loaded." :
          !searchQuery && items.length === 0 && selectedItemIds.size === 0 ? `You can add ${itemTypeNamePlural} to this profile or via Modrinth (if supported).` :
          searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0 ? "Try a different search term or clear the search filter." :
          `Select ${itemTypeNamePlural} to perform batch actions or manage them individually.`
        }
        loadingItemCount={Math.min(items.length > 0 ? items.length : 5, 10)}
        showSkeletons={false} // Skeletons are handled by GenericContentTab if isLoading is true and items are empty
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