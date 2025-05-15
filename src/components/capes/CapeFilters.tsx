'use client';

import React, { useState } from 'react';
import { SearchInput } from '../ui/SearchInput'; // Assuming SearchInput is available and styled like in SkinsTab

export interface CapeFiltersData {
  sortBy?: string;
  filterHasElytra?: boolean;
  timeFrame?: string; // Added for time frame filtering
  // filterCreator and timeFrame can be added back if UI elements are implemented
}

interface CapeFiltersProps {
  onFilterChange: (filters: CapeFiltersData) => void;
  currentFilters: CapeFiltersData;
  onSearchSubmit?: (term: string) => void; // For search submission on Enter
}

export function CapeFilters({ onFilterChange, currentFilters, onSearchSubmit }: CapeFiltersProps) {
  // Local state for search input value, no longer stored in parent filters
  const [searchInputValue, setSearchInputValue] = useState<string>('');

  const handleSearchChange = (value: string) => {
    // Just update local state, don't propagate to parent filters
    setSearchInputValue(value);
  };

  // Function to handle search submission
  const handleSearch = () => {
    // Always call onSearchSubmit, even with empty string to allow resetting search
    if (onSearchSubmit) {
      onSearchSubmit(searchInputValue.trim());
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...currentFilters, sortBy: e.target.value || undefined });
  };

  const handleElytraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...currentFilters, filterHasElytra: e.target.checked });
  };

  const handleTimeFrameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...currentFilters, timeFrame: e.target.value || undefined });
  };

  return (
    <div className="p-3 sm:p-4 border-b border-white/10 bg-background-secondary flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2">
      <div className="flex-grow min-w-[180px] sm:min-w-[200px]">
        <SearchInput 
          value={searchInputValue} 
          onChange={handleSearchChange} 
          onSearch={handleSearch}
          placeholder="Search capes..." 
          className="text-xl w-full h-[38px]"
        />
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2">
        <label htmlFor="sort-by" className="font-minecraft text-lg text-white/80 lowercase whitespace-nowrap">
          Sort:
        </label>
        <select 
          id="sort-by"
          value={currentFilters.sortBy || ''}
          onChange={handleSortChange}
          className="bg-black/30 backdrop-blur-md border-2 border-white/20 px-2.5 py-1 text-white font-minecraft text-lg rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200 h-[38px]"
        >
          <option value="">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="mostUsed">Most Used</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <label htmlFor="time-frame" className="font-minecraft text-lg text-white/80 lowercase whitespace-nowrap">
          Period:
        </label>
        <select 
          id="time-frame"
          value={currentFilters.timeFrame || ''} // Default to '' for "All Time"
          onChange={handleTimeFrameChange}
          className="bg-black/30 backdrop-blur-md border-2 border-white/20 px-2.5 py-1 text-white font-minecraft text-lg rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200 h-[38px]"
        >
          <option value="">All Time</option> 
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <input 
          id="filter-elytra"
          type="checkbox"
          checked={currentFilters.filterHasElytra || false}
          onChange={handleElytraChange}
          className="appearance-none w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-white/30 bg-black/20 checked:bg-accent checked:border-accent-hover focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-accent transition duration-200 cursor-pointer"
        />
        <label htmlFor="filter-elytra" className="font-minecraft text-lg text-white/80 lowercase cursor-pointer select-none">
          Elytra
        </label>
      </div>
      {/* Placeholder for other filters like creator and timeFrame can be added here if needed */}
    </div>
  );
} 