"use client";

import React from 'react';
import type { ModrinthProjectType, ModrinthSortType } from '../../../types/modrinth';
// Profile type will be defined locally
import { Button } from '../../ui/buttons/Button';
import { SearchInput } from '../../ui/SearchInput';
import { Select, type SelectOption } from '../../ui/Select';
import { IconButton } from '../../ui/buttons/IconButton';
import { TagBadge } from '../../ui/TagBadge';
import { Icon } from '@iconify/react';

// Define Profile type locally, similar to ModrinthSearchV2.tsx
type Profile = any;

export interface ModrinthSearchControlsV2Props {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  projectType: ModrinthProjectType;
  onProjectTypeChange: (type: ModrinthProjectType) => void;
  allProjectTypes: ModrinthProjectType[]; // This will be ALL_MODRINTH_PROJECT_TYPES from parent
  profiles: Profile[];
  selectedProfile: Profile | null;
  onSelectedProfileChange: (profile: Profile | null) => void;
  sortOrder: ModrinthSortType;
  onSortOrderChange: (sort: ModrinthSortType) => void;
  sortOptions: SelectOption[];
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  selectedGameVersions: string[];
  currentSelectedLoaders: string[];
  currentSelectedCategories: string[];
  filterClientRequired: boolean;
  filterServerRequired: boolean;
  onRemoveGameVersionTag: (version: string) => void;
  onRemoveLoaderTag: (loader: string) => void;
  onRemoveCategoryTag: (category: string) => void;
  onRemoveClientRequiredTag: () => void;
  onRemoveServerRequiredTag: () => void;
  onClearAllFilters: () => void;
}

export const ModrinthSearchControlsV2: React.FC<ModrinthSearchControlsV2Props> = ({
  searchTerm,
  onSearchTermChange,
  projectType,
  onProjectTypeChange,
  allProjectTypes,
  profiles,
  selectedProfile,
  onSelectedProfileChange,
  sortOrder,
  onSortOrderChange,
  sortOptions,
  isSidebarVisible,
  onToggleSidebar,
  selectedGameVersions,
  currentSelectedLoaders,
  currentSelectedCategories,
  filterClientRequired,
  filterServerRequired,
  onRemoveGameVersionTag,
  onRemoveLoaderTag,
  onRemoveCategoryTag,
  onRemoveClientRequiredTag,
  onRemoveServerRequiredTag,
  onClearAllFilters,
}) => {
  return (
    <div className="search-bar-and-types p-2">
      <div className="project-types flex space-x-2 mb-3">
        {allProjectTypes.map((type) => (
          <Button
            key={type}
            onClick={() => onProjectTypeChange(type)}
            variant={projectType === type ? "default" : "secondary"}
            size="xs"
          >
            {type}s
          </Button>
        ))}
      </div>

        {/*
      <div className="flex items-center space-x-2 mb-2">
        <label className="text-white text-sm whitespace-nowrap">For Profile:</label>
        <select 
          value={selectedProfile?.id || ''}
          onChange={(e) => {
            const profileId = e.target.value;
            if (profileId === '') {
              onSelectedProfileChange(null);
            } else {
              const profile = profiles.find(p => p.id === profileId);
              onSelectedProfileChange(profile || null);
            }
          }}
          className="p-2 border rounded bg-gray-800 text-white flex-grow focus:ring-blue-500 focus:border-blue-500 h-10"
        >
          <option value="">No Profile (Manual Filter)</option>
          {profiles.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.game_version} - {profile.loader})
            </option>
          ))}
        </select>
      </div>
        */}
    

      <div className="flex items-center space-x-2 mb-2">
        <SearchInput
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder={`Search for ${projectType}s...`}
          className="flex-grow h-[50px]"
        />
        
        <Select
          value={sortOrder}
          onChange={(value) => onSortOrderChange(value as ModrinthSortType)}
          options={sortOptions}
          className="w-48"
        />

        <IconButton
          onClick={onToggleSidebar}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          }
          size="md"
          variant="secondary"
          title={isSidebarVisible ? "Hide filters" : "Show filters"}
        />
      </div>

      {(selectedGameVersions.length > 0 || currentSelectedLoaders.length > 0 || currentSelectedCategories.length > 0 || filterClientRequired || filterServerRequired) && (
        <div className="active-filters-display pt-2 mt-2 flex flex-wrap items-center gap-1">
          {selectedGameVersions.map(version => (
            <TagBadge key={`gv-${version}`}>
              {version}
              <button 
                onClick={() => onRemoveGameVersionTag(version)} 
                className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                aria-label={`Remove game version ${version}`}
              >
                &times;
              </button>
            </TagBadge>
          ))}
          {currentSelectedLoaders.map(loader => (
            <TagBadge key={`loader-${loader}`}>
              {loader}
              <button 
                onClick={() => onRemoveLoaderTag(loader)} 
                className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                aria-label={`Remove loader ${loader}`}
              >
                &times;
              </button>
            </TagBadge>
          ))}
          {currentSelectedCategories.map(category => (
            <TagBadge key={`cat-${category}`}>
              {category}
              <button 
                onClick={() => onRemoveCategoryTag(category)} 
                className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                aria-label={`Remove category ${category}`}
              >
                &times;
              </button>
            </TagBadge>
          ))}
          {filterClientRequired && (
            <TagBadge key="client-req">
              Client
              <button 
                onClick={onRemoveClientRequiredTag} 
                className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                aria-label="Remove client required filter"
              >
                &times;
              </button>
            </TagBadge>
          )}
          {filterServerRequired && (
            <TagBadge key="server-req">
              Server
              <button 
                onClick={onRemoveServerRequiredTag} 
                className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                aria-label="Remove server required filter"
              >
                &times;
              </button>
            </TagBadge>
          )}
          <button onClick={onClearAllFilters} className="ml-auto text-xs text-gray-400 hover:text-red-400 underline px-1 py-0.5">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};