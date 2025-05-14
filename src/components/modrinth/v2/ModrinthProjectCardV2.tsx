"use client";

import React, { useState } from 'react';
import type { ModrinthSearchHit, ModrinthVersion, ModrinthGameVersion } from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';
import type { ContentInstallStatus } from '../../../types/profile';
import { Button } from '../../ui/buttons/Button';
import { IconButton } from '../../ui/buttons/IconButton';
import { Icon } from '@iconify/react';
import { TagBadge } from '../../ui/TagBadge';
import { cn } from '../../../lib/utils';
import { ModrinthVersionListV2 } from './ModrinthVersionListV2';
import { openExternalUrl } from '../../../services/tauri-service';
import { toast } from 'react-hot-toast';

// Define Profile type locally as it's not exported from modrinth.ts
type Profile = any;

interface VersionListPassthroughProps {
  projectVersions: ModrinthVersion[] | null | 'loading';
  displayedCount: number;
  versionFilters: { gameVersions: string[]; loaders: string[]; versionType: string; };
  versionDropdownUIState: { showAllGameVersions: boolean; gameVersionSearchTerm: string; };
  openVersionDropdowns: { type: boolean; gameVersion: boolean; loader: boolean };
  installedVersions: Record<string, ContentInstallStatus | null>;
  selectedProfile: Profile | null;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersionsSidebar: string[];
  onVersionFilterChange: (projectId: string, filterType: 'gameVersions' | 'loaders' | 'versionType', value: string | string[]) => void;
  onVersionUiStateChange: (projectId: string, field: 'showAllGameVersions' | 'gameVersionSearchTerm', value: boolean | string) => void;
  onToggleVersionDropdown: (projectId: string, dropdownType: 'type' | 'gameVersion' | 'loader') => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onHoverVersion: (versionId: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteVersionClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onToggleEnableClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion, newEnabledState: boolean, sha1Hash: string) => void;
}

export interface ModrinthProjectCardV2Props extends VersionListPassthroughProps {
  hit: ModrinthSearchHit;
  accentColor: AccentColor;
  installStatus: ContentInstallStatus | null;
  isQuickInstalling?: boolean;
  isInstallingModpackAsProfile?: boolean;
  onQuickInstallClick: (project: ModrinthSearchHit) => void;
  onInstallModpackAsProfileClick?: (project: ModrinthSearchHit) => void;
  onInstallModpackVersionAsProfileClick?: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onToggleVersionsClick: (projectId: string) => void;
  isExpanded: boolean;
  isLoadingVersions: boolean;
  projectVersions: ModrinthVersion[] | null | 'loading';
  displayedCount: number;
  versionDropdownUIState: { showAllGameVersions: boolean; gameVersionSearchTerm: string; };
  openVersionDropdowns: { type: boolean; gameVersion: boolean; loader: boolean };
  installedVersions: Record<string, ContentInstallStatus | null>;
  selectedProfile: Profile | null;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersionsSidebar: string[];
  onVersionFilterChange: (projectId: string, filterType: 'gameVersions' | 'loaders' | 'versionType', value: string | string[]) => void;
  onVersionUiStateChange: (projectId: string, field: 'showAllGameVersions' | 'gameVersionSearchTerm', value: boolean | string) => void;
  onToggleVersionDropdown: (projectId: string, dropdownType: 'type' | 'gameVersion' | 'loader') => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onHoverVersion: (versionId: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteVersionClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onToggleEnableClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion, newEnabledState: boolean, sha1Hash: string) => void;
}

export const ModrinthProjectCardV2: React.FC<ModrinthProjectCardV2Props> = ({
  hit,
  accentColor,
  installStatus,
  isQuickInstalling,
  isInstallingModpackAsProfile,
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
        "relative overflow-hidden transition-colors duration-150 rounded-md mb-3",
        "border-2 border-b-4",
        "backdrop-blur-md",
        installStatus?.is_installed && !installStatus?.is_included_in_norisk_pack && 'border-l-green-500', 
        !installStatus?.is_installed && installStatus?.is_included_in_norisk_pack && 'border-l-blue-500',
        installStatus?.is_installed && installStatus?.is_included_in_norisk_pack && 'border-l-blue-500 border-t-4 border-t-blue-500'
      )}
      style={{
        borderColor: `${accentColor.value}80`, 
        borderBottomColor: accentColor.value, 
        boxShadow: "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)", 
        backgroundColor: isHovered ? `${accentColor.value}45` : `${accentColor.value}30`,
      }}
    >
      <div
        className={cn(
          "relative z-10 p-4",
        )}
      >
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
                src={hit.icon_url} 
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
                        await openExternalUrl(`https://modrinth.com/${hit.project_type}/${hit.slug}`);
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
                {hit.author && <p className="text-[10px] text-gray-400 truncate font-minecraft-ten flex-shrink min-w-0">by {hit.author}</p>} 
                </div>
                <p className="text-[11px] text-gray-300 line-clamp-2 md:line-clamp-2 font-minecraft-ten leading-tight">{hit.description}</p> 
            </div>
            
            <div className="flex items-center gap-1 mt-1 overflow-hidden whitespace-nowrap">
                {installStatus && (
                <>
                    {installStatus.is_installed && (
                    <TagBadge variant="success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Installed
                    </TagBadge>
                    )}
                    {installStatus.is_included_in_norisk_pack && (
                    <TagBadge variant={installStatus.norisk_pack_item_details?.is_enabled === false ? "inactive" : "info"}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        In NoRisk Pack
                    </TagBadge>
                    )}
                </>
                )}
                {hit.categories && hit.categories.length > 0 && (
                    hit.categories.slice(0, 5).map(category => (
                    <TagBadge key={category}>
                        {category.replace(/-/g, ' ')}
                    </TagBadge>
                    ))
                )}
            </div>
            </div>

            <div className="flex-shrink-0 w-40 flex flex-col justify-between items-end">
            <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-minecraft-ten">
                <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block mr-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg>
                {hit.downloads.toLocaleString()}
                </span>
                <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block mr-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                {hit.follows.toLocaleString()}
                </span>
            </div>
            <div className="flex items-center space-x-1 w-full mt-auto">
                {hit.project_type === 'modpack' ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onInstallModpackAsProfileClick) {
                        onInstallModpackAsProfileClick(hit);
                      } else {
                        console.warn("onInstallModpackAsProfileClick is not defined for modpack");
                        onQuickInstallClick(hit); 
                      }
                    }}
                    size="xs"
                    variant={isInstallingModpackAsProfile ? "secondary" : "success"}
                    className="min-w-0 flex-grow"
                    shadowDepth="short"
                    icon={
                      isInstallingModpackAsProfile ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Icon icon="solar:download-minimalistic-bold" className="h-4 w-4" />
                      )
                    }
                    iconPosition="left"
                    disabled={isInstallingModpackAsProfile || isQuickInstalling}
                  >
                    {isInstallingModpackAsProfile ? "Installing..." : "Quick Install"}
                  </Button>
                ) : (
                  <Button
                    onClick={(e) => { e.stopPropagation(); onQuickInstallClick(hit); }}
                    size="xs"
                    variant={isQuickInstalling ? "secondary" : "success"}
                    className="min-w-0 flex-grow"
                    shadowDepth="short"
                    icon={
                      isQuickInstalling ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Icon icon="solar:download-minimalistic-bold" className="h-4 w-4" />
                      )
                    }
                    iconPosition="left"
                    disabled={isQuickInstalling}
                  >
                    {isQuickInstalling ? "Installing..." : "Quick Install"}
                  </Button>
                )}
                <IconButton
                onClick={(e) => { e.stopPropagation(); onToggleVersionsClick(hit.project_id); }}
                size="xs"
                shadowDepth='short'
                variant="default"
                icon={ 
                    isLoadingVersions ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ) : (
                    <Icon icon={isExpanded ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} className="w-3.5 h-3.5" />
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
      
      {isExpanded && Array.isArray(projectVersions) && projectVersions.length > 0 && (
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
          onInstallModpackVersionAsProfileClick={onInstallModpackVersionAsProfileClick}
          onHoverVersion={onHoverVersion}
          onDeleteClick={onDeleteVersionClick}
          onToggleEnableClick={onToggleEnableClick}
        />
      )}
    </div>
  );
}; 