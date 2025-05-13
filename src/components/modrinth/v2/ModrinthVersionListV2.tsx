"use client";

import React from 'react';
import { cn } from '../../../lib/utils';
import type {
  ModrinthVersion,
  ModrinthSearchHit,
  ModrinthGameVersion,
} from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';
import { Icon } from '@iconify/react';
import { Button } from '../../ui/buttons/Button';
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import { ModrinthVersionItemV2 } from './ModrinthVersionItemV2';

// --- Define Props for the new component ---
interface ModrinthVersionListV2Props {
  projectId: string;
  project: ModrinthSearchHit;
  versions: ModrinthVersion[];
  displayedCount: number;
  filters: {
    gameVersions: string[];
    loaders: string[];
    versionType: string;
  };
  uiState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<
    string,
    { is_installed: boolean; is_included_in_norisk_pack: boolean }
  >;
  selectedProfile: any | null; // Replace 'any' with actual Profile type if available
  accentColor: AccentColor;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[]; // Needed for filtering
  showAllGameVersionsSidebar: boolean; // State from main sidebar
  selectedGameVersionsSidebar: string[]; // State from main sidebar
  onFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onUiStateChange: (
    projectId: string,
    field: keyof ModrinthVersionListV2Props["uiState"],
    value: boolean | string,
  ) => void;
  onToggleDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllDropdowns: (projectId: string) => void;
  onLoadMore: (projectId: string) => void;
  onInstallClick: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onInstallModpackVersionAsProfileClick?: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onHoverVersion: (id: string | null) => void;
}

// --- Component Implementation ---
export const ModrinthVersionListV2: React.FC<ModrinthVersionListV2Props> = ({
  projectId,
  project,
  versions,
  displayedCount,
  filters,
  uiState,
  openDropdowns,
  installedVersions,
  selectedProfile,
  accentColor,
  hoveredVersionId,
  gameVersionsData,
  showAllGameVersionsSidebar,
  selectedGameVersionsSidebar,
  onFilterChange,
  onUiStateChange,
  onToggleDropdown,
  onCloseAllDropdowns,
  onLoadMore,
  onInstallClick,
  onInstallModpackVersionAsProfileClick,
  onHoverVersion,
}) => {
  // --- Helper function to get filtered versions (moved from parent) ---
  const getFilteredVersions = (
    allVersions: ModrinthVersion[],
  ): ModrinthVersion[] => {
    if (!filters) return allVersions;

    return allVersions.filter((version) => {
      // Filter by version type
      if (
        filters.versionType !== "all" &&
        version.version_type !== filters.versionType
      ) {
        return false;
      }

      // Filter by game versions (if any selected)
      if (filters.gameVersions.length > 0) {
        const hasMatchingGameVersion = version.game_versions.some((gv) =>
          filters.gameVersions.includes(gv),
        );
        if (!hasMatchingGameVersion) return false;
      }

      // Filter by loaders (if any selected)
      if (filters.loaders.length > 0) {
        const hasMatchingLoader = version.loaders.some((loader) =>
          filters.loaders.includes(loader),
        );
        if (!hasMatchingLoader) return false;
      }

      return true;
    });
  };

  const filteredVersions = getFilteredVersions(versions);

  // --- JSX Rendering (To be moved here in the next step) ---
  return (
    <div className="p-3 relative">
      {/* Header with version filters - Moved from ModrinthSearchV2 */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Version Type Dropdown */}
          <div className="relative">
            <Button
              onClick={() => onToggleDropdown(projectId, "type")}
              size="xs"
              variant="secondary"
              shadowDepth="short"
              icon={<Icon icon="solar:alt-arrow-down-bold" className="w-3 h-3" />}
              iconPosition="right"
            >
              Type: {filters?.versionType || "all"}
            </Button>
            <div
              className={cn(
                "absolute font-minecraft backdrop-blur-md z-20 mt-1 w-40 overflow-hidden",
                "rounded-md text-white",
                "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
                !(openDropdowns?.type) && "hidden",
              )}
              style={{
                backgroundColor: `${accentColor.value}15`,
                borderColor: `${accentColor.value}40`,
                borderBottomColor: accentColor.dark,
                boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.light}20, inset 0 0 0 1px ${accentColor.value}10`,
              }}
            >
              <div className="relative z-10 p-1">
                {["all", "release", "beta", "alpha"].map((type) => {
                  const isActive = filters?.versionType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        onFilterChange(projectId, "versionType", type);
                        onCloseAllDropdowns(projectId);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-1.5 p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                        "hover:bg-white/10 active:bg-white/5",
                        isActive && "bg-white/15",
                      )}
                      style={{ color: isActive ? accentColor.value : "white" }}
                    >
                      <span className="flex-grow text-left">{type}</span>
                      {isActive && (
                        <Icon
                          icon="ph:check-bold"
                          className="w-4 h-4 flex-shrink-0 ml-2"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Game Version Dropdown */}
          <div className="relative">
            <Button
              onClick={() => onToggleDropdown(projectId, "gameVersion")}
              size="xs"
              variant="secondary"
              shadowDepth="short"
              icon={<Icon icon="solar:alt-arrow-down-bold" className="w-3 h-3" />}
              iconPosition="right"
            >
              Game Version ({filters?.gameVersions?.length || 0})
            </Button>
            <div
              className={cn(
                "absolute font-minecraft backdrop-blur-md z-20 mt-1 w-56 overflow-hidden",
                "rounded-md text-white",
                "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
                !(openDropdowns?.gameVersion) && "hidden",
              )}
              style={{
                backgroundColor: `${accentColor.value}15`,
                borderColor: `${accentColor.value}40`,
                borderBottomColor: accentColor.dark,
                boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.light}20, inset 0 0 0 1px ${accentColor.value}10`,
              }}
            >
              {/* --- Search Input --- */}
              <div className="p-1.5">
                <Input
                  type="text"
                  placeholder="Search versions..."
                  value={uiState?.gameVersionSearchTerm || ""}
                  onChange={(e) =>
                    onUiStateChange(
                      projectId,
                      "gameVersionSearchTerm",
                      e.target.value,
                    )
                  }
                  className="w-full h-7 text-xs"
                />
              </div>
              {/* --- End Search Input --- */}

              {/* Inner scrollable container for Game Version List */}
              <div className="relative z-10 p-1 max-h-40 overflow-y-auto">
                {((
                  () => {
                    // --- Calculation of available game versions (moved from parent IIFE) ---
                    const allProjectGameVersionsSet = new Set(
                      versions.flatMap((v) => v.game_versions),
                    );
                    let availableGVs = Array.from(allProjectGameVersionsSet);

                    if (!uiState?.showAllGameVersions) {
                      // Apply main sidebar filters when checkbox is OFF
                      if (selectedGameVersionsSidebar.length > 0) {
                        availableGVs = availableGVs.filter((gv) =>
                          selectedGameVersionsSidebar.includes(gv),
                        );
                      }
                      if (!showAllGameVersionsSidebar) {
                        const releaseVersions = new Set(
                          gameVersionsData
                            .filter((v) => v.version_type === "release")
                            .map((v) => v.version),
                        );
                        availableGVs = availableGVs.filter((gv) =>
                          releaseVersions.has(gv),
                        );
                      }
                    }

                    // Apply search term filter
                    if (uiState?.gameVersionSearchTerm) {
                      const searchTermLower =
                        uiState.gameVersionSearchTerm.toLowerCase();
                      availableGVs = availableGVs.filter((gv) =>
                        gv.toLowerCase().includes(searchTermLower),
                      );
                    }

                    // Apply descending sort
                    return availableGVs.sort((a, b) =>
                      b.localeCompare(a, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      }),
                    );
                  }
                )()).map((gv) => {
                  const isChecked = filters?.gameVersions?.includes(gv) || false;
                  return (
                    <button
                      key={gv}
                      onClick={() => {
                        const current = filters?.gameVersions || [];
                        const newValue =
                          isChecked
                            ? current.filter((v) => v !== gv)
                            : [...current, gv];
                        onFilterChange(projectId, "gameVersions", newValue);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-1.5 p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                        "hover:bg-white/10 active:bg-white/5",
                        isChecked && "bg-white/15",
                      )}
                      style={{ color: isChecked ? accentColor.value : "white" }}
                    >
                      <span className="flex-grow text-left">{gv}</span>
                      {isChecked && (
                        <Icon
                          icon="ph:check-bold"
                          className="w-4 h-4 flex-shrink-0 ml-2"
                        />
                      )}
                    </button>
                  );
                })}
                {/* Show message if no versions match search/filter */}
                {((
                  () => {
                    // Re-calculate filtered list to check count
                    const allProjectGameVersionsSet = new Set(
                      versions.flatMap((v) => v.game_versions),
                    );
                    let availableGVs = Array.from(allProjectGameVersionsSet);
                    if (!uiState?.showAllGameVersions) {
                      if (selectedGameVersionsSidebar.length > 0) {
                        availableGVs = availableGVs.filter((gv) =>
                          selectedGameVersionsSidebar.includes(gv),
                        );
                      }
                      if (!showAllGameVersionsSidebar) {
                        const releaseVersions = new Set(
                          gameVersionsData
                            .filter((v) => v.version_type === "release")
                            .map((v) => v.version),
                        );
                        availableGVs = availableGVs.filter((gv) =>
                          releaseVersions.has(gv),
                        );
                      }
                    }
                    if (uiState?.gameVersionSearchTerm) {
                      const searchTermLower =
                        uiState.gameVersionSearchTerm.toLowerCase();
                      availableGVs = availableGVs.filter((gv) =>
                        gv.toLowerCase().includes(searchTermLower),
                      );
                    }
                    if (availableGVs.length === 0) {
                      return (
                        <p className="text-xs text-gray-500 italic p-1 text-center">
                          Keine Treffer.
                        </p>
                      );
                    }
                    return null;
                  }
                )())}
              </div>
              {/* --- 'Show All' Toggle --- */}
              <div className="p-1.5">
                <Checkbox
                  id={`show-all-gv-${projectId}`}
                  label="Show All Versions"
                  checked={uiState?.showAllGameVersions || false}
                  onChange={(e) =>
                    onUiStateChange(projectId, "showAllGameVersions", e.target.checked)
                  }
                  className="text-sm"
                />
              </div>
              {/* --- End 'Show All' Toggle --- */}
            </div>
          </div>

          {/* Loader Dropdown */}
          <div className="relative">
            <Button
              onClick={() => onToggleDropdown(projectId, "loader")}
              size="xs"
              variant="secondary"
              shadowDepth="short"
              icon={<Icon icon="solar:alt-arrow-down-bold" className="w-3 h-3" />}
              iconPosition="right"
            >
              Loader ({filters?.loaders?.length || 0})
            </Button>
            <div
              className={cn(
                "absolute font-minecraft backdrop-blur-md z-20 mt-1 w-40 overflow-hidden max-h-48",
                "rounded-md text-white",
                "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
                !(openDropdowns?.loader) && "hidden",
              )}
              style={{
                backgroundColor: `${accentColor.value}15`,
                borderColor: `${accentColor.value}40`,
                borderBottomColor: accentColor.dark,
                boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.light}20, inset 0 0 0 1px ${accentColor.value}10`,
              }}
            >
              {/* Inner scrollable container */}
              <div className="relative z-10 p-1 max-h-48 overflow-y-auto">
                {((
                  () => {
                    const allProjectLoaders = Array.from(
                      new Set(versions.flatMap((v) => v.loaders)),
                    );
                    return allProjectLoaders.sort();
                  }
                )()).map((loader) => {
                  const isChecked = filters?.loaders?.includes(loader) || false;
                  return (
                    <button
                      key={loader}
                      onClick={() => {
                        const current = filters?.loaders || [];
                        const newValue =
                          isChecked
                            ? current.filter((l) => l !== loader)
                            : [...current, loader];
                        onFilterChange(projectId, "loaders", newValue);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-1.5 p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                        "hover:bg-white/10 active:bg-white/5",
                        isChecked && "bg-white/15",
                      )}
                      style={{ color: isChecked ? accentColor.value : "white" }}
                    >
                      <span className="flex-grow text-left">{loader}</span>
                      {isChecked && (
                        <Icon
                          icon="ph:check-bold"
                          className="w-4 h-4 flex-shrink-0 ml-2"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Re-added Backdrop --- */}
      {(openDropdowns?.type ||
        openDropdowns?.gameVersion ||
        openDropdowns?.loader) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => onCloseAllDropdowns(projectId)}
        ></div>
      )}
      {/* --- End Backdrop --- */}

      {/* Filtered Versions List - Moved from ModrinthSearchV2 */}
      {filteredVersions.length > 0 ? (
        <div className="space-y-2">
          {filteredVersions.slice(0, displayedCount).map((version) => {
            const versionStatus = selectedProfile
              ? installedVersions[version.id]
              : null;
            const isVersionHovered = hoveredVersionId === version.id;
            return (
              <ModrinthVersionItemV2
                key={version.id}
                version={version}
                project={project}
                versionStatus={versionStatus}
                accentColor={accentColor}
                isHovered={isVersionHovered}
                onMouseEnter={() => onHoverVersion(version.id)}
                onMouseLeave={() => onHoverVersion(null)}
                onInstallClick={onInstallClick}
                onInstallModpackVersionAsProfileClick={onInstallModpackVersionAsProfileClick}
              />
            );
          })}
          {/* Load More Button */}
          {filteredVersions.length > displayedCount && (
            <Button
              onClick={() => onLoadMore(projectId)}
              variant="secondary"
              size="xs"
              shadowDepth="short"
              className="w-full mt-2 text-xs"
            >
              Load More ({filteredVersions.length - displayedCount} more)
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          No versions match the selected filters.
        </p>
      )}
    </div>
  );
}; 