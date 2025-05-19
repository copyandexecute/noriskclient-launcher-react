import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';
import type { Profile, LocalContentItem as ProfileLocalContentItem, GenericModrinthInfo as ProfileGenericModrinthInfo, LoadItemsParams } from '../types/profile';
import type { ModrinthVersion, ModrinthBulkUpdateRequestBody, ModrinthHashAlgorithm, ResourcePackModrinthInfo, ShaderPackModrinthInfo, DataPackModrinthInfo } from '../types/modrinth';
import { ContentType as NrContentType } from '../types/content';
import type { ToggleContentPayload } from '../types/content';
import { ModrinthService } from '../services/modrinth-service';
import { getLocalContent } from '../services/profile-service';
import { toggleContentFromProfile } from '../services/content-service';

// Base type for content items managed by this hook - maps to ProfileLocalContentItem
// We'll use ProfileLocalContentItem directly or ensure T extends it.
export interface LocalContentItem extends ProfileLocalContentItem { 
  path: string;
  // This can be used to extend ProfileLocalContentItem with frontend-specific fields if needed
  // For now, it will be structurally the same as ProfileLocalContentItem
}

// Enum for the types of content this hook can manage (used for UI/logic, maps to NrContentType for backend)
export type LocalContentType = 'ShaderPack' | 'ResourcePack' | 'DataPack' | 'Mod';

interface UseLocalContentManagerProps<T extends LocalContentItem> {
  profile?: Profile;
  contentType: LocalContentType;
  getDisplayFileName: (item: T) => string;
  onRefreshRequired?: () => void;
}

interface UseLocalContentManagerReturn<T extends LocalContentItem> {
  items: T[];
  isLoading: boolean;
  isFetchingHashes: boolean;
  isFetchingModrinthDetails: boolean;
  isAnyTaskRunning: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedItemIds: Set<string>;
  handleItemSelectionChange: (itemId: string, isSelected: boolean) => void;
  handleSelectAllToggle: (isChecked: boolean) => void;
  areAllFilteredSelected: boolean;
  filteredItems: T[];

  itemBeingToggled: string | null;
  itemBeingDeleted: string | null;
  isBatchToggling: boolean;
  isBatchDeleting: boolean;

  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;

  isConfirmDeleteDialogOpen: boolean;
  isDialogActionLoading: boolean;
  handleConfirmDeletion: () => Promise<void>;
  handleCloseDeleteDialog: () => void;
  itemToDeleteForDialog: T | null;

  modrinthIcons: Record<string, string | null>;
  localArchiveIcons: Record<string, string | null>;

  contentUpdates: Record<string, ModrinthVersion | null>;
  isCheckingUpdates: boolean;
  itemsBeingUpdated: Set<string>;
  contentUpdateError: string | null;
  isUpdatingAll: boolean;

  fetchData: (initialFetch?: boolean) => Promise<void>;
  handleToggleItemEnabled: (item: T) => Promise<void>;
  handleDeleteItem: (item: T) => void;
  handleBatchToggleSelected: () => Promise<void>;
  handleBatchDeleteSelected: () => void;
  handleOpenItemFolder: (item: T) => void;

  checkForContentUpdates: (currentProfile?: Profile, currentItems?: T[]) => Promise<void>;
  handleUpdateContentItem: (item: T, updateVersion: ModrinthVersion, preventRefetch?: boolean) => Promise<void>;
  handleUpdateAllAvailableContent: () => Promise<void>;
}

// Helper to map LocalContentType (UI string) to NrContentType (backend enum string)
function mapUiContentTypeToBackend(uiType: LocalContentType): NrContentType {
  switch (uiType) {
    case 'ResourcePack': return NrContentType.ResourcePack;
    case 'ShaderPack': return NrContentType.ShaderPack;
    case 'DataPack': return NrContentType.DataPack;
    case 'Mod': return NrContentType.Mod;
    default: throw new Error(`Unsupported UI content type: ${uiType}`);
  }
}

// Helper to map backend ProfileLocalContentItem to frontend T (which extends LocalContentItem)
function mapBackendItemToFrontendType<T extends LocalContentItem>(backendItem: ProfileLocalContentItem): T {
  const { path_str, ...rest } = backendItem;
  // ProfileGenericModrinthInfo is used by ProfileLocalContentItem
  // T expects a modrinth_info structure compatible with ProfileGenericModrinthInfo
  // (e.g. ResourcePackInfo uses ResourcePackModrinthInfo which is compatible)
  return {
    ...rest,
    path: path_str, // Map path_str to path
  } as T;
}

// Helper function to create ToggleContentPayload
function createTogglePayload<T extends LocalContentItem>(
  item: T,
  profileId: string,
  uiContentType: LocalContentType,
  targetEnabledState: boolean // This is the 'enabled' field for the payload
): ToggleContentPayload | null {
  const backendContentType = mapUiContentTypeToBackend(uiContentType);

  const payloadBase: Omit<ToggleContentPayload, 'sha1_hash' | 'file_path' | 'norisk_mod_identifier'> = {
    profile_id: profileId,
    enabled: targetEnabledState,
    content_type: backendContentType,
  };

  if (uiContentType === 'Mod') {
    const noriskId = (item as any).norisk_mod_identifier; 
    if (noriskId) {
      return { ...payloadBase, norisk_mod_identifier: noriskId };
    } else if (item.sha1_hash) {
      const modPayload: ToggleContentPayload = {...payloadBase, sha1_hash: item.sha1_hash};
      // Also include file_path if available, backend can prioritize
      if (item.path) {
        modPayload.file_path = item.path;
      }
      return modPayload;
    } else if (item.path) {
      // Local mod with no hash, identified by path
      return { ...payloadBase, file_path: item.path };
    } else {
      toast.error(`Mod item ${item.filename} is missing essential identifiers (SHA1, NoRiskID, or Path) for toggle.`);
      return null;
    }
  } else {
    // For ResourcePacks, ShaderPacks, DataPacks, use file_path
    if (item.path) {
      return { ...payloadBase, file_path: item.path };
    } else {
      toast.error(`Path is missing for ${uiContentType} ${item.filename}. Cannot toggle.`);
      return null;
    }
  }
}

export function useLocalContentManager<T extends LocalContentItem>({
  profile,
  contentType,
  getDisplayFileName,
  onRefreshRequired,
}: UseLocalContentManagerProps<T>): UseLocalContentManagerReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isInitialLoadingState, setIsInitialLoadingState] = useState(false);
  const [isFetchingHashesState, setIsFetchingHashesState] = useState(false);
  const [isFetchingModrinthDetailsState, setIsFetchingModrinthDetailsState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const [itemBeingToggled, setItemBeingToggled] = useState<string | null>(null);
  const [itemBeingDeleted, setItemBeingDeleted] = useState<string | null>(null);
  const [isBatchToggling, setIsBatchToggling] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDeleteForDialog, setItemToDeleteForDialog] = useState<T | null>(null);
  const [isBatchDeleteConfirmActive, setIsBatchDeleteConfirmActive] = useState(false);
  const [isDialogActionLoading, setIsDialogActionLoading] = useState(false);

  const [modrinthIcons, setModrinthIcons] = useState<Record<string, string | null>>({});
  const [localArchiveIcons, setLocalArchiveIcons] = useState<Record<string, string | null>>({});
  const [hashesToFetchModrinthDetailsFor, setHashesToFetchModrinthDetailsFor] = useState<string[] | null>(null);

  const [contentUpdates, setContentUpdates] = useState<Record<string, ModrinthVersion | null>>({});
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [itemsBeingUpdated, setItemsBeingUpdated] = useState<Set<string>>(new Set());
  const [contentUpdateError, setContentUpdateError] = useState<string | null>(null);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  const onRefreshRequiredRef = useRef(onRefreshRequired);
  useEffect(() => {
    onRefreshRequiredRef.current = onRefreshRequired;
  }, [onRefreshRequired]);

  // Generic Phase 1: Fetch basic info for all content types
  const fetchBasicInfo = useCallback(async (): Promise<void> => {
    if (!profile?.id) {
      setItems([]);
      return;
    }
    setIsInitialLoadingState(true);
    setIsFetchingHashesState(false);
    setIsFetchingModrinthDetailsState(false);
    setError(null);
    setModrinthIcons({});
    setLocalArchiveIcons({});
    setContentUpdates({});
    setContentUpdateError(null);
    setHashesToFetchModrinthDetailsFor(null); // Reset this here

    const backendContentType = mapUiContentTypeToBackend(contentType);
    console.log(`[${contentType}] Phase 1: Fetching basic info...`, new Date().toISOString());
    try {
      const serviceParams: LoadItemsParams = {
        profile_id: profile.id,
        content_type: backendContentType,
        calculate_hashes: false,
        fetch_modrinth_data: false,
      };
      const fetchedBackendItems = await getLocalContent(serviceParams) as ProfileLocalContentItem[];
      console.log(`[${contentType}] Phase 1: Raw items from getLocalContent`, new Date().toISOString(), fetchedBackendItems);

      const mappedItemsToFrontend = fetchedBackendItems.map(item => mapBackendItemToFrontendType<T>(item));
      const processedBasicItems = mappedItemsToFrontend.map(item => ({
        ...item,
        filename: item.filename || getDisplayFileName(item),
        modrinth_info: null, // Ensure modrinth_info is initially null
        sha1_hash: null, // Ensure sha1_hash is initially null for Phase 1
      }));
      setItems(processedBasicItems as T[]);
      console.log(`[${contentType}] Phase 1: Basic items set`, new Date().toISOString(), processedBasicItems);
      setSelectedItemIds(new Set());
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    } catch (err) {
      console.error(`[${contentType}] Phase 1: Error fetching basic info:`, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInitialLoadingState(false);
    }
  }, [profile?.id, contentType, getDisplayFileName]);

  // Generic Phase 2: Fetch hashes and update items
  const fetchHashesAndUpdateItems = useCallback(async (): Promise<void> => {
    if (!profile?.id || items.length === 0) return;

    const backendContentType = mapUiContentTypeToBackend(contentType);
    console.log(`[${contentType}] Phase 2: Fetching hashes and full local info...`, new Date().toISOString());
    setIsFetchingHashesState(true);
    setError(null); // Clear previous errors before this specific phase

    try {
      const serviceParams: LoadItemsParams = {
        profile_id: profile.id,
        content_type: backendContentType,
        calculate_hashes: true,
        fetch_modrinth_data: false, // Modrinth details via JS in Phase 3
      };
      const fetchedBackendItemsWithHashes = await getLocalContent(serviceParams) as ProfileLocalContentItem[];
      console.log(`[${contentType}] Phase 2: Raw items with hashes from getLocalContent`, new Date().toISOString(), fetchedBackendItemsWithHashes);
      
      const mappedItemsToFrontend = fetchedBackendItemsWithHashes.map(item => mapBackendItemToFrontendType<T>(item));

      setItems(currentItems =>
        currentItems.map(currentItem => {
          const match = mappedItemsToFrontend.find(fi => fi.path === currentItem.path);
          if (match) { // Merge all details from the hash-calculated fetch
            return { 
              ...currentItem, 
              sha1_hash: match.sha1_hash, 
              file_size: match.file_size, 
              is_disabled: match.is_disabled,
              is_directory: match.is_directory, // Ensure this is also updated
              // Modrinth info is still deferred to Phase 3
            } as T;
          }
          return currentItem;
        })
      );

      const allKnownHashes = mappedItemsToFrontend
        .map(item => item.sha1_hash)
        .filter(hash => hash != null) as string[];
      
      if (allKnownHashes.length > 0) {
        console.log(`[${contentType}] Phase 2: Hashes obtained, setting for Modrinth lookup.`, new Date().toISOString(), allKnownHashes);
        setHashesToFetchModrinthDetailsFor(allKnownHashes);
      } else {
        setHashesToFetchModrinthDetailsFor(null);
      }
    } catch (err) {
      console.error(`[${contentType}] Phase 2: Error fetching hashes:`, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsFetchingHashesState(false);
    }
  }, [profile?.id, contentType, items, getDisplayFileName]); // items is a dependency here

  // fetchData now just calls fetchBasicInfo, which is Phase 1
  const fetchData = useCallback(async (initialFetch = true): Promise<void> => {
    // The 'initialFetch' parameter for fetchData is now more about resetting UI states like selection
    // The actual data fetching sequence is managed by fetchBasicInfo and subsequent effects.
    if (initialFetch) {
      // Reset things that should clear on a full manual refresh
      setSelectedItemIds(new Set());
      // Potentially clear other states if needed for a true "hard refresh" feel
    }
    await fetchBasicInfo(); // Await the async fetchBasicInfo
  }, [fetchBasicInfo]);

  // Initial data fetch (Phase 1)
  useEffect(() => {
    fetchBasicInfo();
  }, [fetchBasicInfo]);
  
  // Phase 2: Trigger Fetch Hashes (for all content types)
  useEffect(() => {
    // Only trigger if Phase 1 is done, and there are items that might need hashes,
    // and hash fetching isn't already in progress.
    if (!isInitialLoadingState && items.length > 0 && items.some(item => item.sha1_hash === null) && !isFetchingHashesState) {
      fetchHashesAndUpdateItems(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isInitialLoadingState, isFetchingHashesState, fetchHashesAndUpdateItems]); // fetchHashesAndUpdateItems is memoized
  
  // Phase 3: Fetch Modrinth project details based on hashes (existing logic, should be fine)
  useEffect(() => {
    if (hashesToFetchModrinthDetailsFor && hashesToFetchModrinthDetailsFor.length > 0 && profile?.id && !isFetchingModrinthDetailsState) {
      console.log(`[${contentType}] Phase 3: Triggering Modrinth project details fetch for hashes`, new Date().toISOString(), hashesToFetchModrinthDetailsFor);
      setIsFetchingModrinthDetailsState(true);
      const fetchModrinthDataByHashes = async () => {
        try {
          const modrinthVersionsMap = await ModrinthService.getVersionsByHashes(hashesToFetchModrinthDetailsFor!);
          console.log(`[${contentType}] Phase 3: Modrinth data received`, new Date().toISOString(), modrinthVersionsMap);
          setItems(currentItems =>
            currentItems.map(item => {
              if (item.sha1_hash && modrinthVersionsMap[item.sha1_hash]) {
                const modrinthVersion = modrinthVersionsMap[item.sha1_hash];
                const primaryFile = modrinthVersion.files.find(f => f.primary) || modrinthVersion.files[0];
                // Ensure mapping to ProfileGenericModrinthInfo structure
                const newModrinthInfo: ProfileGenericModrinthInfo | null = primaryFile ? {
                  project_id: modrinthVersion.project_id,
                  version_id: modrinthVersion.id,
                  name: modrinthVersion.name, 
                  version_number: modrinthVersion.version_number,
                  download_url: primaryFile.url,
                } : null;
                return { ...item, modrinth_info: newModrinthInfo } as T;
              }
              return item;
            })
          );
          console.log(`[${contentType}] Phase 3: Items updated with Modrinth data`, new Date().toISOString());
        } catch (modrinthError) {
          console.warn(`[${contentType}] Phase 3: Failed to fetch Modrinth details by hashes:`, modrinthError);
          const errorMsg = modrinthError instanceof Error ? modrinthError.message : String(modrinthError);
          setError(prevError => prevError ? `${prevError}; Failed to fetch Modrinth details (${errorMsg})` : `Failed to fetch Modrinth details (${errorMsg})`);
        } finally {
          setIsFetchingModrinthDetailsState(false);
          setHashesToFetchModrinthDetailsFor(null); 
        }
      };
      fetchModrinthDataByHashes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashesToFetchModrinthDetailsFor, profile?.id, contentType]); 

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const moreActionsButton = (event.target as HTMLElement).closest(`[data-item-id="${activeDropdownId}"] [title~="More"]`);
        if (!moreActionsButton) {
          setActiveDropdownId(null);
        }
      }
    };
    if (activeDropdownId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdownId]);

  // Fetch Modrinth icons
  useEffect(() => {
    const fetchModrinthIcons = async () => {
      if (!items || items.length === 0) {
        setModrinthIcons({});
        return;
      }

      const projectIdsToFetch = items
        .filter(item => item.modrinth_info?.project_id && modrinthIcons[item.modrinth_info.project_id] === undefined)
        .map(item => item.modrinth_info!.project_id!)
      const uniqueProjectIds = [...new Set(projectIdsToFetch)];

      if (uniqueProjectIds.length > 0) {
        try {
          const projectDetailsList = await ModrinthService.getProjectDetails(uniqueProjectIds);
          const newIcons: Record<string, string | null> = {};
          if (Array.isArray(projectDetailsList)) {
            projectDetailsList.forEach(detail => {
              if (detail && typeof detail === 'object' && detail.id) {
                newIcons[detail.id] = detail.icon_url || null;
              }
            });
          } else {
             console.warn("[useLocalContentManager] ModrinthService.getProjectDetails did not return an array. Received:", projectDetailsList);
          }
          setModrinthIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        } catch (err) {
          console.error("[useLocalContentManager] Failed to fetch Modrinth project details for icons:", err);
          const errorIcons: Record<string, string | null> = {};
          uniqueProjectIds.forEach(id => { errorIcons[id] = null; });
          setModrinthIcons(prevIcons => ({ ...prevIcons, ...errorIcons }));
        }
      }
    };
    fetchModrinthIcons();
  }, [items]); 

  // Fetch local archive icons
  useEffect(() => {
    const fetchLocalArchiveIcons = async () => {
      if (!items || items.length === 0) {
        setLocalArchiveIcons({});
        return;
      }

      const pathsToFetchIconsFor = items
        .filter(item => item.path && item.filename.toLowerCase().endsWith('.zip') && localArchiveIcons[item.filename] === undefined)
        .map(item => ({ filename: item.filename, path: item.path! })); // Use path now
      
      const uniquePathObjects = pathsToFetchIconsFor.filter((obj, index, self) => 
        index === self.findIndex(t => t.path === obj.path)
      );

      if (uniquePathObjects.length > 0) {
        try {
          const archivePaths = uniquePathObjects.map(obj => obj.path);
          const iconsResult = await invoke<Record<string, string | null>>(
            "get_icons_for_archives",
            { archivePaths }
          );

          if (iconsResult) {
            const newLocalIcons: Record<string, string | null> = {};
            uniquePathObjects.forEach(obj => {
                const base64Icon = iconsResult[obj.path];
                newLocalIcons[obj.filename] = base64Icon ? 'data:image/png;base64,' + base64Icon : null;
            });
            setLocalArchiveIcons(prevIcons => ({ ...prevIcons, ...newLocalIcons }));
          } else {
            console.warn("[useLocalContentManager] get_icons_for_archives returned null or undefined.");
          }
        } catch (err) {
          console.error("[useLocalContentManager] Failed to fetch local archive icons:", err);
          const errorIcons: Record<string, string | null> = {};
          uniquePathObjects.forEach(obj => { errorIcons[obj.filename] = null; });
          setLocalArchiveIcons(prevIcons => ({ ...prevIcons, ...errorIcons }));
        }
      }
    };
    fetchLocalArchiveIcons();
  }, [items]); 

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      getDisplayFileName(item).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery, getDisplayFileName]);

  const handleItemSelectionChange = useCallback((itemId: string, isSelected: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(itemId);
      else newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const areAllFilteredSelected = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(item => selectedItemIds.has(item.filename));
  }, [filteredItems, selectedItemIds]);

  const handleSelectAllToggle = useCallback((isChecked: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) filteredItems.forEach(item => newSet.add(item.filename));
      else filteredItems.forEach(item => newSet.delete(item.filename));
      return newSet;
    });
  }, [filteredItems]);

  const handleToggleItemEnabled = useCallback(async (item: T) => {
    if (!profile) { 
      toast.error("Profile missing for toggle.");
      return;
    }
    
    setItemBeingToggled(item.filename);
    // If item.is_disabled is true (it's disabled), targetEnabledState becomes true (to enable it).
    // If item.is_disabled is false (it's enabled), targetEnabledState becomes false (to disable it).
    const targetEnabledState = item.is_disabled; 

    const payload = createTogglePayload(item, profile.id, contentType, targetEnabledState);

    if (!payload) {
      setItemBeingToggled(null);
      // createTogglePayload already shows a toast for some error cases
      return;
    }

    try {
      await toggleContentFromProfile(payload);

      setItems(prevItems =>
        prevItems.map(i =>
          i.filename === item.filename ? { ...i, is_disabled: !targetEnabledState } : i
        )
      );
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    } catch (err) {
      console.error(`Failed to toggle ${getDisplayFileName(item)}:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err.message);
      toast.error(`Failed to toggle ${getDisplayFileName(item)}: ${errorMsg}`);
    } finally {
      setItemBeingToggled(null);
    }
  }, [profile, contentType, getDisplayFileName]); 

  const handleDeleteItem = useCallback((item: T) => {
    if (!item.path) { // Use path
      toast.error("Item path missing, cannot delete.");
      return;
    }
    setItemToDeleteForDialog(item);
    setIsBatchDeleteConfirmActive(false);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsConfirmDeleteDialogOpen(false);
    setItemToDeleteForDialog(null);
    setIsBatchDeleteConfirmActive(false);
  }, []);

  const handleConfirmDeletion = useCallback(async () => {
    if (!profile) {
      toast.error("Profile data missing, cannot complete deletion.");
      handleCloseDeleteDialog();
      return;
    }
    setIsDialogActionLoading(true);
    setError(null);
    let successfulOperations = 0;
    const errors: string[] = [];

    if (isBatchDeleteConfirmActive) {
      setIsBatchDeleting(true);
      for (const itemId of selectedItemIds) {
        const item = items.find(i => i.filename === itemId);
        if (item?.path) { // Use path
          try {
            await invoke("delete_file", { filePath: item.path }); // Use path
            successfulOperations++;
          } catch (err) {
            const errorDetail = err instanceof Error ? err.message : String(err.message);
            errors.push(`Failed to delete ${getDisplayFileName(item)}: ${errorDetail}`);
          }
        } else {
          errors.push(`Could not find path for item ID ${itemId} to delete.`);
        }
      }
      if (errors.length > 0) toast.error(`Batch delete failed for some items: ${errors.join("; ")}`);
      if (successfulOperations > 0) toast.success(`Successfully deleted ${successfulOperations} item(s).`);
      setIsBatchDeleting(false);
      setSelectedItemIds(new Set());
    } else if (itemToDeleteForDialog?.path) { // Use path
      setItemBeingDeleted(itemToDeleteForDialog.filename);
      try {
        await invoke("delete_file", { filePath: itemToDeleteForDialog.path }); // Use path
        toast.success(`Deleted ${getDisplayFileName(itemToDeleteForDialog)}.`);
        successfulOperations++;
        setItems(prevItems => prevItems.filter(i => i.filename !== itemToDeleteForDialog.filename));
        setSelectedItemIds(prevIds => {
          const newSet = new Set(prevIds);
          newSet.delete(itemToDeleteForDialog.filename);
          return newSet;
        });
      } catch (err) {
        const errorDetail = err instanceof Error ? err.message : String(err.message);
        toast.error(`Failed to delete ${getDisplayFileName(itemToDeleteForDialog)}: ${errorDetail}`);
        errors.push(`Failed to delete ${getDisplayFileName(itemToDeleteForDialog)}: ${errorDetail}`);
      } finally {
        setItemBeingDeleted(null);
      }
    }

    setIsDialogActionLoading(false);
    handleCloseDeleteDialog();
    if (successfulOperations > 0 || errors.length > 0) { 
      if (isBatchDeleteConfirmActive || errors.length > 0) { // Refresh if batch or single error
        await fetchData(true); // Full refresh
      }
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    }
    if (errors.length > 0 && !isBatchDeleteConfirmActive) setError(errors.join("; "));

  }, [profile, selectedItemIds, items, itemToDeleteForDialog, isBatchDeleteConfirmActive, fetchData, getDisplayFileName, handleCloseDeleteDialog]);

  const handleBatchToggleSelected = useCallback(async () => {
    if (!profile || selectedItemIds.size === 0) return;
    setIsBatchToggling(true);
    const errors: string[] = [];
    let successfulOperations = 0;
    // Determine the most common current state to decide the batch action
    // This is a simple approach: if most are disabled, enable all selected. Otherwise, disable all selected.
    // More sophisticated logic could be to toggle each to its opposite state if needed.
    let disabledCount = 0;
    selectedItemIds.forEach(itemId => {
      const item = items.find(i => i.filename === itemId);
      if (item?.is_disabled) disabledCount++;
    });
    const predominantlyDisabled = disabledCount > selectedItemIds.size / 2;
    const targetBatchEnabledState = predominantlyDisabled; // If mostly disabled, target state is enabled (true)

    for (const itemId of selectedItemIds) {
      const item = items.find(i => i.filename === itemId);
      if (item) {
        // For batch, we determine a single target state for all selected items.
        // Or, if we want individual toggling logic: const targetEnabledState = item.is_disabled;
        const payload = createTogglePayload(item, profile.id, contentType, targetBatchEnabledState);

        if (payload) {
          try {
            await toggleContentFromProfile(payload);
            setItems(prev => prev.map(i => 
              i.filename === itemId ? { ...i, is_disabled: !targetBatchEnabledState } : i
            ));
            successfulOperations++;
          } catch (err) {
            const errorDetail = err instanceof Error ? err.message : String(err.message);
            errors.push(`Failed to toggle ${getDisplayFileName(item)}: ${errorDetail}`);
          }
        } else {
          // Error already toasted by createTogglePayload if it returned null
          errors.push(`Could not create toggle payload for ${getDisplayFileName(item)}.`);
        }
      } else {
        errors.push(`Could not find item ID ${itemId} to toggle.`);
      }
    }
    setIsBatchToggling(false);
    if (errors.length > 0) toast.error(`Batch toggle failed for some items: ${errors.join("; ")}`);
    if (successfulOperations > 0) {
      toast.success(`Successfully toggled ${successfulOperations} item(s).`);
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    }
    setSelectedItemIds(new Set());
  }, [profile, selectedItemIds, items, contentType, getDisplayFileName]); 

  const handleBatchDeleteSelected = useCallback(() => {
    if (!profile || selectedItemIds.size === 0) return;
    setItemToDeleteForDialog(null); 
    setIsBatchDeleteConfirmActive(true);
    setIsConfirmDeleteDialogOpen(true);
  }, [profile, selectedItemIds]);

  const handleOpenItemFolder = useCallback((item: T) => {
    if (!item.path) { // Use path
      toast.error("Path not available for this item.");
      return;
    }
    invoke("open_file_directory", { filePath: item.path }) // Use path
      .catch(err => {
        const errorMsg = err instanceof Error ? err.message : String(err.message);
        toast.error(`Failed to open directory: ${errorMsg}`);
      });
  }, []);
  
  const checkForContentUpdates = useCallback(async (currentProfile = profile, currentItems = items) => {
    if (!currentProfile || !currentItems || currentItems.length === 0) {
      setContentUpdates({});
      return;
    }
    const itemsWithHashes = currentItems.filter(item => item.modrinth_info && item.sha1_hash);
    if (itemsWithHashes.length === 0) {
      setContentUpdates({});
      return;
    }
    const hashes = itemsWithHashes.map(item => item.sha1_hash!);
    setIsCheckingUpdates(true);
    setContentUpdateError(null);
    try {
      const requestBody: ModrinthBulkUpdateRequestBody = {
        hashes,
        algorithm: "sha1" as ModrinthHashAlgorithm,
        loaders: [], 
        game_versions: [currentProfile.game_version],
      };
      const updates = await invoke<Record<string, ModrinthVersion | null>>(
        "check_modrinth_updates", 
        { request: requestBody } 
      );
      const filteredUpdates: Record<string, ModrinthVersion> = {};
      const itemsByHash = new Map<string, T>();
      for (const item of itemsWithHashes) {
        if(item.sha1_hash) itemsByHash.set(item.sha1_hash, item);
      }
      for (const [hash, versionInfo] of Object.entries(updates)) {
        const item = itemsByHash.get(hash);
        if (item && versionInfo && versionInfo.id && 
           ((item.modrinth_info && item.modrinth_info.version_id !== versionInfo.id) || !item.modrinth_info)) {
          filteredUpdates[hash] = versionInfo;
        }
      }
      setContentUpdates(filteredUpdates);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error checking for ${contentType} updates:`, errorMsg);
      setContentUpdateError(`Error checking for ${contentType} updates: ${errorMsg}`);
      setContentUpdates({});
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [profile, items, contentType]);

  const handleUpdateContentItem = useCallback(async (item: T, updateVersion: ModrinthVersion, preventRefetch: boolean = false) => {
    if (!profile || !item.path) { // Use path
      toast.error("Profile or item path missing, cannot update.");
      return;
    }
    if (!item.modrinth_info || !item.sha1_hash) {
      toast.error(`Item ${getDisplayFileName(item)} is not linked to Modrinth or missing hash, cannot auto-update.`);
        return;
    }
    setItemsBeingUpdated(prev => new Set(prev).add(item.filename));
    setContentUpdateError(null);
    try {
      let command = "";
      let payload: any = { profileId: profile.id, newVersionDetails: updateVersion };

      // The 'item' itself might need to be mapped to specific structs like 'ResourcePackInfo' for the backend.
      // For now, we pass the generic 'item', assuming the backend commands can handle it or it matches structure.
      // If not, specific mapping will be needed here based on 'contentType'.
      const itemPayloadKey = contentType.toLowerCase(); // e.g., 'resourcepack', 'shaderpack'
      payload[itemPayloadKey] = item; 

      switch (contentType) {
        case 'ShaderPack': command = "update_shaderpack_from_modrinth"; break;
        case 'ResourcePack': command = "update_resourcepack_from_modrinth"; break;
        case 'DataPack': command = "update_datapack_from_modrinth"; break;
        default: throw new Error(`Unsupported content type for update: ${contentType}`);
      }

      await invoke(command, payload);
      toast.success(`Successfully updated ${getDisplayFileName(item)} to ${updateVersion.version_number}`);
      if (item.sha1_hash) {
        setContentUpdates(prevUpdates => {
          const newUpdates = { ...prevUpdates };
          delete newUpdates[item.sha1_hash!];
          return newUpdates;
        });
      }
      if (!preventRefetch) await fetchData(true); // Full refresh
    } catch (err) {
      console.error(`Failed to update ${contentType}:`, err);
      const displayName = getDisplayFileName(item);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update ${displayName}: ${errorMsg}`);
    } finally {
      setItemsBeingUpdated(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.filename);
        return newSet;
      });
    }
  }, [profile, contentType, getDisplayFileName, fetchData]);

  const handleUpdateAllAvailableContent = useCallback(async () => {
    if (Object.keys(contentUpdates).length === 0 || !profile) return;
    setIsUpdatingAll(true);
    setContentUpdateError(null);
    let SucceededCount = 0;
    let errorCount = 0;
    const itemsToUpdateWithDetails: {item: T, version: ModrinthVersion}[] = [];
    for (const item of items) { 
      if (item.sha1_hash && contentUpdates[item.sha1_hash]) {
        itemsToUpdateWithDetails.push({ item, version: contentUpdates[item.sha1_hash]! });
      }
    }
    if (itemsToUpdateWithDetails.length === 0) {
        setIsUpdatingAll(false);
        return;
    }
    toast.loading(`Updating ${itemsToUpdateWithDetails.length} ${contentType}(s)...`, { id: 'batch-update-toast' });
    for (const { item, version } of itemsToUpdateWithDetails) {
      try {
        await handleUpdateContentItem(item, version, true); 
        SucceededCount++;
      } catch { errorCount++; }
    }
    setIsUpdatingAll(false);
    if (errorCount > 0) {
        toast.error(`Finished batch update: ${SucceededCount} succeeded, ${errorCount} failed.`, { id: 'batch-update-toast' });
    } else {
        toast.success(`Successfully updated ${SucceededCount} ${contentType}(s).`, { id: 'batch-update-toast' });
    }
    if (SucceededCount > 0) {
        await fetchData(true); // Full refresh
        await checkForContentUpdates(profile, items); 
    }
  }, [profile, items, contentUpdates, contentType, handleUpdateContentItem, checkForContentUpdates, fetchData]);

  useEffect(() => {
    if (profile?.id && items.length > 0) {
      checkForContentUpdates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, profile?.id]); // Removed checkForContentUpdates from deps to avoid loop, as it's memoized by profile/items

  return {
    items,
    isLoading: isInitialLoadingState, 
    isFetchingHashes: isFetchingHashesState,
    isFetchingModrinthDetails: isFetchingModrinthDetailsState,
    isAnyTaskRunning: isInitialLoadingState || isFetchingHashesState || isFetchingModrinthDetailsState || isCheckingUpdates || isUpdatingAll, 
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
    contentUpdates,
    isCheckingUpdates, 
    itemsBeingUpdated,
    contentUpdateError,
    isUpdatingAll, 
    fetchData,
    handleToggleItemEnabled,
    handleDeleteItem,
    handleBatchToggleSelected,
    handleBatchDeleteSelected,
    handleOpenItemFolder,
    checkForContentUpdates,
    handleUpdateContentItem,
    handleUpdateAllAvailableContent,
  };
} 