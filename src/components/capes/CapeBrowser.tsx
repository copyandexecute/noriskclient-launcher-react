'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { browseCapes, equipCape, getPlayerCapes } from '../../services/cape-service';
import type { CosmeticCape, PaginationInfo, BrowseCapesOptions, GetPlayerCapesPayloadOptions } from '../../types/noriskCapes';
import { CapeList } from './CapeList';
import { CapePagination } from './CapePagination';
import { CapeFilters, type CapeFiltersData } from './CapeFilters';

export function CapeBrowser() {
  const [capes, setCapes] = useState<CosmeticCape[]>([]);
  const [allFetchedCapes, setAllFetchedCapes] = useState<CosmeticCape[]>([]); // To store all capes for client-side search if API doesn't support it directly
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEquippingCapeId, setIsEquippingCapeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<CapeFiltersData>({ sortBy: '', timeFrame: '' }); // Default sortBy to newest and initialize timeFrame for "All Time"
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(''); // Active search query (triggered by Enter)

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
  }, [currentPage, filters, searchQuery, fetchCapesData]); // Using searchQuery now instead of debouncedSearchTerm

  // This local search can be kept if you want to further filter the results from getPlayerCapes or browseCapes
  const displayedCapes = capes; // Directly use capes from state

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

  if (error && !isLoading && capes.length === 0) { // Show error prominently if initial load fails
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
      <CapeFilters 
        onFilterChange={handleFilterChange} 
        currentFilters={filters} 
        onSearchSubmit={handleSearchSubmit} 
      />
      
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {/* Show loading overlay for list if capes.length > 0 but still loading new page/filter results */}
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