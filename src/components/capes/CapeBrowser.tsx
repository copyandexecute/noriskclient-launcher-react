'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { browseCapes, equipCape, unequipCape, uploadCape, getPlayerCapes, downloadTemplateAndOpenExplorer, deleteCape } from '../../services/cape-service';
import type { CosmeticCape, PaginationInfo, BrowseCapesOptions, GetPlayerCapesPayloadOptions } from '../../types/noriskCapes';
import { CapeList } from './CapeList';
import { CapeFilters, type CapeFiltersData } from './CapeFilters';
import { Icon } from '@iconify/react';
import { useThemeStore } from '../../store/useThemeStore';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Modal } from '../ui/Modal';
import { Cape3DRenderer } from './Cape3DRenderer';
import { Button } from '../ui/buttons/Button';
import { useMinecraftAuthStore } from '../../store/minecraft-auth-store';

export function CapeBrowser() {
  const [capes, setCapes] = useState<CosmeticCape[]>([]);
  const [allFetchedCapes, setAllFetchedCapes] = useState<CosmeticCape[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEquippingCapeId, setIsEquippingCapeId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUnequipping, setIsUnequipping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<CapeFiltersData>({ sortBy: '', timeFrame: '', showOwnedOnly: false });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cape preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImagePath, setPreviewImagePath] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Delete cape modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [capeToDelete, setCapeToDelete] = useState<CosmeticCape | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { activeAccount } = useMinecraftAuthStore();

  const fetchCapesData = useCallback(async (page: number, currentFilters: CapeFiltersData, term?: string) => {
    console.log('[CapeBrowser] fetchCapesData called with:', { page, currentFilters, term });
    setIsLoading(true);
    setError(null);
    try {
      let response;

      // If "My Capes" filter is active, use getPlayerCapes instead
      if (currentFilters.showOwnedOnly && activeAccount) {
        console.log('[CapeBrowser] Fetching capes for active account:', activeAccount.username);
        
        // Use the active account's username (or UUID) for getPlayerCapes
        const playerCapesOptions: GetPlayerCapesPayloadOptions = {
          player_identifier: activeAccount.id, // Using UUID is more reliable than username
        };
        
        console.log('[CapeBrowser] Options for getPlayerCapes:', JSON.stringify(playerCapesOptions));
        response = await getPlayerCapes(playerCapesOptions);
        setCapes(response);
        setAllFetchedCapes(response);
        
        // Create a pagination object for the user's capes
        setPaginationInfo({
          currentPage: 0,
          pageSize: response.length,
          totalItems: response.length,
          totalPages: 1
        });
      }
      else if (term && term.trim() !== '') {
        // Fetch specific player capes
        const playerCapesOptions: GetPlayerCapesPayloadOptions = {
          player_identifier: term,
        };
        console.log('[CapeBrowser] Options object before calling getPlayerCapes:', JSON.stringify(playerCapesOptions));
        response = await getPlayerCapes(playerCapesOptions);
        setCapes(response);
        setAllFetchedCapes(response);
        // Since getPlayerCapes now returns an array directly, we need to create a dummy pagination object
        setPaginationInfo({
          currentPage: 0,
          pageSize: response.length,
          totalItems: response.length,
          totalPages: 1
        });
      } else {
        // Browse all capes
        const browseOptions: BrowseCapesOptions = {
          page,
          page_size: 20, 
          sort_by: currentFilters.sortBy === '' ? undefined : currentFilters.sortBy,
          filter_has_elytra: currentFilters.filterHasElytra,
          time_frame: currentFilters.timeFrame === '' ? undefined : currentFilters.timeFrame,
        };
        console.log('[CapeBrowser] Options object before calling browseCapes:', JSON.stringify(browseOptions));
        response = await browseCapes(browseOptions);
        console.log('[CapeBrowser] browseCapes response:', { count: response.capes.length, pagination: response.pagination });
        setAllFetchedCapes(response.capes); 
        setCapes(response.capes); 
        setPaginationInfo(response.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching capes:', err);
      const errorMessage = err?.message || 'Failed to load capes. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    console.log('[CapeBrowser] useEffect triggered. Dependencies:', { currentPage, filters, searchQuery });
    fetchCapesData(currentPage, filters, searchQuery);
  }, [currentPage, filters, searchQuery, fetchCapesData]);

  const displayedCapes = capes;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = (newFilters: CapeFiltersData) => {
    console.log('[CapeBrowser] handleFilterChange RAW newFilters received:', JSON.stringify(newFilters));

    // We ignore searchTerm changes completely in filters now
    // searchTerm is managed separately via the searchQuery state
    const filtersWithoutSearch = { ...newFilters };
    // No need to delete searchTerm as it's not in the type anymore
    
    setFilters(prevFilters => {
      console.log('[CapeBrowser] Inside setFilters. prevFilters:', JSON.stringify(prevFilters), 'newFilters from closure:', JSON.stringify(filtersWithoutSearch));
      
      const hasMajorFilterChanged = 
        filtersWithoutSearch.sortBy !== prevFilters.sortBy ||
        filtersWithoutSearch.timeFrame !== prevFilters.timeFrame ||
        filtersWithoutSearch.filterHasElytra !== prevFilters.filterHasElytra ||
        filtersWithoutSearch.showOwnedOnly !== prevFilters.showOwnedOnly;
  
      if (hasMajorFilterChanged) {
        // If major filter changed, reset search query too
        setSearchQuery('');
        console.log('[CapeBrowser] Major filter change. Resetting searchQuery. Updated filters:', JSON.stringify(filtersWithoutSearch));
      }

      return { ...prevFilters, ...filtersWithoutSearch };
    });
  
    // Reset page when filters change
    setCurrentPage(0);
  };

  // Function to handle search submission when Enter is pressed
  const handleSearchSubmit = (term: string) => {
    console.log('[CapeBrowser] Search submitted with term:', term);
    
    // Reset search if term is empty
    if (!term.trim()) {
      console.log('[CapeBrowser] Empty search term, resetting search');
      setSearchQuery('');
    } else {
      setSearchQuery(term.trim());
    }
    
    setCurrentPage(0);
  };

  const handleEquipCape = async (capeHash: string) => {
    setIsEquippingCapeId(capeHash);
    const promise = equipCape(capeHash);
    toast.promise(promise, {
      loading: 'Equipping cape...',
      success: () => {
        setIsEquippingCapeId(null);
        return 'Cape equipped successfully!';
      },
      error: (err: any) => {
        setIsEquippingCapeId(null);
        console.error('Error equipping cape:', err);
        return `Failed to equip cape: ${err.message || 'Unknown error'}`;
      },
    });
  };

  const handleUnequipCape = async () => {
    setIsUnequipping(true);
    try {
      await unequipCape();
      toast.success('Cape unequipped successfully!');
    } catch (err: any) {
      console.error('Error unequipping cape:', err);
      toast.error(`Failed to unequip cape: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUnequipping(false);
    }
  };

  const handleDeleteCapeClick = (cape: CosmeticCape) => {
    setCapeToDelete(cape);
    setShowDeleteModal(true);
  };
  
  const handleCancelDelete = () => {
    setCapeToDelete(null);
    setShowDeleteModal(false);
  };
  
  const handleConfirmDelete = async () => {
    if (!capeToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteCape(capeToDelete._id);
      toast.success('Cape deleted successfully!');
      
      // Refresh the cape list to show the updated list
      fetchCapesData(currentPage, filters, searchQuery);
      
      // Close the modal
      setShowDeleteModal(false);
      setCapeToDelete(null);
    } catch (err: any) {
      console.error('Error deleting cape:', err);
      toast.error(`Failed to delete cape: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadClick = async () => {
    try {
      // Open the file dialog to select a PNG file
      const selectedFile = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: 'PNG Images',
          extensions: ['png']
        }]
      });
      
      // If no file was selected (user canceled the dialog), return
      if (!selectedFile) return;

      // Upload directly using the file path and show the preview modal
      const filePath = selectedFile as string;
      setPreviewImagePath(filePath);
      
      // Use convertFileSrc to create a URL that can be used by the WebView
      try {
        console.log('[CapeBrowser] Creating file URL for preview:', filePath);
        const imageUrl = convertFileSrc(filePath);
        setPreviewImageUrl(imageUrl);
        setShowPreviewModal(true);
      } catch (err: any) {
        console.error('Error creating preview URL:', err);
        toast.error(`Couldn't preview file: ${err.message || 'Unknown error'}`);
        // Even if preview fails, we can still try to upload
        handleConfirmUpload(filePath);
      }
    } catch (err: any) {
      console.error('Error selecting cape file:', err);
      toast.error(`Failed to select cape file: ${err.message || 'Unknown error'}`);
    }
  };
  
  const handleCancelUpload = () => {
    // Clean up - no need to revoke URLs when using convertFileSrc
    setPreviewImagePath(null);
    setPreviewImageUrl(null);
    setShowPreviewModal(false);
  };
  
  const handleConfirmUpload = async (filePath?: string) => {
    const path = filePath || previewImagePath;
    if (!path) return;
    
    setIsUploading(true);
    try {
      // Upload the cape using the file path directly
      const capeHash = await uploadCape(path);
      toast.success('Cape uploaded successfully!');
      
      // Refresh the cape list to show the newly uploaded cape
      fetchCapesData(currentPage, filters, searchQuery);
      
      // Close the modal
      setShowPreviewModal(false);
      
    } catch (err: any) {
      console.error('Error uploading cape:', err);
      toast.error(`Failed to upload cape: ${err.message || 'Unknown error'}`);
    } finally {
      // Clean up - no need to revoke URLs when using convertFileSrc
      setPreviewImagePath(null);
      setPreviewImageUrl(null);
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Use the cape service function instead of direct invoke
      await downloadTemplateAndOpenExplorer();
      toast.success('Cape template downloaded to your Downloads folder');
    } catch (err: any) {
      console.error('Error downloading template:', err);
      toast.error(`Failed to download template: ${err.message || 'Unknown error'}`);
    }
  };

  if (error && !isLoading && capes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 p-5 text-center">
        <p className="font-minecraft text-3xl">Error Loading Capes</p>
        <p className="text-lg mt-2 mb-4 text-white/70">{error}</p>
        <Button 
          onClick={() => fetchCapesData(currentPage, filters, searchQuery)} 
          size="md"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-primary overflow-hidden">
      {/* Actions Bar */}
      <div className="p-3 border-b border-white/10 bg-background-secondary flex flex-wrap items-center justify-between gap-2">
        <div className="font-minecraft text-4xl text-white/90 lowercase">Cape Actions</div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            size="sm"
            icon={isUploading ? 
              <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" /> : 
              <Icon icon="solar:upload-minimalistic-bold" className="w-4 h-4" />
            }
            className="min-w-0"
          >
            Upload Cape
          </Button>
          
          <Button
            onClick={handleDownloadTemplate}
            variant="secondary"
            size="sm"
            icon={<Icon icon="solar:download-minimalistic-bold" className="w-4 h-4" />}
            className="min-w-0"
          >
            Template
          </Button>
          
          <Button
            onClick={handleUnequipCape}
            disabled={isUnequipping}
            variant="destructive"
            size="sm"
            icon={isUnequipping ? 
              <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" /> : 
              <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
            }
            className="min-w-0"
          >
            Unequip Cape
          </Button>
        </div>
      </div>

      <CapeFilters 
        onFilterChange={handleFilterChange} 
        currentFilters={filters} 
        onSearchSubmit={handleSearchSubmit} 
      />
      
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {isLoading && capes.length === 0 && (
            <div className="flex items-center justify-center h-full">
                <p className="text-white/70 italic font-minecraft text-xl">Loading Capes...</p>
            </div>
        )}
        <CapeList 
            capes={displayedCapes} 
            onEquipCape={handleEquipCape} 
            isLoading={isLoading && capes.length > 0} 
            isEquippingCapeId={isEquippingCapeId}
            searchQuery={searchQuery}
            canDelete={filters.showOwnedOnly}
            onDeleteCape={handleDeleteCapeClick}
        />
      </div>
      
      {/* Cape Preview Modal using Modal component */}
      {showPreviewModal && previewImageUrl && (
        <Modal
          title="Cape Preview"
          titleIcon={<Icon icon="solar:cloak-linear" className="w-5 h-5" />}
          onClose={handleCancelUpload}
          width="lg"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={handleCancelUpload}
                variant="secondary"
                size="sm"
                className="min-w-0"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirmUpload()}
                disabled={isUploading}
                size="sm"
                icon={isUploading ? 
                  <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" /> : 
                  <Icon icon="solar:upload-minimalistic-bold" className="w-4 h-4" />
                }
                className="min-w-0"
              >
                Upload Cape
              </Button>
            </div>
          }
        >
          <div className="p-6 flex flex-col sm:flex-row gap-6">
            {/* Left side: 2D preview */}
            <div className="flex-1 flex flex-col items-center">
              <h3 className="font-minecraft text-lg text-white/80 mb-2 lowercase">2D Preview</h3>
              <div className="bg-black/30 rounded p-3 w-full flex items-center justify-center">
                <img 
                  src={previewImageUrl} 
                  alt="Cape Preview" 
                  className="max-h-64 object-contain"
                />
              </div>
            </div>
            
            {/* Right side: 3D preview with Cape3DRenderer */}
            <div className="flex-1 flex flex-col items-center">
              <h3 className="font-minecraft text-lg text-white/80 mb-2 lowercase">3D Preview</h3>
              <div className="bg-black/30 rounded p-3 w-full flex items-center justify-center h-[264px]">
                <Cape3DRenderer 
                  imageUrl={previewImageUrl}
                  width={220}
                  height={220}
                  autoRotate={true}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Delete Cape Confirmation Modal */}
      {showDeleteModal && capeToDelete && (
        <Modal
          title="Delete Cape"
          titleIcon={<Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5 text-red-500" />}
          onClose={handleCancelDelete}
          width="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={handleCancelDelete}
                variant="secondary"
                size="sm"
                className="min-w-0"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                variant="destructive"
                size="sm"
                icon={isDeleting ? 
                  <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" /> : 
                  <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
                }
                className="min-w-0"
              >
                {isDeleting ? 'Deleting...' : 'Delete Cape'}
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-white font-minecraft text-lg mb-4">
              Are you sure you want to delete this cape?
            </p>
            <p className="text-white/70 text-md mb-6">
              This action cannot be undone. The cape will be permanently removed from your account.
            </p>
            
            <div className="bg-black/30 rounded p-4 flex items-center gap-4">
              {/* Show cape thumbnail */}
              <div className="w-20 h-20 bg-black/50 rounded flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://noriskclient.de/capes/${capeToDelete._id}`} 
                  alt="Cape to delete" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              <div>
                <p className="text-white font-minecraft text-md">Cape ID: <span className="text-white/70">{capeToDelete._id}</span></p>
                <p className="text-white/70 text-sm">Added on: {new Date(capeToDelete.creationDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 