'use client';

import React, { useState } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Select, type SelectOption } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Icon } from '@iconify/react';
import { Button } from '../ui/buttons/Button';
import { useMinecraftAuthStore } from '../../store/minecraft-auth-store';

export interface CapeFiltersData {
  sortBy?: string;
  filterHasElytra?: boolean;
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
  const handleSearch = () => {
    // Always call onSearchSubmit, even with empty string to allow resetting search
    if (onSearchSubmit) {
      onSearchSubmit(searchInputValue.trim());
    }
  };

  const handleSortChange = (value: string) => {
    onFilterChange({ ...currentFilters, sortBy: value || undefined });
  };

  const handleElytraChange = () => {
    onFilterChange({ ...currentFilters, filterHasElytra: !currentFilters.filterHasElytra });
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
    { value: 'oldest', label: 'Oldest', icon: <Icon icon="solar:sort-by-time-down-linear" className="w-5 h-5" /> },
    { value: 'mostUsed', label: 'Most Used', icon: <Icon icon="solar:heart-bold" className="w-5 h-5" /> },
  ];

  // Time frame options for the Select component
  const timeFrameOptions: SelectOption[] = [
    { value: '', label: 'All Time', icon: <Icon icon="solar:calendar-mark-linear" className="w-5 h-5" /> },
    { value: 'weekly', label: 'Weekly', icon: <Icon icon="solar:calendar-week-linear" className="w-5 h-5" /> },
    { value: 'monthly', label: 'Monthly', icon: <Icon icon="solar:calendar-date-linear" className="w-5 h-5" /> },
  ];

  return (
    <div className="p-3 sm:p-4 border-b border-white/10 bg-background-secondary flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2">
      <div className="flex-grow min-w-[180px] sm:min-w-[200px] max-w-96">
        <SearchInput 
          value={searchInputValue} 
          onChange={handleSearchChange} 
          onSearch={handleSearch}
          placeholder="Search capes..." 
          className="text-xl w-full h-[38px]"
        />
      </div>

      <div className={"flex-grow"}/>
      
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Select 
          value={currentFilters.sortBy || ''}
          onChange={handleSortChange}
          options={sortOptions}
          size="md"
          className="w-[160px]"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Select
          value={currentFilters.timeFrame || ''}
          onChange={handleTimeFrameChange}
          options={timeFrameOptions}
          size="md"
          className="w-[160px]"
        />
      </div>

      <Button
        onClick={handleElytraChange}
        variant={currentFilters.filterHasElytra ? "default" : "secondary"}
        size="sm"
        icon={<Icon icon="solar:user-id-broken" className="w-4 h-4" />}
        className="min-w-0"
        disabled={!activeAccount}
        title={!activeAccount ? "No active Minecraft account" : undefined}
      >
        Only Elytra
      </Button>

      <Button
        onClick={handleOwnedToggle}
        variant={currentFilters.showOwnedOnly ? "default" : "secondary"}
        size="sm"
        icon={<Icon icon="solar:user-id-broken" className="w-4 h-4" />}
        className="min-w-0"
        disabled={!activeAccount}
        title={!activeAccount ? "No active Minecraft account" : undefined}
      >
        My Capes
      </Button>
      
      {/* Placeholder for other filters like creator and timeFrame can be added here if needed */}
    </div>
  );
} 