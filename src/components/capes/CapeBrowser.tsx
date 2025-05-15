'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { browseCapes, equipCape, unequipCape, uploadCape, getPlayerCapes, downloadTemplateAndOpenExplorer } from '../../services/cape-service';
import type { CosmeticCape, PaginationInfo, BrowseCapesOptions, GetPlayerCapesPayloadOptions } from '../../types/noriskCapes';
import { CapeList } from './CapeList';
import { CapePagination } from './CapePagination';
import { CapeFilters, type CapeFiltersData } from './CapeFilters';
import { Icon } from '@iconify/react';
import { useThemeStore } from '../../store/useThemeStore';

// Declare the Tauri APIs used in this component
declare global {
  interface Window {
    __TAURI__: {
      path: {
        appLocalDataDir(): Promise<string>;
      };
      fs: {
        writeBinaryFile(options: { contents: ArrayBuffer; path: string }): Promise<void>;
        removeFile(path: string): Promise<void>;
      };
      shell: {
        open(url: string): Promise<void>;
      };
      invoke: (command: string, args?: any) => Promise<void>;
    };
  }
}

export function CapeBrowser() {
  const [capes, setCapes] = useState<CosmeticCape[]>([]);
  const [allFetchedCapes, setAllFetchedCapes] = useState<CosmeticCape[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEquippingCapeId, setIsEquippingCapeId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUnequipping, setIsUnequipping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<CapeFiltersData>({ sortBy: '', timeFrame: '' });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const fetchCapesData = useCallback(async (page: number, currentFilters: CapeFiltersData, term?: string) => {
    console.log('[CapeBrowser] fetchCapesData called with:', { page, currentFilters, term });
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (term && term.trim() !== '') {
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
  }, []);

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
        filtersWithoutSearch.filterHasElytra !== prevFilters.filterHasElytra;
  
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

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is a PNG image
    if (file.type !== 'image/png') {
      toast.error('Only PNG images are supported for capes');
      return;
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Maximum file size is 2MB');
      return;
    }

    setIsUploading(true);
    try {
      // First save the file to a temporary location
      // Note: In a real application, you'd use a more secure approach
      // This is simplified for demonstration purposes
      const filePath = await window.__TAURI__.path.appLocalDataDir();
      const tempFilePath = `${filePath}/temp_cape_upload.png`;
      
      await window.__TAURI__.fs.writeBinaryFile({
        contents: await file.arrayBuffer(),
        path: tempFilePath,
      });

      // Now upload the cape using the Cape API
      const capeHash = await uploadCape(tempFilePath);
      toast.success('Cape uploaded successfully!');
      
      // Refresh the cape list to show the newly uploaded cape
      fetchCapesData(currentPage, filters, searchQuery);
      
      // Clean up the temporary file
      await window.__TAURI__.fs.removeFile(tempFilePath);
    } catch (err: any) {
      console.error('Error uploading cape:', err);
      toast.error(`Failed to upload cape: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <button 
          onClick={() => fetchCapesData(currentPage, filters, searchQuery)} 
          className="font-minecraft lowercase text-2xl px-6 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-primary overflow-hidden">
      {/* Actions Bar */}
      <div className="p-3 border-b border-white/10 bg-background-secondary flex flex-wrap items-center justify-between gap-2">
        <div className="font-minecraft text-xl text-white/90 lowercase">Cape Actions</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-1.5 font-minecraft lowercase px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded transition-colors"
            style={{ backgroundColor: `${accentColor.value}` }}
          >
            {isUploading ? (
              <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon icon="solar:upload-minimalistic-bold" className="w-4 h-4" />
            )}
            Upload Cape
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 font-minecraft lowercase px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            <Icon icon="solar:download-minimalistic-bold" className="w-4 h-4" />
            Template
          </button>
          
          <button
            onClick={handleUnequipCape}
            disabled={isUnequipping}
            className="flex items-center gap-1.5 font-minecraft lowercase px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
          >
            {isUnequipping ? (
              <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
            )}
            Unequip Cape
          </button>

          {/* Hidden file input for cape upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png"
            className="hidden"
          />
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
        />
      </div>

      {paginationInfo && paginationInfo.totalPages > 0 && displayedCapes.length > 0 && (
        <CapePagination paginationInfo={paginationInfo} onPageChange={handlePageChange} />
      )}
    </div>
  );
} 