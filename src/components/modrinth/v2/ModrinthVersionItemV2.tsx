"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import type { ModrinthVersion, ModrinthSearchHit } from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';
import type { ContentInstallStatus } from '../../../types/profile';
import { Icon } from '@iconify/react';
import { Button } from '../../ui/buttons/Button';
import { TagBadge } from '../../ui/TagBadge';
import { gsap } from "gsap";

// Define the props required by the new component
interface ModrinthVersionItemV2Props {
  version: ModrinthVersion;
  project: ModrinthSearchHit;
  versionStatus: ContentInstallStatus | null;
  isInstalling?: boolean;
  isInstallingModpackVersion?: boolean;
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
  isInstalling = false,
  isInstallingModpackVersion = false,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Handle hover state
  const handleMouseEnterLocal = () => {
    setIsCardHovered(true);
    onMouseEnter(version.id);
  };

  const handleMouseLeaveLocal = () => {
    setIsCardHovered(false);
    onMouseLeave();
  };

  // Animation effect on hover
  useEffect(() => {
    if (cardRef.current) {
      if (isCardHovered) { // Use local state for animation trigger
        gsap.to(cardRef.current, {
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          y: -3,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
          duration: 0.2,
          ease: "power2.out",
        });
      } else {
        gsap.to(cardRef.current, {
          backgroundColor: `${accentColor.value}08`,
          borderColor: `${accentColor.value}30`,
          y: 0,
          boxShadow: `0 2px 0 rgba(0,0,0,0.1), 0 3px 5px rgba(0,0,0,0.1)`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    }
  }, [isCardHovered, accentColor]);

  const handleButtonClick = () => {
    if (isInstalling) return;

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
    // Check if this is a NoRisk Pack item
    if (versionStatus?.norisk_pack_item_details?.norisk_mod_identifier) {
      if (onToggleEnableClick && !isModpack && selectedProfileId) {
        onToggleEnableClick(
          selectedProfileId, 
          project, 
          version, 
          !versionStatus.is_enabled, 
          /* sha1Hash */ '' // Not needed for NoRisk Pack items
        );
      }
      return;
    }
    
    // Handle regular toggle for normal mods
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
  let buttonIcon: React.ReactNode = null;
  let buttonVariant: "default" | "success" | "secondary" = "success";
  let buttonDisabled = false;

  // Modpack installation specific loading state
  if (project.project_type === "modpack" && isInstallingModpackVersion) {
    buttonText = "Installing...";
    buttonIcon = (
      <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
    buttonVariant = "secondary";
    buttonDisabled = true;
  } else if (isInstalling) {
    // Generic installation loading state (for mods, shaders, etc.)
    buttonText = "Installing...";
    buttonIcon = (
      <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
    buttonVariant = "secondary";
    buttonDisabled = true;
  } else if (versionStatus && versionStatus.is_installed) {
    // Precedence:
    // 1. If it's part of a NoRisk Pack (and not a modpack itself) -> "In Pack", disabled.
    // 2. Else if it's already installed (and not a modpack) -> "Installed", disabled. (Button is likely hidden by outer conditional anyway)
    // 3. Else if it's a modpack that's not installed -> "Install", enabled.
    // 4. Else (not in pack, not installed, not a modpack needing special handling) -> "Install", enabled.

    if (versionStatus?.is_included_in_norisk_pack && !isModpack) {
      buttonText = "In Pack";
      buttonVariant = "default";
      buttonDisabled = true;
    } else if (versionStatus?.is_installed && !isModpack) {
      buttonText = "Installed"; // More descriptive if it were to be shown
      buttonDisabled = true;
    } else if (isModpack && !versionStatus?.is_installed) {
      buttonText = "Install"; // Could be "Install Profile"
      buttonVariant = "success";
      buttonDisabled = false;
    }
    // If none of the above, defaults are: buttonText = "Install", buttonVariant = "success", buttonDisabled = false
    // This covers non-modpacks that are not installed and not in a NoRisk pack.
  }
  // If no profile is selected, buttonText="Install", buttonVariant="success", buttonDisabled=false by default.
  // This allows installing modpacks as new profiles or mods via a modal.

  // Determine if we need to show the left border for installation status (from friend's version)
  const showInstallBorder =
    selectedProfileId &&
    (versionStatus?.is_installed || versionStatus?.is_included_in_norisk_pack);

  return (
    // --- Version Item Card --- 
    <div 
      ref={cardRef}
      key={version.id}
      onMouseEnter={handleMouseEnterLocal}
      onMouseLeave={handleMouseLeaveLocal}
      className={cn(
        "relative overflow-hidden transition-all duration-200 rounded-md backdrop-blur-sm", // duration-300 to duration-200, backdrop-blur-md to sm
        "border-2", // border-b-4 removed
        // Logic for border-l from friend's version, with -l-4
        showInstallBorder && versionStatus?.is_installed && 'border-l-green-500 border-l-4', 
        showInstallBorder && !versionStatus?.is_installed && versionStatus?.is_included_in_norisk_pack && 'border-l-blue-500 border-l-4',
        "cursor-pointer" // Added cursor-pointer
      )}
      style={{
        // backgroundColor and borderColor will be controlled by gsap, these are initial values
        backgroundColor: isCardHovered ? `${accentColor.value}15` : `${accentColor.value}08`, 
        borderColor: isCardHovered ? `${accentColor.value}60` : `${accentColor.value}30`,
        // boxShadow and transform will be controlled by gsap
        // boxShadow: isCardHovered ... (handled by gsap)
        // transform: isCardHovered ... (handled by gsap)
      }}
    >
      {isCardHovered && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
      )}
      {/* Inner div with p-2.5 from friend's version */}
      <div className="relative z-10 p-2.5"> 
        {/* Content of the version item card - Structure from original, styles from friend's */} 
        <div className="flex flex-col space-y-2"> 
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
              {selectedProfileId && versionStatus?.is_installed && versionStatus?.is_enabled !== false && (
                <TagBadge variant="success" className="flex-shrink-0">
                  <Icon icon="solar:check-circle-bold" className="w-3 h-3 mr-0.5" />
                  Installed
                </TagBadge>
              )}
              {selectedProfileId && versionStatus?.is_installed && versionStatus?.is_enabled === false && (
                <TagBadge variant="inactive" className="flex-shrink-0">
                  <Icon icon="solar:close-circle-bold" className="w-3 h-3 mr-0.5" />
                  Disabled
                </TagBadge>
              )}
              {selectedProfileId && versionStatus?.is_included_in_norisk_pack && (
                <TagBadge variant={versionStatus?.is_enabled ? "info" : "inactive"} className="flex-shrink-0">
                  <Icon icon="solar:bolt-circle-bold" className="w-3 h-3 mr-0.5" />
                  In NoRisk Pack
                </TagBadge>
              )}
              {/* --- End Status Badges --- */} 
              <TagBadge className="flex-shrink-0">{version.version_type}</TagBadge>
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
              {/* Enable/Disable button for both regular mods and NoRisk Pack items */}
              {selectedProfileId && 
                ((versionStatus?.is_installed && !isModpack && typeof versionStatus.is_enabled === 'boolean' && onToggleEnableClick) || 
                 (versionStatus?.is_included_in_norisk_pack && versionStatus?.norisk_pack_item_details && onToggleEnableClick)) && (
                <Button
                  onClick={handleToggleEnableButtonClick}
                  size="xs"
                  shadowDepth="short"
                  variant={versionStatus.is_enabled ? "warning" : "secondary"}
                  className="min-w-[80px] justify-center"
                >
                  {versionStatus.is_enabled ? "Active" : "Disabled"}
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
              {/* Only show Install button when not installed or when no profile is selected, and not currently installing */}
              {(!selectedProfileId || !versionStatus?.is_installed) && (
                <Button 
                  onClick={handleButtonClick}
                  size="xs"
                  shadowDepth="short"
                  variant={buttonVariant}
                  disabled={buttonDisabled || isInstalling}
                  className="min-w-[80px] justify-center"
                  icon={buttonIcon}
                  iconPosition="left"
                >
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 