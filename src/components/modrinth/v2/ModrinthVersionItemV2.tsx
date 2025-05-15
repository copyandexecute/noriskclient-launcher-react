"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import type {
  ModrinthSearchHit,
  ModrinthVersion,
} from "../../../types/modrinth";
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { Icon } from "@iconify/react";
import { Button } from "../../ui/buttons/Button";
import { TagBadge } from "../../ui/TagBadge";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils";

// Define the props required by the new component
interface ModrinthVersionItemV2Props {
  version: ModrinthVersion;
  project: ModrinthSearchHit;
  versionStatus: ContentInstallStatus | null;
  accentColor: AccentColor;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onInstallClick: (
    project: ModrinthSearchHit,
    version: ModrinthVersion,
  ) => void;
  onDeleteClick?: (
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
  onInstallModpackVersionAsProfileClick?: (
    project: ModrinthSearchHit,
    version: ModrinthVersion,
  ) => void;
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
  const isModpack = project.project_type === "modpack";
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Handle hover state
  const handleMouseEnter = () => {
    setIsCardHovered(true);
    onMouseEnter(version.id);
  };

  const handleMouseLeave = () => {
    setIsCardHovered(false);
    onMouseLeave();
  };

  // Animation effect on hover
  useEffect(() => {
    if (cardRef.current) {
      if (isHovered) {
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
  }, [isHovered, accentColor]);

  const handleButtonClick = () => {
    if (isModpack && onInstallModpackVersionAsProfileClick) {
      onInstallModpackVersionAsProfileClick(project, version);
    } else if (!isModpack) {
      onInstallClick(project, version);
    } else {
      // Fallback for modpack if specific handler is not provided (should not happen ideally)
      console.warn(
        "onInstallModpackVersionAsProfileClick is not defined for modpack version item",
      );
      onInstallClick(project, version);
    }
  };

  const handleDeleteButtonClick = () => {
    if (onDeleteClick && !isModpack && selectedProfileId) {
      onDeleteClick(selectedProfileId, project, version);
    } else {
      // Log a warning if delete is attempted without a profileId, though the button shouldn't render
      console.warn(
        "Delete action called without a selectedProfileId or onDeleteClick handler missing/isModpack",
      );
    }
  };

  const handleToggleEnableButtonClick = () => {
    const primaryFile =
      version.files.find((f) => f.primary) || version.files[0];
    if (
      onToggleEnableClick &&
      !isModpack &&
      selectedProfileId &&
      versionStatus?.is_installed &&
      primaryFile?.hashes?.sha1 &&
      typeof versionStatus.is_enabled === "boolean"
    ) {
      onToggleEnableClick(
        selectedProfileId,
        project,
        version,
        !versionStatus.is_enabled,
        primaryFile.hashes.sha1,
      );
    } else {
      console.warn(
        "Toggle enable action called under invalid conditions or missing data",
        {
          onToggleEnableClick: !!onToggleEnableClick,
          isModpack,
          selectedProfileId: !!selectedProfileId,
          is_installed: versionStatus?.is_installed,
          sha1: primaryFile?.hashes?.sha1,
          is_enabled_type: typeof versionStatus?.is_enabled,
        },
      );
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

  // Determine if we need to show the left border for installation status
  const showInstallBorder =
    selectedProfileId &&
    (versionStatus?.is_installed || versionStatus?.is_included_in_norisk_pack);

  return (
    // --- Version Item Card as Ghost Button ---
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden transition-all duration-200 rounded-md backdrop-blur-sm",
        "border-2",
        showInstallBorder &&
          versionStatus?.is_installed &&
          "border-l-green-500 border-l-4",
        showInstallBorder &&
          !versionStatus?.is_installed &&
          versionStatus?.is_included_in_norisk_pack &&
          "border-l-blue-500 border-l-4",
        "cursor-pointer",
      )}
      style={{
        backgroundColor: isHovered
          ? `${accentColor.value}15`
          : `${accentColor.value}08`,
        borderColor: isHovered
          ? `${accentColor.value}60`
          : `${accentColor.value}30`,
        boxShadow: isHovered
          ? `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`
          : `0 2px 0 rgba(0,0,0,0.1), 0 3px 5px rgba(0,0,0,0.1)`,
        transform: isHovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      {isHovered && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
      )}

      <div className="relative z-10 p-2.5">
        {/* Content of the version item card - Original Layout */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-baseline gap-2">
            <h5 className="font-semibold text-gray-100 text-sm font-minecraft-ten normal-case truncate flex-shrink min-w-0">
              {version.name} ({version.version_number})
            </h5>
            <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-minecraft-ten flex-shrink-0">
              <span className="flex items-center">
                <Icon
                  icon="solar:download-minimalistic-bold"
                  className="w-3 h-3 mr-0.5"
                />
                {version.downloads.toLocaleString()}
              </span>
              <span className="flex items-center">
                <Icon
                  icon="solar:calendar-mark-bold"
                  className="w-3 h-3 mr-0.5"
                />
                {new Date(version.date_published).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-grow min-w-0">
              {/* --- Status Badges Moved to the beginning --- */}
              {selectedProfileId &&
                versionStatus?.is_installed &&
                versionStatus?.is_enabled !== false && (
                  <TagBadge variant="success" size="md" withIcon>
                    <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
                    <span>Installed</span>
                  </TagBadge>
                )}
              {selectedProfileId &&
                versionStatus?.is_installed &&
                versionStatus?.is_enabled === false && (
                  <TagBadge variant="inactive" size="md" withIcon>
                    <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
                    <span>Disabled</span>
                  </TagBadge>
                )}
              {selectedProfileId &&
                versionStatus?.is_included_in_norisk_pack && (
                  <TagBadge variant="info" size="md" withIcon>
                    <Icon icon="solar:bolt-circle-bold" className="w-4 h-4" />
                    <span>In NoRisk Pack</span>
                  </TagBadge>
                )}
              {/* --- End Status Badges --- */}
              <TagBadge size="md">{version.version_type}</TagBadge>
              {version.game_versions.length > 0 &&
                version.game_versions.slice(0, 5).map((gv) => (
                  <TagBadge
                    key={`gv-${version.id}-${gv}`}
                    variant="default"
                    size="md"
                  >
                    {gv}
                  </TagBadge>
                ))}
              {version.game_versions.length > 5 && (
                <TagBadge variant="default" size="md">
                  ...
                </TagBadge>
              )}
              {version.loaders.length > 0 &&
                version.loaders.map((loader) => (
                  <TagBadge
                    key={`loader-${version.id}-${loader}`}
                    variant="default"
                    size="md"
                  >
                    {loader}
                  </TagBadge>
                ))}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {" "}
              {selectedProfileId &&
                versionStatus?.is_installed &&
                !isModpack &&
                typeof versionStatus.is_enabled === "boolean" &&
                onToggleEnableClick && (
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
              {selectedProfileId &&
                versionStatus?.is_installed &&
                !isModpack &&
                onDeleteClick && (
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
        </div>
      </div>
    </div>
  );
};
