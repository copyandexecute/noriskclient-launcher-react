'use client';

import React, { useState } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Select, type SelectOption } from '../ui/Select';
import { Icon } from '@iconify/react';
import { Button } from '../ui/buttons/Button';
import { useMinecraftAuthStore } from '../../store/minecraft-auth-store';

export interface CapeFiltersData {
  sortBy?: string;
  timeFrame?: string; // Added for time frame filtering
  showOwnedOnly?: boolean; // Add filter for showing only owned capes
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
  const { activeAccount } = useMinecraftAuthStore();

  const handleSearchChange = (value: string) => {
    // Just update local state, don't propagate to parent filters
    setSearchInputValue(value);
  };

  // Function to handle search submission
  const handleSearch = (searchTerm: string) => {
    // If 'My Capes' is active, deactivate it before searching
    if (currentFilters.showOwnedOnly) {
      onFilterChange({ ...currentFilters, showOwnedOnly: false });
    }
    // Always call onSearchSubmit
    if (onSearchSubmit) {
      onSearchSubmit(searchTerm.trim());
    }
  };

  const handleSortChange = (value: string) => {
    onFilterChange({ ...currentFilters, sortBy: value || undefined });
  };

  const handleTimeFrameChange = (value: string) => {
    onFilterChange({ ...currentFilters, timeFrame: value || undefined });
  };

  const handleOwnedToggle = () => {
    onFilterChange({ 
      ...currentFilters, 
      showOwnedOnly: !currentFilters.showOwnedOnly 
    });
  };

  // Sort options for the Select component
  const sortOptions: SelectOption[] = [
    { value: '', label: 'Newest', icon: <Icon icon="solar:sort-by-time-linear" className="w-5 h-5" /> },
    { value: 'oldest', label: 'Oldest', icon: <Icon icon="mdi:arrow-up-bold-circle-outline" className="w-5 h-5" /> },
    { value: 'mostUsed', label: 'Most Used', icon: <Icon icon="solar:heart-bold" className="w-5 h-5" /> },
  ];

  // Time frame options for the Select component
  const timeFrameOptions: SelectOption[] = [
    { value: '', label: 'All Time', icon: <Icon icon="solar:calendar-mark-linear" className="w-5 h-5" /> },
    { value: 'weekly', label: 'Weekly', icon: <Icon icon="mdi:calendar-week-outline" className="w-5 h-5" /> },
    { value: 'monthly', label: 'Monthly', icon: <Icon icon="solar:calendar-date-linear" className="w-5 h-5" /> },
  ];

  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex-grow min-w-[180px] sm:min-w-[200px] md:max-w-[250px]">
        <SearchInput 
          value={searchInputValue} 
          onChange={handleSearchChange} 
          onSearch={handleSearch}
          placeholder="Search capes..." 
          className="text-xl w-full h-[42px]"
        />
      </div>
      
      <Select 
        value={currentFilters.sortBy || ''}
        onChange={handleSortChange}
        options={sortOptions}
        className="w-[140px] md:w-[160px]"
        aria-label="Sort by"
      />

      <Select
        value={currentFilters.timeFrame || ''}
        onChange={handleTimeFrameChange}
        options={timeFrameOptions}
        className="w-[140px] md:w-[160px]"
        aria-label="Filter by period"
      />

      <Button
        onClick={handleOwnedToggle}
        variant={currentFilters.showOwnedOnly ? "default" : "secondary"}
        size="sm"
        icon={<Icon icon="solar:user-id-broken" className="w-4 h-4" />}
        className="min-w-0 h-[42px]"
        disabled={!activeAccount}
        title={!activeAccount ? "No active Minecraft account" : (currentFilters.showOwnedOnly ? "Show All Capes" : "Show My Capes")}
      >
        My Capes
      </Button>
      
      {/* Placeholder for other filters like creator and timeFrame can be added here if needed */}
    </div>
  );
} 