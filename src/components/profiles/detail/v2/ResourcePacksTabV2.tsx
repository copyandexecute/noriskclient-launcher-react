"use client";

import { Icon } from "@iconify/react";
import { Button } from "../../../ui/buttons/Button";
import { IconButton } from "../../../ui/buttons/IconButton";
import { GenericDetailListItem } from "../items/GenericDetailListItem";
import { TagBadge } from "../../../ui/TagBadge";
import { useThemeStore } from "../../../../store/useThemeStore";
import { useEffect, useCallback, useMemo } from "react";
import { GenericContentTab } from "../../../ui/GenericContentTab";
import { preloadIcons } from "../../../../lib/icon-utils";
import type { Profile } from "../../../../types/profile";
import type { 
  ResourcePackInfo,
  ModrinthVersion,
} from "../../../../types/modrinth";
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { formatFileSize } from "../../../../utils/format-file-size";
import { toast } from 'react-hot-toast';
import {
  useLocalContentManager,
} from "../../../../hooks/useLocalContentManager";

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
  profile?: Profile; 
  onRefreshRequired?: () => void; 
}

const getResourcePackFileName = (pack: ResourcePackInfo | null | undefined): string => {
  if (!pack) return "Unknown Resource Pack";
  if (pack.filename && pack.filename !== "0") return pack.filename;
  if (pack.path) {
    const parts = pack.path.split(/[\/\\]/); 
    return parts[parts.length - 1] || "Unknown file";
  }
  return "Unknown Resource Pack";
};

export function ResourcePacksTabV2({ profile, onRefreshRequired }: ResourcePacksTabV2Props) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const {
    items: resourcePacks,
    isLoading,
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
  } = useLocalContentManager<ResourcePackInfo>({
    profile,
    contentType: 'ResourcePack',
    getDisplayFileName: getResourcePackFileName,
    onRefreshRequired,
  });

  useEffect(() => {
    preloadIcons(RESOURCE_PACKS_TAB_ICONS_TO_PRELOAD);
  }, []);

  useEffect(() => {
    const initialLoad = async () => {
    if (profile?.id) {
        await fetchData();
      }
    };
    initialLoad();
  }, [profile?.id, fetchData]);

  const handleAddResourcePacks = () => toast("PROTOTYPE: Add Resource Packs feature not implemented yet.");

  const renderResourcePackItem = useCallback((pack: ResourcePackInfo) => {
    const itemTitle = getResourcePackFileName(pack);
    const isToggling = itemBeingToggled === pack.filename;
    const isDeleting = itemBeingDeleted === pack.filename;
    const isCurrentlyUpdating = itemsBeingUpdated.has(pack.filename);
    
    const updateAvailableVersion = pack.sha1_hash ? contentUpdates[pack.sha1_hash] : null;

    let iconToShow: React.ReactNode;
    const modrinthProjectId = pack.modrinth_info?.project_id;
    const modrinthIconUrl = modrinthProjectId ? modrinthIcons[modrinthProjectId] : null;
    const localIconDataUrl = localArchiveIcons[pack.filename];

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
                onClick={() => handleUpdateContentItem(pack, updateAvailableVersion)}
                disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting || isCheckingUpdates || isUpdatingAll}
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
        onClick={() => handleToggleItemEnabled(pack)}
        disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting }
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
        onClick={() => handleDeleteItem(pack)}
        disabled={isToggling || isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting}
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
          setActiveDropdownId(activeDropdownId === pack.filename ? null : pack.filename);
        }}
        disabled={isDeleting || isCurrentlyUpdating || isBatchToggling || isBatchDeleting}
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
          onClick={() => { if(pack.path) handleOpenItemFolder(pack); setActiveDropdownId(null); }}
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
        isSelected={selectedItemIds.has(pack.filename)}
        onSelectionChange={(checked) => handleItemSelectionChange(pack.filename, checked)}
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
    isUpdatingAll
  ]);

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder="Search resource packs..." 
          className="flex-grow !h-9"
          disabled={isBatchToggling || isBatchDeleting || isLoading || isCheckingUpdates || isUpdatingAll}
        />
        <IconButton
            icon={<Icon icon="solar:add-circle-bold-duotone" />}
            onClick={handleAddResourcePacks} 
            disabled={isLoading || isBatchToggling || isBatchDeleting || isCheckingUpdates || isUpdatingAll}
            colorScheme="secondary"
            size="sm"
            title="Add Resource Packs" 
            className="!h-9 !w-9 flex-shrink-0"
        />
        <IconButton
            icon={isLoading ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : <Icon icon="solar:refresh-outline" />}
            onClick={fetchData} 
            disabled={isLoading || isBatchToggling || isBatchDeleting || isCheckingUpdates || isUpdatingAll}
            colorScheme="secondary"
            size="sm"
            title={isLoading ? "Refreshing..." : "Refresh Resource Packs"} 
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
            disabled={filteredItems.length === 0 || isBatchToggling || isBatchDeleting || isLoading || isCheckingUpdates || isUpdatingAll}
            label={selectedItemIds.size > 0 ? `${selectedItemIds.size} selected` : "Select All"}
            title={areAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
          />
          <div className="flex items-center gap-2">
            {selectedItemIds.size > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={handleBatchToggleSelected} disabled={isBatchToggling || isBatchDeleting || isLoading || isCheckingUpdates || isUpdatingAll} icon={isBatchToggling ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchToggling ? "Toggling..." : `Toggle (${selectedItemIds.size})`}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBatchDeleteSelected} disabled={isBatchToggling || isBatchDeleting || isLoading || isCheckingUpdates || isUpdatingAll} icon={isBatchDeleting ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : undefined}>
                  {isBatchDeleting ? "Deleting..." : `Delete (${selectedItemIds.size})`}
                </Button>
              </>
            )}
            {Object.keys(contentUpdates).length > 0 && (
              <Button size="sm" variant="success" onClick={handleUpdateAllAvailableContent} disabled={isUpdatingAll || isLoading || isBatchToggling || isBatchDeleting || isCheckingUpdates} icon={isUpdatingAll ? <Icon icon="solar:refresh-bold" className="animate-spin mr-1.5" /> : <Icon icon="solar:double-alt-arrow-up-bold-duotone" className="mr-1.5" />} className={selectedItemIds.size > 0 ? "ml-2" : ""}>
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
        Profile data is not available. Cannot display resource packs.
      </div>
    );
  }

  return (
    <>
      <GenericContentTab<ResourcePackInfo> 
        items={filteredItems}
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
          !searchQuery && resourcePacks.length === 0 && selectedItemIds.size === 0 ? "No resource packs found in this profile." :
          searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0 ? "No resource packs match your search." :
          "Manage your resource packs"
        }
        emptyStateDescription={
          error ? "Please try refreshing or check the console." :
          isLoading && resourcePacks.length === 0 ? "Please wait while packs are being loaded." :
          !searchQuery && resourcePacks.length === 0 && selectedItemIds.size === 0 ? "You can add resource packs to this profile by placing them in the profile's resourcepacks folder or via Modrinth (if supported)." :
          searchQuery && filteredItems.length === 0 && selectedItemIds.size === 0 ? "Try a different search term or clear the search filter." :
          "Select packs to perform batch actions or manage them individually."
        }
        loadingItemCount={Math.min(resourcePacks.length > 0 ? resourcePacks.length : 5, 10)}
        showSkeletons={false}
        accentColorOverride={accentColor.value}
      />
    
      <ConfirmDeleteDialog
        isOpen={isConfirmDeleteDialogOpen}
        itemName={itemToDeleteForDialog ? getResourcePackFileName(itemToDeleteForDialog) : `${selectedItemIds.size} pack${selectedItemIds.size === 1 ? '' : 's'}`}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeletion}
        isDeleting={isDialogActionLoading}
        title={itemToDeleteForDialog ? `Delete ${getResourcePackFileName(itemToDeleteForDialog)}?` : "Delete Selected Packs?"}
      />
    </>
  );
} 


