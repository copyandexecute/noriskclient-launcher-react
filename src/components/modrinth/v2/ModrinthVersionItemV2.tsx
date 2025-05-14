"use client";

import React from 'react';
import { cn } from '../../../lib/utils';
import type { ModrinthVersion, ModrinthSearchHit } from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';
import type { ContentInstallStatus } from '../../../types/profile';
import { Icon } from '@iconify/react';
import { Button } from '../../ui/buttons/Button';
import { TagBadge } from '../../ui/TagBadge';

// Define the props required by the new component
interface ModrinthVersionItemV2Props {
  version: ModrinthVersion;
  project: ModrinthSearchHit;
  versionStatus: ContentInstallStatus | null;
  accentColor: AccentColor;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onInstallClick: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onDeleteClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion) => void;
  onToggleEnableClick?: (profileId: string, project: ModrinthSearchHit, version: ModrinthVersion, newEnabledState: boolean, sha1Hash: string) => void;
  onInstallModpackVersionAsProfileClick?: (project: ModrinthSearchHit, version: ModrinthVersion) => void;
  selectedProfileId?: string | null;
}

export const ModrinthVersionItemV2: React.FC<ModrinthVersionItemV2Props> = ({
  version,
  project,
  versionStatus,
  accentColor,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onInstallClick,
  onDeleteClick,
  onToggleEnableClick,
  onInstallModpackVersionAsProfileClick,
  selectedProfileId,
}) => {
  const isModpack = project.project_type === 'modpack';

  const handleButtonClick = () => {
    if (isModpack && onInstallModpackVersionAsProfileClick) {
      onInstallModpackVersionAsProfileClick(project, version);
    } else if (!isModpack) {
      onInstallClick(project, version);
    } else {
      // Fallback for modpack if specific handler is not provided (should not happen ideally)
      console.warn("onInstallModpackVersionAsProfileClick is not defined for modpack version item");
      onInstallClick(project, version); 
    }
  };

  const handleDeleteButtonClick = () => {
    if (onDeleteClick && !isModpack && selectedProfileId) {
      onDeleteClick(selectedProfileId, project, version);
    } else {
      // Log a warning if delete is attempted without a profileId, though the button shouldn't render
      console.warn("Delete action called without a selectedProfileId or onDeleteClick handler missing/isModpack");
    }
  };

  const handleToggleEnableButtonClick = () => {
    const primaryFile = version.files.find(f => f.primary) || version.files[0];
    if (onToggleEnableClick && !isModpack && selectedProfileId && versionStatus?.is_installed && primaryFile?.hashes?.sha1 && typeof versionStatus.is_enabled === 'boolean') {
      onToggleEnableClick(selectedProfileId, project, version, !versionStatus.is_enabled, primaryFile.hashes.sha1);
    } else {
      console.warn("Toggle enable action called under invalid conditions or missing data", {
        onToggleEnableClick: !!onToggleEnableClick,
        isModpack,
        selectedProfileId: !!selectedProfileId,
        is_installed: versionStatus?.is_installed,
        sha1: primaryFile?.hashes?.sha1,
        is_enabled_type: typeof versionStatus?.is_enabled
      });
    }
  };

  // Determine button state based on selectedProfileId and installation status
  let buttonText = "Install";
  let buttonVariant: "default" | "success" = "success";
  let buttonDisabled = false;

  // Only show installation status if a profile is selected
  if (selectedProfileId) {
    if (versionStatus?.is_installed) {
      buttonText = "Install";
      buttonVariant = "success";
      buttonDisabled = true;
    }
    
    if (isModpack && !versionStatus?.is_installed) {
      buttonText = "Install";
      buttonVariant = "success";
      buttonDisabled = false;
    }
  }

  return (
    // --- Version Item Card --- 
    <div 
      key={version.id} // Keep key here for React list rendering efficiency within this component instance
      onMouseEnter={() => onMouseEnter(version.id)}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative overflow-hidden transition-all duration-300 p-2 rounded-md",
        "border-2 border-b-4",
        "backdrop-blur-md",
        // Only show installation UI colors if a profile is selected
        selectedProfileId && versionStatus?.is_installed && 'border-l-green-500', 
        selectedProfileId && !versionStatus?.is_installed && versionStatus?.is_included_in_norisk_pack && 'border-l-blue-500'
      )}
      style={{
        borderColor: `${accentColor.value}80`, 
        borderBottomColor: accentColor.value, 
        // boxShadow: "0 6px 0 rgba(0,0,0,0.25), 0 8px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)", // Removed boxShadow
        backgroundColor: isHovered ? `${accentColor.value}45` : `${accentColor.value}30`,
      }}
    >
      {/* Content of the version item card - NEW Layout */} 
      <div className="flex flex-col space-y-2"> {/* Increased spacing slightly */} 
        {/* Top Row: Name & Date & Downloads */} 
        <div className="flex justify-between items-baseline gap-2">
          <h5 className="font-semibold text-gray-100 text-sm font-minecraft-ten normal-case truncate flex-shrink min-w-0"> 
            {version.name} ({version.version_number})
          </h5>
          <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-minecraft-ten flex-shrink-0"> {/* Container for stats */} 
            {/* Downloads */} 
            <span className="flex items-center">
              <Icon icon="solar:download-minimalistic-bold" className="w-3 h-3 mr-0.5" />
              {version.downloads.toLocaleString()}
            </span>
            {/* Date */} 
            <span className="flex items-center">
              <Icon icon="solar:calendar-mark-bold" className="w-3 h-3 mr-0.5" />
              {new Date(version.date_published).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Combined Middle/Bottom Row: Badges & Install Button */} 
        <div className="flex justify-between items-center gap-2"> 
          {/* Badges container (takes available space) */} 
          <div className="flex flex-wrap items-center gap-1 flex-grow min-w-0"> 
            {/* --- Status Badges Moved to the beginning --- */} 
            {selectedProfileId && versionStatus?.is_installed && (
              <TagBadge variant="success" className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Installed
              </TagBadge>
            )}
            {selectedProfileId && versionStatus?.is_included_in_norisk_pack && (
              <TagBadge variant="info" className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                In NoRisk Pack
              </TagBadge>
            )}
            {/* --- End Status Badges --- */} 
            <TagBadge className="flex-shrink-0">{version.version_type}</TagBadge> {/* Version Type now after status */} 
            {version.game_versions.length > 0 && version.game_versions.slice(0, 5).map(gv => (
              <TagBadge key={`gv-${version.id}-${gv}`} variant="default">{gv}</TagBadge>
            ))}
            {version.game_versions.length > 5 && (<TagBadge variant="default">...</TagBadge>)} 
            {version.loaders.length > 0 && version.loaders.map(loader => (
              <TagBadge key={`loader-${version.id}-${loader}`} variant="default">{loader}</TagBadge>
            ))}
          </div>
          {/* Install/Delete Button Group (fixed width, on the right) */} 
          <div className="flex gap-1 flex-shrink-0"> {/* Wrapper for buttons */}
            {selectedProfileId && versionStatus?.is_installed && !isModpack && typeof versionStatus.is_enabled === 'boolean' && onToggleEnableClick && (
              <Button
                onClick={handleToggleEnableButtonClick}
                size="xs"
                shadowDepth="short"
                variant={versionStatus.is_enabled ? "warning" : "secondary"}
                className="min-w-[80px] justify-center"
              >
                {versionStatus.is_enabled ? "Active" : "Inactive"}
              </Button>
            )}
            {selectedProfileId && versionStatus?.is_installed && !isModpack && onDeleteClick && (
              <Button
                onClick={handleDeleteButtonClick}
                size="xs"
                shadowDepth="short"
                variant="destructive"
                className="min-w-[80px] justify-center"
              >
                Delete
              </Button>
            )}
            {/* Only show Install button when not installed or when no profile is selected */}
            {(!selectedProfileId || !versionStatus?.is_installed) && (
              <Button 
                onClick={handleButtonClick}
                size="xs"
                shadowDepth="short"
                variant={buttonVariant}
                disabled={buttonDisabled}
                className="min-w-[80px] justify-center" 
              >
                {buttonText}
              </Button>
            )}
          </div>
        </div>
        {/* Removed the separate bottom row div */} 
      </div>
    </div>
  );
}; 