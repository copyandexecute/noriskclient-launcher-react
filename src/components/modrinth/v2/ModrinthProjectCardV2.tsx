"use client";

import type React from "react";
import { useState } from "react";
import type {
  ModrinthGameVersion,
  ModrinthSearchHit,
  ModrinthVersion,
} from "../../../types/modrinth";
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { Button } from "../../ui/buttons/Button";
import { IconButton } from "../../ui/buttons/IconButton";
import { Icon } from "@iconify/react";
import { TagBadge } from "../../ui/TagBadge";
import { cn } from "../../../lib/utils";
import { ModrinthVersionListV2 } from "./ModrinthVersionListV2";
import { openExternalUrl } from "../../../services/tauri-service";
import { toast } from "react-hot-toast";

// Define Profile type locally as it's not exported from modrinth.ts
type Profile = any;

interface VersionListPassthroughProps {
  projectVersions: ModrinthVersion[] | null | "loading";
  displayedCount: number;
  versionFilters: {
    gameVersions: string[];
    loaders: string[];
    versionType: string;
  };
  versionDropdownUIState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openVersionDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<string, ContentInstallStatus | null>;
  selectedProfile: Profile | null;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersionsSidebar: string[];
  onVersionFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onVersionUiStateChange: (
    projectId: string,
    field: "showAllGameVersions" | "gameVersionSearchTerm",
    value: boolean | string,
  ) => void;
  onToggleVersionDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (
    project: ModrinthSearchHit,
    version: ModrinthVersion,
  ) => void;
  onHoverVersion: (versionId: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteVersionClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: ModrinthVersion,
  ) => void;
  onToggleEnableClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: ModrinthVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
}

export interface ModrinthProjectCardV2Props
  extends VersionListPassthroughProps {
  hit: ModrinthSearchHit;
  accentColor: AccentColor;
  installStatus: ContentInstallStatus | null;
  onQuickInstallClick: (project: ModrinthSearchHit) => void;
  onInstallModpackAsProfileClick?: (project: ModrinthSearchHit) => void;
  onInstallModpackVersionAsProfileClick?: (
    project: ModrinthSearchHit,
    version: ModrinthVersion,
  ) => void;
  onToggleVersionsClick: (projectId: string) => void;
  isExpanded: boolean;
  isLoadingVersions: boolean;
}

export const ModrinthProjectCardV2: React.FC<ModrinthProjectCardV2Props> = ({
  hit,
  accentColor,
  installStatus,
  onQuickInstallClick,
  onInstallModpackAsProfileClick,
  onInstallModpackVersionAsProfileClick,
  onToggleVersionsClick,
  isExpanded,
  isLoadingVersions,
  projectVersions,
  displayedCount,
  versionFilters,
  versionDropdownUIState,
  openVersionDropdowns,
  installedVersions,
  selectedProfile,
  hoveredVersionId,
  gameVersionsData,
  showAllGameVersionsSidebar,
  selectedGameVersionsSidebar,
  onVersionFilterChange,
  onVersionUiStateChange,
  onToggleVersionDropdown,
  onCloseAllVersionDropdowns,
  onLoadMoreVersions,
  onInstallVersionClick,
  onHoverVersion,
  selectedProfileId,
  onDeleteVersionClick,
  onToggleEnableClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden transition-all duration-150 rounded-md mb-3",
        "border-2 border-b-4",
        "backdrop-blur-md",
        installStatus?.is_installed &&
          !installStatus?.is_included_in_norisk_pack &&
          "border-l-green-500",
        !installStatus?.is_installed &&
          installStatus?.is_included_in_norisk_pack &&
          "border-l-blue-500",
        installStatus?.is_installed &&
          installStatus?.is_included_in_norisk_pack &&
          "border-l-blue-500 border-t-4 border-t-blue-500",
      )}
      style={{
        borderColor: `${accentColor.value}80`,
        borderBottomColor: accentColor.value,
        boxShadow: isHovered
          ? "0 10px 0 rgba(0,0,0,0.3), 0 12px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.1)"
          : "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
        backgroundColor: `${accentColor.value}30`,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div className={cn("relative z-10 p-4")}>
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
        <div className="flex flex-row space-x-4">
          <div
            className="flex-shrink-0 w-24 h-24 border rounded-md"
            style={{
              borderColor: `${accentColor.value}80`,
            }}
          >
            {hit.icon_url ? (
              <img
                src={hit.icon_url || "/placeholder.svg"}
                alt={`${hit.title} icon`}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center rounded-md">
                <span className="text-gray-500 text-3xl">?</span>
              </div>
            )}
          </div>

          <div className="flex-grow min-w-0 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-row items-baseline space-x-1.5">
                <a
                  href={`https://modrinth.com/${hit.project_type}/${hit.slug}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await openExternalUrl(
                        `https://modrinth.com/${hit.project_type}/${hit.slug}`,
                      );
                    } catch (error) {
                      console.error("Failed to open external URL:", error);
                      toast.error("Could not open link in browser.");
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-[color:var(--accent)] truncate font-minecraft-ten normal-case flex-shrink-0 hover:underline cursor-pointer"
                  style={{ color: accentColor.value }}
                  title={`Open ${hit.title} on Modrinth`}
                >
                  {hit.title}
                </a>
                {hit.author && (
                  <p className="text-[10px] text-gray-400 truncate font-minecraft-ten flex-shrink min-w-0">
                    by {hit.author}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-gray-300 line-clamp-2 md:line-clamp-2 font-minecraft-ten leading-tight">
                {hit.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1 overflow-hidden">
              {installStatus && (
                <>
                  {installStatus.is_installed && (
                    <TagBadge variant="success" size="md" withIcon>
                      <Icon
                        icon="solar:check-circle-bold"
                        className="w-4 h-4"
                      />
                      <span>Installed</span>
                    </TagBadge>
                  )}
                  {installStatus.is_included_in_norisk_pack && (
                    <TagBadge variant="info" size="md" withIcon>
                      <Icon icon="solar:bolt-circle-bold" className="w-4 h-4" />
                      <span>In NoRisk Pack</span>
                    </TagBadge>
                  )}
                </>
              )}
              {hit.categories &&
                hit.categories.length > 0 &&
                hit.categories.slice(0, 5).map((category) => (
                  <TagBadge key={category} size="md">
                    {category.replace(/-/g, " ")}
                  </TagBadge>
                ))}
            </div>
          </div>

          <div className="flex-shrink-0 w-40 flex flex-col justify-between items-end">
            <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-minecraft-ten">
              <span className="flex items-center">
                <Icon
                  icon="solar:download-minimalistic-bold"
                  className="w-3.5 h-3.5 mr-0.5"
                />
                {hit.downloads.toLocaleString()}
              </span>
              <span className="flex items-center">
                <Icon icon="solar:heart-bold" className="w-3.5 h-3.5 mr-0.5" />
                {hit.follows.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-1 w-full mt-auto">
              {hit.project_type === "modpack" ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInstallModpackAsProfileClick) {
                      onInstallModpackAsProfileClick(hit);
                    } else {
                      console.warn(
                        "onInstallModpackAsProfileClick is not defined for modpack",
                      );
                      onQuickInstallClick(hit);
                    }
                  }}
                  size="xs"
                  variant="success"
                  className="min-w-0 flex-grow"
                  shadowDepth="short"
                  icon={
                    <Icon
                      icon="solar:download-minimalistic-bold"
                      className="h-4 w-4"
                    />
                  }
                  iconPosition="left"
                >
                  Quick Install
                </Button>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickInstallClick(hit);
                  }}
                  size="xs"
                  variant="success"
                  className="min-w-0 flex-grow"
                  shadowDepth="short"
                  icon={
                    <Icon
                      icon="solar:download-minimalistic-bold"
                      className="h-4 w-4"
                    />
                  }
                  iconPosition="left"
                >
                  Quick Install
                </Button>
              )}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVersionsClick(hit.project_id);
                }}
                size="xs"
                shadowDepth="short"
                variant="default"
                icon={
                  isLoadingVersions ? (
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <Icon
                      icon={
                        isExpanded
                          ? "solar:alt-arrow-up-bold"
                          : "solar:alt-arrow-down-bold"
                      }
                      className="w-3.5 h-3.5"
                    />
                  )
                }
                disabled={isLoadingVersions}
                title={isExpanded ? "Hide Versions" : "Show Versions"}
                className="flex-shrink-0"
              />
            </div>
          </div>
        </div>
      </div>

      {isExpanded &&
        Array.isArray(projectVersions) &&
        projectVersions.length > 0 && (
          <ModrinthVersionListV2
            projectId={hit.project_id}
            project={hit}
            versions={projectVersions as ModrinthVersion[]}
            displayedCount={displayedCount}
            filters={versionFilters}
            uiState={versionDropdownUIState}
            openDropdowns={openVersionDropdowns}
            installedVersions={installedVersions}
            selectedProfile={selectedProfile}
            selectedProfileId={selectedProfileId}
            hoveredVersionId={hoveredVersionId}
            gameVersionsData={gameVersionsData}
            showAllGameVersionsSidebar={showAllGameVersionsSidebar}
            selectedGameVersionsSidebar={selectedGameVersionsSidebar}
            accentColor={accentColor}
            onFilterChange={onVersionFilterChange}
            onUiStateChange={onVersionUiStateChange}
            onToggleDropdown={onToggleVersionDropdown}
            onCloseAllDropdowns={onCloseAllVersionDropdowns}
            onLoadMore={onLoadMoreVersions}
            onInstallClick={onInstallVersionClick}
            onInstallModpackVersionAsProfileClick={
              onInstallModpackVersionAsProfileClick
            }
            onHoverVersion={onHoverVersion}
            onDeleteClick={onDeleteVersionClick}
            onToggleEnableClick={onToggleEnableClick}
          />
        )}
    </div>
  );
};
