"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { useProfileStore } from "../../store/profile-store";
import {
  LaunchState,
  useLaunchStateStore,
} from "../../store/launch-state-store";
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
  const {
    initializeProfile,
    getProfileState,
  } = useLaunchStateStore();
  const accentColorValue = useThemeStore((state) => state.accentColor.value);

  const [isLaunching, setIsLaunching] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (profile.id) {
      initializeProfile(profile.id);
    }
  }, [profile.id, initializeProfile]);

  const { launchState } = getProfileState(profile.id);

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
        if (!profile.id) {
          toast.error("Profile ID is missing, cannot clone.");
          setIsCloning(false);
          return;
        }
        const clonePromise = useProfileStore
          .getState()
          .copyProfile(profile.id, newName, null);

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

  const handleOpenFolder = async () => {
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

  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isInteractiveElementClick =
      target.closest('button') ||
      target.closest('[data-context-menu-trigger="true"]') ||
      (contextMenuRef.current && contextMenuRef.current.contains(target));

    if (!isInteractiveElementClick) {
      onClick();
    }
  };

  return (
    <>
      <ThemedSurface
        surfaceRef={cardRef}
        onClick={handleDivClick}
        onContextMenu={handleContextMenu}
        className="flex items-center"
      >
        <div
          className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden mr-4 border-2 border-b-4 flex items-center justify-center"
          style={{
            backgroundColor: `${accentColorValue}1A`,
            borderColor: `${accentColorValue}3A`,
            borderBottomColor: `${accentColorValue}59`,
          }}
        >
          {profileIconSrc ? (
            <img
              src={profileIconSrc}
              alt={profile.name}
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
              onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icons/minecraft.png"; 
                  (e.target as HTMLImageElement).style.width = '75%';
                  (e.target as HTMLImageElement).style.height = '75%';
              }}
            />
          ) : (
            <Icon icon="solar:widget-bold" className="w-10 h-10 text-white/70" />
          )}
        </div>

        <div className="flex-grow overflow-hidden flex flex-col min-w-0 pr-3 justify-between h-20">
          <h3
            className="text-base font-minecraft-ten text-white whitespace-nowrap overflow-hidden text-ellipsis mb-1"
            title={profile.name}
          >
            {profile.name}
          </h3>
          <div className="flex items-center">
            <img
              src={getModLoaderIcon()}
              alt={profile.loader || "vanilla"}
              className="w-4 h-4 mr-1.5 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icons/minecraft.png";
              }}
            />
            <span className="text-sm text-white/60 font-minecraft-ten whitespace-nowrap lowercase">
              {profile.game_version}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0 pl-2">
          {/* Settings IconButton removed */}
          {/* More actions IconButton (context menu trigger) removed - context menu still available via right-click */}
          {/* LaunchButton removed */}
        </div>
      </ThemedSurface>

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
