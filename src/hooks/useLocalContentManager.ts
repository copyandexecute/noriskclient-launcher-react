import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';
import type { Profile } from '../types/profile';
import type { ModrinthVersion, ModrinthBulkUpdateRequestBody, ModrinthHashAlgorithm } from '../types/modrinth'; // Added ModrinthBulkUpdateRequestBody, ModrinthHashAlgorithm
import { ContentType } from '../types/content'; // Assuming this is your NrContentType for backend
import type { ToggleContentPayload } from '../types/content';
import { ModrinthService } from '../services/modrinth-service'; // Corrected import path

// Base type for content items managed by this hook
export interface LocalContentItem {
  filename: string; // Unique identifier, often the file name itself
  path: string;     // Absolute path to the content file/folder
  is_disabled?: boolean; // Whether the item is currently disabled
  file_size?: number;
  modrinth_info?: { // Optional, for Modrinth linked content
    project_id?: string;
    version_id?: string;
  };
  sha1_hash?: string; // Optional, needed for some backend operations
  // Add other common fields if necessary
}

// Enum for the types of content this hook can manage
export type LocalContentType = 'ShaderPack' | 'ResourcePack' | 'DataPack';

interface UseLocalContentManagerProps<T extends LocalContentItem> {
  profile?: Profile;
  contentType: LocalContentType;
  getDisplayFileName: (item: T) => string; // Function to get a user-friendly name
  onRefreshRequired?: () => void;
  // Can add specific fetch commands if they differ significantly beyond the convention
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
  itemToDeleteForDialog: T | null; // For displaying name in dialog

  modrinthIcons: Record<string, string | null>;
  localArchiveIcons: Record<string, string | null>;

  // Modrinth Update states and functions
  contentUpdates: Record<string, ModrinthVersion | null>; // sha1_hash -> ModrinthVersion
  isCheckingUpdates: boolean;
  itemsBeingUpdated: Set<string>; // filename of items currently being updated
  contentUpdateError: string | null;
  isUpdatingAll: boolean;

  fetchData: () => Promise<void>;
  handleToggleItemEnabled: (item: T) => Promise<void>;
  handleDeleteItem: (item: T) => void; // Initiates delete, shows dialog
  handleBatchToggleSelected: () => Promise<void>;
  handleBatchDeleteSelected: () => void; // Initiates batch delete, shows dialog
  handleOpenItemFolder: (item: T) => void;

  // Modrinth Update functions
  checkForContentUpdates: (currentProfile?: Profile, currentItems?: T[]) => Promise<void>;
  handleUpdateContentItem: (item: T, updateVersion: ModrinthVersion, preventRefetch?: boolean) => Promise<void>;
  handleUpdateAllAvailableContent: () => Promise<void>;
}

export function useLocalContentManager<T extends LocalContentItem>({
  profile,
  contentType,
  getDisplayFileName,
  onRefreshRequired,
}: UseLocalContentManagerProps<T>): UseLocalContentManagerReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isInitialLoadingState, setIsInitialLoadingState] = useState(false); // Renamed: Covers phase 1 loading
  const [isFetchingHashesState, setIsFetchingHashesState] = useState(false); // Renamed: Covers phase 2 loading
  const [isFetchingModrinthDetailsState, setIsFetchingModrinthDetailsState] = useState(false); // Renamed: Covers phase 3 loading
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

  // TODO: Icon fetching logic (Modrinth, local archive) can be added here later
  const [modrinthIcons, setModrinthIcons] = useState<Record<string, string | null>>({});
  const [localArchiveIcons, setLocalArchiveIcons] = useState<Record<string, string | null>>({});

  // New state to trigger Modrinth details fetching for resource packs
  const [hashesToFetchModrinthDetailsFor, setHashesToFetchModrinthDetailsFor] = useState<string[] | null>(null);

  // Modrinth Update State
  const [contentUpdates, setContentUpdates] = useState<Record<string, ModrinthVersion | null>>({});
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [itemsBeingUpdated, setItemsBeingUpdated] = useState<Set<string>>(new Set());
  const [contentUpdateError, setContentUpdateError] = useState<string | null>(null);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  const onRefreshRequiredRef = useRef(onRefreshRequired);
  useEffect(() => {
    onRefreshRequiredRef.current = onRefreshRequired;
  }, [onRefreshRequired]);

  const getTauriFetchCommand = useCallback((): string => {
    switch (contentType) {
      case 'ShaderPack':
        return 'get_local_shaderpacks'; // Assuming this also supports calculateHashes, fetchModrinthData
      case 'ResourcePack':
        return 'get_local_resourcepacks';
      case 'DataPack':
        return 'get_local_datapacks'; // Assuming this command will exist and support params
      default:
        throw new Error(`Unsupported content type for fetching: ${contentType}`);
    }
  }, [contentType]);

  const fetchData = useCallback(async () => {
    if (!profile?.id) {
      setItems([]);
      return;
    }
    setIsInitialLoadingState(true);
    setIsFetchingHashesState(false); // Reset phase 2 loading state
    setIsFetchingModrinthDetailsState(false); // Reset phase 3 loading state
    setError(null);
    setModrinthIcons({});
    setLocalArchiveIcons({});
    setContentUpdates({});
    setContentUpdateError(null);
    setHashesToFetchModrinthDetailsFor(null); // Clear this as it will be populated later

    try {
      if (contentType === 'ResourcePack') {
        console.log(`[${contentType}] Phase 1: Fetching basic info...`, new Date().toISOString());
        const basicItems = await invoke<T[]>(getTauriFetchCommand(), {
          profileId: profile.id,
          calculateHashes: false, // Phase 1: No hashes yet
          fetchModrinthData: false, // Phase 1: No Modrinth data from Rust yet
        });
        
        const processedBasicItems = (basicItems || []).map(item => ({
          ...item, // sha1_hash will be null from Rust
          filename: item.filename || getDisplayFileName(item),
          modrinth_info: null, // Ensure modrinth_info is initially null
        }));        
        setItems(processedBasicItems as T[]); 
        console.log(`[${contentType}] Phase 1: Basic items set`, new Date().toISOString(), processedBasicItems);
        // Phase 2 (hash calculation) will be triggered by a useEffect watching 'items'

      } else {
        // Original logic for other content types (ShaderPack, DataPack)
        // For these, we assume a single fetch or that they are fast enough / already optimized.
        // If they also need phased loading, this logic would need to be expanded.
        console.log(`[${contentType}] Fetching data (single step)...`, new Date().toISOString());
        const command = getTauriFetchCommand();
        // Assuming other types might directly return hashes if applicable
        const backendItems = await invoke<T[]>(command, { profileId: profile.id, calculateHashes: true, fetchModrinthData: false });
        const processedItems = (backendItems || []).map(item => ({
          ...item,
          filename: item.filename || getDisplayFileName(item),
        }));
        setItems(processedItems as T[]);
        console.log(`[${contentType}] Data set (single step)`, new Date().toISOString(), processedItems);

        const newHashes = processedItems
          .map(item => item.sha1_hash)
          .filter(hash => hash != null) as string[];
        if (newHashes.length > 0) {
          setHashesToFetchModrinthDetailsFor(newHashes);
        } else {
          setHashesToFetchModrinthDetailsFor(null);
        }
      }

      setSelectedItemIds(new Set());
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    } catch (err) {
      console.error(`Failed to fetch ${contentType}s:`, err);
      setError(`Failed to fetch ${contentType}s: ${err instanceof Error ? err.message : String(err.message)}`);
      setItems([]);
    } finally {
      setIsInitialLoadingState(false); // Phase 1 loading finished
    }
  }, [profile?.id, contentType, getTauriFetchCommand, getDisplayFileName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Phase 2: Fetch Hashes for ResourcePacks (if not already loaded)
  useEffect(() => {
    if (contentType === 'ResourcePack' && profile?.id && items.length > 0 && items.some(item => item.sha1_hash === null) && !isInitialLoadingState && !isFetchingHashesState) {
      const fetchHashesAndFullLocalInfo = async () => {
        console.log(`[${contentType}] Phase 2: Fetching hashes and full local info...`, new Date().toISOString());
        setIsFetchingHashesState(true);
        try {
          const itemsWithHashes = await invoke<T[]>(getTauriFetchCommand(), {
            profileId: profile.id,
            calculateHashes: true, // Phase 2: Calculate hashes
            fetchModrinthData: false, // Let JS handle Modrinth details in Phase 3
          });

          setItems(currentItems =>
            currentItems.map(currentItem => {
              const match = itemsWithHashes.find(iwh => iwh.path === currentItem.path);
              if (match && match.sha1_hash) {
                // Merge hash and potentially other updated local info (like file_size, is_disabled if changed)
                return { 
                  ...currentItem, 
                  sha1_hash: match.sha1_hash, 
                  file_size: match.file_size, 
                  is_disabled: match.is_disabled 
                };
              }
              return currentItem;
            })
          );

          const newHashes = itemsWithHashes
            .map(item => item.sha1_hash)
            .filter(hash => hash != null) as string[];
          
          if (newHashes.length > 0) {
            console.log(`[${contentType}] Phase 2: Hashes obtained, setting for Modrinth lookup.`, new Date().toISOString(), newHashes);
            setHashesToFetchModrinthDetailsFor(newHashes);
          } else {
            console.log(`[${contentType}] Phase 2: No hashes obtained after explicit fetch.`, new Date().toISOString());
            setHashesToFetchModrinthDetailsFor(null);
          }
        } catch (err) {
          console.error(`[${contentType}] Phase 2: Failed to fetch hashes:`, err);
          setError(prevError => prevError ? `${prevError}; Failed to fetch hashes` : 'Failed to fetch hashes');
        } finally {
          setIsFetchingHashesState(false);
        }
      };
      fetchHashesAndFullLocalInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, profile?.id, contentType, getTauriFetchCommand, isInitialLoadingState]); // Depends on isInitialLoadingState (phase 1)
  
  // Phase 3: Fetch Modrinth project details based on hashes (existing logic, adapted)
  useEffect(() => {
    if (contentType === 'ResourcePack' && hashesToFetchModrinthDetailsFor && hashesToFetchModrinthDetailsFor.length > 0 && profile?.id && !isFetchingModrinthDetailsState) {
      console.log(`[${contentType}] Phase 3: Triggering Modrinth project details fetch for hashes`, new Date().toISOString(), hashesToFetchModrinthDetailsFor);
      setIsFetchingModrinthDetailsState(true);
      const fetchModrinthDataByHashes = async () => {
        try {
          const modrinthVersionsMap = await ModrinthService.getVersionsByHashes(hashesToFetchModrinthDetailsFor);
          console.log(`[${contentType}] Phase 3: Modrinth data received`, new Date().toISOString(), modrinthVersionsMap);
          setItems(currentItems =>
            currentItems.map(item => {
              if (item.sha1_hash && modrinthVersionsMap[item.sha1_hash]) {
                const modrinthVersion = modrinthVersionsMap[item.sha1_hash];
                const primaryFile = modrinthVersion.files.find(f => f.primary) || modrinthVersion.files[0];
                return {
                  ...item,
                  modrinth_info: primaryFile ? {
                    project_id: modrinthVersion.project_id,
                    version_id: modrinthVersion.id,
                    name: modrinthVersion.name, // Modrinth's version name
                    version_number: modrinthVersion.version_number,
                    download_url: primaryFile.url,
                  } : null,
                } as T; 
              }
              return item;
            })
          );
          console.log(`[${contentType}] Phase 3: Items updated with Modrinth data`, new Date().toISOString());
        } catch (modrinthError) {
          console.warn(`[${contentType}] Phase 3: Failed to fetch Modrinth details by hashes:`, modrinthError);
          setError(prevError => prevError ? `${prevError}; Failed to fetch Modrinth details` : 'Failed to fetch Modrinth details');
        } finally {
          setIsFetchingModrinthDetailsState(false);
          // Clear hashesToFetchModrinthDetailsFor AFTER attempting fetch to avoid re-fetch loops on partial success/failure for this batch.
          // If some hashes failed, they won't be re-fetched immediately unless items/profile changes to re-trigger phase 2.
          setHashesToFetchModrinthDetailsFor(null); 
        }
      };
      fetchModrinthDataByHashes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashesToFetchModrinthDetailsFor, profile?.id, contentType]); // Removed isFetchingModrinthDetailsState from deps to avoid loop, added guard inside
  
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
          // Update modrinthIcons, mapping from project_id to icon_url.
          // The GenericDetailListItem will need to look up based on item.modrinth_info.project_id
          setModrinthIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        } catch (err) {
          console.error("[useLocalContentManager] Failed to fetch Modrinth project details for icons:", err);
           // Mark IDs as tried (failed) to avoid re-fetching in a loop on error
          const errorIcons: Record<string, string | null> = {};
          uniqueProjectIds.forEach(id => { errorIcons[id] = null; });
          setModrinthIcons(prevIcons => ({ ...prevIcons, ...errorIcons }));
        }
      }
    };
    fetchModrinthIcons();
  }, [items]); // Depends on items, and modrinthIcons implicitly (by checking undefined)

  // Fetch local archive icons
  useEffect(() => {
    const fetchLocalArchiveIcons = async () => {
      if (!items || items.length === 0) {
        setLocalArchiveIcons({});
        return;
      }

      // Key for localArchiveIcons should be item.filename for consistency with display component
      const pathsToFetchIconsFor = items
        .filter(item => item.path && item.filename.toLowerCase().endsWith('.zip') && localArchiveIcons[item.filename] === undefined)
        .map(item => ({ filename: item.filename, path: item.path! }));
      
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
           // Mark filenames as tried (failed)
          const errorIcons: Record<string, string | null> = {};
          uniquePathObjects.forEach(obj => { errorIcons[obj.filename] = null; });
          setLocalArchiveIcons(prevIcons => ({ ...prevIcons, ...errorIcons }));
        }
      }
    };
    fetchLocalArchiveIcons();
  }, [items]); // Depends on items, and localArchiveIcons implicitly

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
    if (!profile || !item.path) {
      toast.error("Profile or item path missing for toggle.");
      return;
    }
    setItemBeingToggled(item.filename);
    const newEnabledState = !(item.is_disabled === false); // if is_disabled is true or undefined, new state is enabled (true)

    try {
      // All content types will now use set_file_enabled
      await invoke("set_file_enabled", { filePath: item.path, enabled: newEnabledState });

      setItems(prevItems =>
        prevItems.map(i =>
          i.filename === item.filename ? { ...i, is_disabled: !newEnabledState } : i
        )
      );
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
      // No toast on individual success, consistent with individual tab behavior
    } catch (err) {
      console.error(`Failed to toggle ${getDisplayFileName(item)}:`, err);
      toast.error(`Failed to toggle ${getDisplayFileName(item)}: ${err instanceof Error ? err.message : String(err.message)}`);
      // Optionally refetch or revert optimistic update here
    } finally {
      setItemBeingToggled(null);
    }
  }, [profile, getDisplayFileName]); // Removed contentType, items is still needed for optimistic update

  const handleDeleteItem = useCallback((item: T) => {
    if (!item.path) {
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
        if (item?.path) {
          try {
            await invoke("delete_file", { filePath: item.path });
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
    } else if (itemToDeleteForDialog?.path) {
      setItemBeingDeleted(itemToDeleteForDialog.filename);
      try {
        await invoke("delete_file", { filePath: itemToDeleteForDialog.path });
        toast.success(`Deleted ${getDisplayFileName(itemToDeleteForDialog)}.`);
        successfulOperations++;
        // Optimistically update UI for single item delete
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
    if (successfulOperations > 0 || errors.length > 0) { // Refresh if any attempt was made
      if (isBatchDeleteConfirmActive) {
        await fetchData(); // Refresh list only for batch deletes or if there were errors in single delete
      } else if (errors.length > 0 && !isBatchDeleteConfirmActive) {
        await fetchData(); // Also refresh if single delete had an error
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

    for (const itemId of selectedItemIds) {
      const item = items.find(i => i.filename === itemId);
      if (item?.path) {
        const newEnabledState = !(item.is_disabled === false);
        try {
          // All content types will now use set_file_enabled
          await invoke("set_file_enabled", { filePath: item.path, enabled: newEnabledState });
          setItems(prev => prev.map(i => i.filename === itemId ? { ...i, is_disabled: !newEnabledState } : i));
          successfulOperations++;
        } catch (err) {
          const errorDetail = err instanceof Error ? err.message : String(err.message);
          errors.push(`Failed to toggle ${getDisplayFileName(item)}: ${errorDetail}`);
        }
      } else {
        errors.push(`Could not find path for item ID ${itemId} to toggle.`);
      }
    }
    setIsBatchToggling(false);
    if (errors.length > 0) toast.error(`Batch toggle failed for some items: ${errors.join("; ")}`);
    if (successfulOperations > 0) {
      // No specific success toast for batch toggle, individual item updates UI
      if (onRefreshRequiredRef.current) onRefreshRequiredRef.current();
    }
    setSelectedItemIds(new Set());
  }, [profile, selectedItemIds, items, getDisplayFileName]); // Removed contentType

  const handleBatchDeleteSelected = useCallback(() => {
    if (!profile || selectedItemIds.size === 0) return;
    setItemToDeleteForDialog(null); // Clear single item dialog if any
    setIsBatchDeleteConfirmActive(true);
    setIsConfirmDeleteDialogOpen(true);
  }, [profile, selectedItemIds]);

  const handleOpenItemFolder = useCallback((item: T) => {
    if (!item.path) {
      toast.error("Path not available for this item.");
      return;
    }
    invoke("open_file_directory", { filePath: item.path })
      .catch(err => {
        toast.error(`Failed to open directory: ${err instanceof Error ? err.message : String(err.message)}`);
      });
  }, []);
  
  // --- Modrinth Update Logic ---
  const checkForContentUpdates = useCallback(async (currentProfile = profile, currentItems = items) => {
    if (!currentProfile || !currentItems || currentItems.length === 0) {
      setContentUpdates({});
      return;
    }

    const itemsWithHashes = currentItems.filter(
      (item: T) => item.modrinth_info && item.sha1_hash
    );

    if (itemsWithHashes.length === 0) {
      setContentUpdates({});
      return;
    }

    const hashes = itemsWithHashes.map((item: T) => item.sha1_hash!);

    setIsCheckingUpdates(true);
    setContentUpdateError(null);

    try {
      const requestBody: ModrinthBulkUpdateRequestBody = {
        hashes,
        algorithm: "sha1" as ModrinthHashAlgorithm,
        loaders: [], // TODO: Potentially make loaders configurable or derive from profile
        game_versions: [currentProfile.game_version],
      };

      // Assuming a similar command exists or will be created for generic content updates
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
        // Update if versionInfo exists and ( (item has modrinth_info and version_id differs) OR (item doesn't have modrinth_info meaning it's a new link) )
        if (item && versionInfo && versionInfo.id && 
           ((item.modrinth_info && item.modrinth_info.version_id !== versionInfo.id) || !item.modrinth_info)) {
          filteredUpdates[hash] = versionInfo;
        }
      }
      setContentUpdates(filteredUpdates);
    } catch (error) {
      console.error(`Error checking for ${contentType} updates:`, error);
      setContentUpdateError(
        error instanceof Error
          ? error.message
          : `Error checking for ${contentType} updates`,
      );
      setContentUpdates({});
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [profile, items, contentType]);

  const handleUpdateContentItem = useCallback(async (item: T, updateVersion: ModrinthVersion, preventRefetch: boolean = false) => {
    if (!profile || !item.path) {
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
      let payload: any = {};

      switch (contentType) {
        case 'ShaderPack':
          command = "update_shaderpack_from_modrinth";
          payload = {
            profileId: profile.id,
            shaderpack: item, // Specific key for shaderpack
            newVersionDetails: updateVersion,
          };
          break;
        case 'ResourcePack':
          command = "update_resourcepack_from_modrinth";
          payload = {
            profileId: profile.id,
            resourcepack: item, // Specific key for resourcepack
            newVersionDetails: updateVersion,
          };
          break;
        case 'DataPack':
          command = "update_datapack_from_modrinth";
          payload = {
            profileId: profile.id,
            datapack: item, // Specific key for datapack
            newVersionDetails: updateVersion,
          };
          break;
        default:
          toast.error(`Unsupported content type for update: ${contentType}`);
          throw new Error(`Unsupported content type for update: ${contentType}`);
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
      if (!preventRefetch) {
        await fetchData(); // Refresh list after successful update, only if not prevented
      }
    } catch (err) {
      console.error(`Failed to update ${contentType}:`, err);
      const displayName = getDisplayFileName(item);
      toast.error(`Failed to update ${displayName}: ${err instanceof Error ? err.message : String(err)}`);
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
    for (const item of items) { // Iterate over current items in state
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
        // Pass true to prevent individual refetches during batch update
        await handleUpdateContentItem(item, version, true); 
        SucceededCount++;
      } catch {
        errorCount++; 
      }
    }
    
    setIsUpdatingAll(false);
    if (errorCount > 0) {
        toast.error(`Finished batch update: ${SucceededCount} succeeded, ${errorCount} failed.`, { id: 'batch-update-toast' });
    } else {
        toast.success(`Successfully updated ${SucceededCount} ${contentType}(s).`, { id: 'batch-update-toast' });
    }

    if (SucceededCount > 0) {
        await fetchData(); // Single fetch after all successful batch updates
        // After updating, re-check for updates to clear out any remaining ones
        // or to find new ones if versions changed significantly
        await checkForContentUpdates(profile, items); 
    }
  }, [profile, items, contentUpdates, contentType, handleUpdateContentItem, checkForContentUpdates, fetchData]);

  // Effect to check for updates when profile or items change
  useEffect(() => {
    if (profile?.id && items.length > 0) {
      checkForContentUpdates();
    }
  }, [items, profile?.id, checkForContentUpdates]);
  // --- End Modrinth Update Logic ---

  return {
    items,
    isLoading: isInitialLoadingState, // This is now ONLY for Phase 1 initial load
    isFetchingHashes: isFetchingHashesState,
    isFetchingModrinthDetails: isFetchingModrinthDetailsState,
    isAnyTaskRunning: isInitialLoadingState || isFetchingHashesState || isFetchingModrinthDetailsState || isCheckingUpdates || isUpdatingAll, // Composite flag for general busy state
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
    // Modrinth Update state and functions
    contentUpdates,
    isCheckingUpdates, // This is for Modrinth update checks, separate from initial load phases
    itemsBeingUpdated,
    contentUpdateError,
    isUpdatingAll, // This is for batch Modrinth updates
    fetchData,
    handleToggleItemEnabled,
    handleDeleteItem,
    handleBatchToggleSelected,
    handleBatchDeleteSelected,
    handleOpenItemFolder,
    // Modrinth Update functions
    checkForContentUpdates,
    handleUpdateContentItem,
    handleUpdateAllAvailableContent,
  };
} 