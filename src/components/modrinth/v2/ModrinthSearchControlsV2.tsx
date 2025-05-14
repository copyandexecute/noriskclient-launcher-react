"use client";

import type React from "react";
import { useRef } from "react";
import type {
  ModrinthProjectType,
  ModrinthSortType,
} from "../../../types/modrinth";
import { Button } from "../../ui/buttons/Button";
import { SearchInput } from "../../ui/SearchInput";
import { Select, type SelectOption } from "../../ui/Select";
import { IconButton } from "../../ui/buttons/IconButton";
import { TagBadge } from "../../ui/TagBadge";
import { useDisplayContextStore } from "../../../store/useDisplayContextStore";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { cn } from "../../../lib/utils"; // Define Profile type locally, similar to ModrinthSearchV2.tsx

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

export const ModrinthSearchControlsV2: React.FC<
  ModrinthSearchControlsV2Props
> = ({
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
  const displayContext = useDisplayContextStore((state) => state.context);
  const accentColor = useThemeStore((state) => state.accentColor);
  const filtersContainerRef = useRef<HTMLDivElement>(null);

  const isDetailView = displayContext === "detail";
  const buttonSize = isDetailView
    ? isSidebarVisible
      ? "xs"
      : "sm"
    : !isSidebarVisible
      ? "lg"
      : "sm";

  const totalFilters =
    selectedGameVersions.length +
    currentSelectedLoaders.length +
    currentSelectedCategories.length +
    (filterClientRequired ? 1 : 0) +
    (filterServerRequired ? 1 : 0);

  return (
    <div className={`search-bar-and-types p-${isDetailView ? "1.5" : "2"}`}>
      <div className="project-types flex space-x-2 mb-3">
        {allProjectTypes.map((type) => (
          <Button
            key={type}
            onClick={() => onProjectTypeChange(type)}
            variant={projectType === type ? "default" : "secondary"}
            size={buttonSize}
            className={`w-full`}
          >
            {type}s
          </Button>
        ))}
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <SearchInput
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder={`Search for ${projectType}s...`}
          className={`h-[48px]`}
        />

        <Select
          value={sortOrder}
          onChange={(value) => onSortOrderChange(value as ModrinthSortType)}
          options={sortOptions}
          className={`max-w-[180px]`}
        />

        <IconButton
          onClick={onToggleSidebar}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          }
          size={isDetailView ? "md" : "md"}
          variant="secondary"
          title={isSidebarVisible ? "Hide filters" : "Show filters"}
        />
      </div>

      {totalFilters > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div
            className={cn(
              "flex-1 border rounded-md h-[48px] overflow-x-auto overflow-y-hidden whitespace-nowrap",
              "hide-scrollbar",
            )}
            style={{
              backgroundColor: `${accentColor.value}15`,
              borderColor: `${accentColor.value}30`,
            }}
            ref={filtersContainerRef}
          >
            <div className="flex items-center gap-1.5 p-2">
              {selectedGameVersions.map((version) => (
                <TagBadge
                  key={`gv-${version}`}
                  className="inline-flex whitespace-nowrap"
                >
                  {version}
                  <button
                    onClick={() => onRemoveGameVersionTag(version)}
                    className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                    aria-label={`Remove game version ${version}`}
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </TagBadge>
              ))}

              {currentSelectedLoaders.map((loader) => (
                <TagBadge
                  key={`loader-${loader}`}
                  className="inline-flex whitespace-nowrap"
                >
                  {loader}
                  <button
                    onClick={() => onRemoveLoaderTag(loader)}
                    className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                    aria-label={`Remove loader ${loader}`}
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </TagBadge>
              ))}

              {currentSelectedCategories.map((category) => (
                <TagBadge
                  key={`cat-${category}`}
                  className="inline-flex whitespace-nowrap"
                >
                  {category}
                  <button
                    onClick={() => onRemoveCategoryTag(category)}
                    className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                    aria-label={`Remove category ${category}`}
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </TagBadge>
              ))}

              {filterClientRequired && (
                <TagBadge
                  key="client-req"
                  className="inline-flex whitespace-nowrap"
                >
                  Client
                  <button
                    onClick={onRemoveClientRequiredTag}
                    className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                    aria-label="Remove client required filter"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </TagBadge>
              )}

              {filterServerRequired && (
                <TagBadge
                  key="server-req"
                  className="inline-flex whitespace-nowrap"
                >
                  Server
                  <button
                    onClick={() => onRemoveServerRequiredTag}
                    className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                    aria-label="Remove server required filter"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </TagBadge>
              )}
            </div>
          </div>

          <TagBadge
            variant="destructive"
            className="cursor-pointer hover:brightness-110 transition-all flex-shrink-0 h-[48px] flex items-center"
          >
            <button onClick={onClearAllFilters}> Clear All</button>
          </TagBadge>
        </div>
      )}
    </div>
  );
};
