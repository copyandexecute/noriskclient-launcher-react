"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { useProfileStore } from "../../store/profile-store";
import { IconButton } from "../ui/buttons/IconButton";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";
import { ProfileContextMenu } from "./ProfileContextMenu";
import * as ProfileService from "../../services/profile-service";
import { LaunchButton } from "../ui/buttons/LaunchButton";
import { ThemedSurface } from '../ui/ThemedSurface';

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onClick: () => void;
  onProfileCloned: () => void;
  onDelete: (profileId: string, profileName: string) => void;
  onShouldExport: (profile: Profile) => void;
}

export function ProfileCard({
  profile,
  onEdit,
  onClick,
  onProfileCloned,
  onDelete,
  onShouldExport,
}: ProfileCardProps) {
  const accentColorValue = useThemeStore((state) => state.accentColor.value);

  const [isCloning, setIsCloning] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [shouldShowSpinnerForThisProfile, setShouldShowSpinnerForThisProfile] = useState(false);
  const [detailedLaunchMessage, setDetailedLaunchMessage] = useState<string | null>(null);

  const { confirm, confirmDialog } = useConfirmDialog();
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleLaunchButtonStateChange = (isLaunchingFromButton: boolean) => {
    setShouldShowSpinnerForThisProfile(isLaunchingFromButton);
  };

  const handleLaunchEventMessage = (message: string | null) => {
    setDetailedLaunchMessage(message);
  };

  useEffect(() => {
    if (!shouldShowSpinnerForThisProfile) {
      setDetailedLaunchMessage(null);
    }
  }, [shouldShowSpinnerForThisProfile]);

  const getModLoaderIcon = () => {
    switch (profile.loader) {
      case "fabric":
        return "/icons/fabric.png";
      case "forge":
        return "/icons/forge.png";
      case "quilt":
        return "/icons/quilt.png";
      case "neoforge":
        return "/icons/neoforge.png";
      default:
        return "/icons/minecraft.png";
    }
  };

  const getProfileIconSource = () => {
    if (profile.banner?.source.type === "url") {
      return profile.banner.source.url;
    }
    return null;
  };
  const profileIconSrc = getProfileIconSource();

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile.id) {
      toast.error("Profile ID is missing, cannot clone.");
      return;
    }
    try {
      const newName = await confirm({
        title: "clone profile",
        inputLabel: "profile name",
        inputPlaceholder: "Enter profile name",
        inputInitialValue: `${profile.name} (Copy)`,
        inputRequired: true,
        confirmText: "CLONE",
        type: "input",
        fullscreen: true,
      });

      if (newName && typeof newName === "string") {
        setIsCloning(true);
        const clonePromise = useProfileStore
          .getState()
          .copyProfile(profile.id, newName, null, true);

        toast
          .promise(clonePromise, {
            loading: `Cloning profile '${profile.name}'...`,
            success: () => {
              onProfileCloned();
              return `Profile '${newName}' cloned successfully!`;
            },
            error: (err) =>
              `Failed to clone profile: ${err instanceof Error ? err.message : String(err)}`,
          })
          .finally(() => {
            setIsCloning(false);
          });
      }
    } catch (err) {
      console.error("Error in clone setup or dialog: ", err);
      toast.error("Could not initiate cloning process.");
      setIsCloning(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "delete profile",
      message: `Are you sure you want to delete profile "${profile.name}"? This action cannot be undone.`,
      confirmText: "DELETE",
      cancelText: "CANCEL",
      type: "warning",
      fullscreen: true,
    });

    if (confirmed) {
      onDelete(profile.id, profile.name);
    }
  };

  const handleOpenFolder = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const openPromise = ProfileService.openProfileFolder(profile.id);

    toast.promise(openPromise, {
      loading: `Opening folder for '${profile.name}'...`,
      success: `Successfully opened folder for '${profile.name}'!`,
      error: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.toLowerCase().includes("not found") ||
          message.toLowerCase().includes("does not exist")
        ) {
          return `Profile folder for '${profile.name}' does not exist yet. Launch the profile to create it.`;
        }
        return `Failed to open folder: ${message}`;
      },
    });
  };

  const handleDuplicateFromContextMenu = () => {
    const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
    handleClone(mockEvent);
  };

  const handleDeleteFromContextMenu = () => {
    const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
    handleDelete(mockEvent);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setContextMenuVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuVisible &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        closeContextMenu();
      }
    };

    if (contextMenuVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [contextMenuVisible]);

  const handleExportFromContextMenu = () => {
    if (profile) {
      onShouldExport(profile);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isInteractiveElementClick =
      target.closest('button') ||
      target.closest('a') ||
      (contextMenuRef.current && contextMenuRef.current.contains(target));

    if (!isInteractiveElementClick) {
      onClick();
    }
  };

  return (
    <>
    <div
      style={{
        opacity: isCloning ? 0.7 : 1,
      }}
      className="transition-opacity duration-150 ease-in-out"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      <ThemedSurface
        surfaceRef={cardRef}
        onClick={handleDivClick}
        onContextMenu={handleContextMenu}
        className="p-4 rounded-lg flex flex-col gap-3 transition-all duration-150 ease-in-out hover:shadow-xl relative"
      >
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border flex items-center justify-center group"
            style={{
              backgroundColor: `${accentColorValue}1A`,
              borderColor: `${accentColorValue}4D`,
            }}
          >
            {profileIconSrc ? (
              <img
                src={profileIconSrc}
                alt={profile.name}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                  isCardHovered && !isCloning && !shouldShowSpinnerForThisProfile ? "brightness-75" : ""
                }`}
                style={{ imageRendering: "pixelated" }}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/icons/minecraft.png";
                    target.style.width = '70%';
                    target.style.height = '70%';
                    target.style.objectFit = 'contain';
                }}
              />
            ) : (
              <Icon icon="ph:package-duotone" className="w-10 h-10" style={{color: accentColorValue}} />
            )}

            {/* Overlay: Visible if spinner should show OR if hovered (and not cloning) */}
            {!isCloning && (shouldShowSpinnerForThisProfile || isCardHovered) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-150">
                <LaunchButton
                  id={profile.id}
                  name={profile.name}
                  isIconOnly={true}
                  disabled={isCloning}
                  forceDisplaySpinner={shouldShowSpinnerForThisProfile}
                  onInternalLaunchStateChange={handleLaunchButtonStateChange}
                  onEventMessage={handleLaunchEventMessage}
                  className="text-white"
                />
              </div>
            )}
          </div>

          <div className="flex-grow min-w-0">
            <h3
              className="text-lg font-minecraft-ten text-white whitespace-nowrap overflow-hidden text-ellipsis"
              title={profile.name}
            >
              {profile.name}
            </h3>
            {/* Combined version info / status message line */}
            <div 
              className="flex items-center text-xs text-white/60 mt-1 font-minecraft-ten whitespace-nowrap overflow-hidden text-ellipsis h-4"
              title={
                isCloning ? "Cloning profile..." :
                shouldShowSpinnerForThisProfile ? (detailedLaunchMessage || "Starting...") :
                `${profile.loader || "Vanilla"} - ${profile.game_version}`
              }
            >
              {isCloning ? (
                <span>Cloning profile...</span>
              ) : shouldShowSpinnerForThisProfile ? (
                detailedLaunchMessage ? (
                  <span>{detailedLaunchMessage}</span>
                ) : (
                  <span>Starting...</span>
                )
              ) : (
                <>
                  {/* <img
                    src={getModLoaderIcon()}
                    alt={profile.loader || "vanilla"}
                    className="w-4 h-4 mr-1.5 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/icons/minecraft.png";
                    }}
                  /> */}
                  <span>
                    {profile.loader || "Vanilla"} {profile.game_version}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Actions - Removed as per user request */}
        {/* <div className=\"flex items-center justify-start mt-3 pt-3\"> */}
        {/*  <LaunchButton */}
        {/*    id={profile.id} */}
        {/*    name={profile.name} */}
        {/*    size=\"sm\" */}
        {/*    disabled={isCloning || launchState === LaunchState.LAUNCHING} */}
        {/*    className=\"!py-1 !px-2.5\" */}
        {/*  /> */}
        {/* </div> */}

      </ThemedSurface>
    </div>

      {confirmDialog}
      <ProfileContextMenu
        ref={contextMenuRef}
        profile={profile}
        visible={contextMenuVisible}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        onClose={closeContextMenu}
        onDelete={handleDeleteFromContextMenu}
        onDuplicate={handleDuplicateFromContextMenu}
        onOpenFolder={handleOpenFolder}
        onExport={handleExportFromContextMenu}
      />
    </>
  );
}
