'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { browseCapes, equipCape, getPlayerCapes } from '../../services/cape-service';
import type { CosmeticCape, PaginationInfo, BrowseCapesOptions, GetPlayerCapesPayloadOptions } from '../../types/noriskCapes';
import { CapeList } from './CapeList';
import { CapePagination } from './CapePagination';
import { CapeFilters, type CapeFiltersData } from './CapeFilters';
import { useDebounce } from '../../hooks/useDebounce'; // For debouncing search term

export function CapeBrowser() {
  const [capes, setCapes] = useState<CosmeticCape[]>([]);
  const [allFetchedCapes, setAllFetchedCapes] = useState<CosmeticCape[]>([]); // To store all capes for client-side search if API doesn't support it directly
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEquippingCapeId, setIsEquippingCapeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<CapeFiltersData>({ sortBy: '', timeFrame: '' }); // Default sortBy to newest and initialize timeFrame for "All Time"
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

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
          page,
          page_size: 20, // Or use a state variable for pageSize
          // filter_accepted is true by default in Rust command if not specified, or can be added here
        };
        console.log('[CapeBrowser] Options object before calling getPlayerCapes:', JSON.stringify(playerCapesOptions));
        response = await getPlayerCapes(playerCapesOptions);
        console.log('[CapeBrowser] getPlayerCapes response:', { count: response.capes.length, pagination: response.pagination });
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
      }
      
      setAllFetchedCapes(response.capes); 
      setCapes(response.capes); 
      setPaginationInfo(response.pagination);
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
    console.log('[CapeBrowser] useEffect triggered. Dependencies:', { currentPage, filters, debouncedSearchTerm });
    fetchCapesData(currentPage, filters, debouncedSearchTerm);
  }, [currentPage, filters, debouncedSearchTerm, fetchCapesData]); // Added debouncedSearchTerm

  // Client-side filtering is no longer needed if search triggers a server-side player cape fetch.
  // This can be removed or adjusted. For now, it will operate on whatever `capes` contains.
  // If a search term is active, `capes` will be player-specific capes.
  // If no search term, `capes` will be browse results.
  // So, this existing filter might still be useful for further filtering player-specific capes locally,
  // but the primary search is now server-side.
  const primarilyFilteredCapes = capes; // Data is now primarily filtered by server

  // This local search can be kept if you want to further filter the results from getPlayerCapes or browseCapes
  // For example, if getPlayerCapes returns many capes for a player, and you want to type to find one.
  // However, if the search input's main purpose is to trigger getPlayerCapes, this might be confusing.
  // For now, I'll assume the search term in the input is for `getPlayerCapes`.
  // The `filteredCapes` useMemo will just return what's in `capes` if a server search is done.
  // If no server search (no debouncedSearchTerm), it might still be used for browseCapes results if we implement local filtering there.

  // Let's simplify: if debouncedSearchTerm is used for getPlayerCapes, `capes` already contains filtered data.
  // No need for further client-side filtering based on the same term.
  const displayedCapes = capes; // Directly use capes from state, as filtering is server-side or not applicable for player search.

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = (newFilters: CapeFiltersData) => {
    console.log('[CapeBrowser] handleFilterChange RAW newFilters received:', JSON.stringify(newFilters));

    setFilters(prevFilters => {
      console.log('[CapeBrowser] Inside setFilters. prevFilters:', JSON.stringify(prevFilters), 'newFilters from closure:', JSON.stringify(newFilters));
      
      const hasMajorFilterChanged = 
        newFilters.sortBy !== prevFilters.sortBy ||
        newFilters.timeFrame !== prevFilters.timeFrame ||
        newFilters.filterHasElytra !== prevFilters.filterHasElytra;
  
      let updatedFilters;
      if (hasMajorFilterChanged) {
        updatedFilters = { ...newFilters, searchTerm: undefined };
        console.log('[CapeBrowser] Major filter change. Resetting searchTerm. Updated filters:', JSON.stringify(updatedFilters));
      } else {
        // Only searchTerm has changed, or no change (e.g. if only searchTerm was in newFilters and it matched prevFilters.searchTerm)
        // Ensure all properties from newFilters are preserved.
        updatedFilters = { ...prevFilters, ...newFilters }; 
        console.log('[CapeBrowser] SearchTerm change or minor. Updated filters:', JSON.stringify(updatedFilters));
      }
      return updatedFilters;
    });
  
    setCurrentPage(0); // Page Reset happens when any filter changes
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
          onClick={() => fetchCapesData(currentPage, filters)} 
          className="font-minecraft lowercase text-2xl px-6 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-primary overflow-hidden">
      <CapeFilters onFilterChange={handleFilterChange} currentFilters={filters} />
      
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
            searchQuery={debouncedSearchTerm}
        />
      </div>

      {paginationInfo && paginationInfo.totalPages > 0 && displayedCapes.length > 0 && (
        <CapePagination paginationInfo={paginationInfo} onPageChange={handlePageChange} />
      )}
    </div>
  );
} 