"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { cn } from "../../lib/utils";
import { useProfileStore } from "../../store/profile-store";
import {
  LaunchState,
  useLaunchStateStore,
} from "../../store/launch-state-store";
import { IconButton } from "../ui/buttons/IconButton";
import { Button } from "../ui/buttons/Button";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen } from "@tauri-apps/api/event";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { Label } from "../ui/Label";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { toast } from "react-hot-toast";
import { ProfileContextMenu } from "./ProfileContextMenu";
import * as ProfileService from "../../services/profile-service";

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onClick: () => void;
  onProfileCloned: () => void;
  onDelete: (profileId: string, profileName: string) => void;
}

export function ProfileCard({ profile, onEdit, onClick, onProfileCloned, onDelete }: ProfileCardProps) {
  const { initializeProfile, getProfileState, resetLaunchState } =
    useLaunchStateStore();
  const accentColor = useThemeStore((state) => state.accentColor);

  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const eventListenersSetUp = useRef(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initializeProfile(profile.id);
  }, [profile.id, initializeProfile]);

  const { launchState, currentStep, launchProgress } = getProfileState(
    profile.id,
  );
  const isProfileCurrentlyLaunching = launchState === LaunchState.LAUNCHING;

  useEffect(() => {
    if (eventListenersSetUp.current) return;

    const setupListeners = async () => {
      const unlistenEvent = await listen("event", (event) => {
        const payload = event.payload as any;
        if (
          payload.target_id === profile.id &&
          payload.event_type?.toLowerCase() === "minecraft_output"
        ) {
          console.log("Game started event received, resetting buttons");
          setIsLaunching(false);
          resetLaunchState(profile.id);
        }
      });

      const unlistenExit = await listen("minecraft_process_exited", (event) => {
        const payload = event.payload as any;
        if (payload.profile_id === profile.id) {
          console.log("Process exited event received, resetting buttons");
          setIsLaunching(false);
          resetLaunchState(profile.id);
        }
      });

      const unlistenState = await listen("state_event", (event) => {
        const payload = event.payload as any;
        if (payload.target_id === profile.id) {
          if (payload.event_type?.toLowerCase() === "minecraft_output") {
            console.log("State event: game started, resetting buttons");
            setIsLaunching(false);
            resetLaunchState(profile.id);
          } else if (
            payload.event_type?.toLowerCase() === "minecraft_process_exited"
          ) {
            console.log("State event: process exited, resetting buttons");
            setIsLaunching(false);
            resetLaunchState(profile.id);
          }
        }
      });

      return () => {
        unlistenEvent();
        unlistenExit();
        unlistenState();
      };
    };

    setupListeners();
    eventListenersSetUp.current = true;

    const intervalId = setInterval(() => {
      if (isLaunching || isProfileCurrentlyLaunching) {
        ProcessService.isMinecraftRunning(profile.id)
          .then((isRunning) => {
            if (isRunning) {
              console.log(
                "Game is running, resetting buttons state to allow multiple instances",
              );
              setIsLaunching(false);
              resetLaunchState(profile.id);
            }
          })
          .catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [profile.id, isLaunching, isProfileCurrentlyLaunching, resetLaunchState]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isRunning = await ProcessService.isMinecraftRunning(profile.id);
        if (isRunning) {
          if (isLaunching || isProfileCurrentlyLaunching) {
            setIsLaunching(false);
            resetLaunchState(profile.id);
          }
        }
      } catch (err) {
        console.error("Error checking profile status:", err);
      }
    };

    checkStatus();
  }, [
    profile.id,
    profile.state,
    isLaunching,
    isProfileCurrentlyLaunching,
    resetLaunchState,
  ]);

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

  const getProfileIcon = () => {
    if (profile.banner?.source.type === "url") {
      return profile.banner.source.url;
    }
    return null;
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to the card
    setLaunchError(null);

    if (isLaunching) {
      try {
        await ProcessService.abort(profile.id);
        processMonitor.stopMonitoring();
        resetLaunchState(profile.id);
      } catch (error) {
        console.error("Failed to abort launch:", error);
        setLaunchError(
          error instanceof Error ? error.message : "Failed to abort launch",
        );
      } finally {
        setIsLaunching(false);
      }
      return;
    }

    setIsLaunching(true);
    try {
      await ProcessService.launch(profile.id);

      setTimeout(() => {
        ProcessService.isMinecraftRunning(profile.id)
          .then((isRunning) => {
            if (isRunning) {
              console.log("Game is running after timeout, resetting buttons");
              setIsLaunching(false);
              resetLaunchState(profile.id);
            }
          })
          .catch(() => {
            setIsLaunching(false);
            resetLaunchState(profile.id);
          });
      }, 5000);
    } catch (error) {
      console.error("Failed to launch profile:", error);
      setIsLaunching(false);
      resetLaunchState(profile.id);
      setLaunchError(
        error instanceof Error ? error.message : "Failed to launch profile",
      );
    }
  };

  const handleAbort = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ProcessService.abort(profile.id);
      setIsLaunching(false);
      resetLaunchState(profile.id);
    } catch (err) {
      console.error("Error aborting launch:", err);
      setLaunchError(
        err instanceof Error ? err.message : "Failed to abort launch",
      );
    }
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLaunchError(null);

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
        
        const clonePromise = useProfileStore.getState().copyProfile(profile.id, newName, null);

        toast.promise(
          clonePromise,
          {
            loading: `Cloning profile '${profile.name}'...`,
            success: () => {
              onProfileCloned();
              return `Profile '${newName}' cloned successfully!`;
            },
            error: (err) => `Failed to clone profile: ${err instanceof Error ? err.message : String(err)}`,
          }
        ).finally(() => {
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
    // No e.stopPropagation() needed as this is called from context menu action
    const openPromise = ProfileService.openProfileFolder(profile.id);

    toast.promise(openPromise, {
      loading: `Opening folder for '${profile.name}'...`,
      success: `Successfully opened folder for '${profile.name}'!`,
      error: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        // Check if the error message indicates the folder doesn't exist, which can happen
        // if the profile was just created and not launched/installed yet.
        if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("does not exist")) {
          return `Profile folder for '${profile.name}' does not exist yet. Launch the profile to create it.`;
        }
        return `Failed to open folder: ${message}`;
      },
    });
  };

  // Wrapper for context menu duplicate to match signature
  const handleDuplicateFromContextMenu = () => {
    // We need to simulate parts of handleClone or refactor handleClone
    // For now, let's call handleClone. It expects an event, so we pass a partial mock.
    // This isn't ideal, long-term handleClone should be refactored if it doesn't always need the event.
    const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
    handleClone(mockEvent);
  };

  // Wrapper for context menu delete to match signature and include confirm dialog
  const handleDeleteFromContextMenu = () => {
    // Call the ProfileCard's handleDelete, which includes the confirm dialog.
    // It expects a MouseEvent, so we pass a mock.
    const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
    handleDelete(mockEvent); // This handleDelete is from ProfileCard, contains confirm()
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    console.log("[ProfileCard] closeContextMenu called");
    setContextMenuVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuVisible && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        console.log("[ProfileCard] handleClickOutside - closing menu");
        closeContextMenu();
      } else if (contextMenuVisible) {
        console.log("[ProfileCard] handleClickOutside - click was inside menu or on menu itself, not closing.");
      }
    };

    if (contextMenuVisible) {
      const timerId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timerId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [contextMenuVisible]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        boxShadow: "0 12px 0 rgba(0,0,0,0.25), 0 15px 20px rgba(0,0,0,0.4)",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        boxShadow: "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35)",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      !(e.target as HTMLElement).closest("button")
    ) {
      onClick();
    }
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer h-full flex flex-col select-none rounded-md",
        "border-2 border-b-4",
        "bg-black/20 backdrop-blur-md",
      )}
      style={{
        borderColor: isLaunching
          ? "rgba(239, 68, 68, 0.5)"
          : `${accentColor.value}80`,
        borderBottomColor: isLaunching ? "rgb(185, 28, 28)" : accentColor.value,
        boxShadow:
          "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
        backgroundColor: `${accentColor.value}10`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
        style={{ backgroundColor: `${accentColor.value}80` }}
      />

      <span
        className={cn(
          "absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent transition-opacity duration-300",
          isHovered ? "opacity-30" : "opacity-0",
        )}
      />

      <div
        className="flex items-center justify-between p-4 border-b border-white/20"
        style={{ backgroundColor: `${accentColor.value}05` }}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div
            className="w-12 h-12 mr-3 relative flex-shrink-0 flex items-center justify-center rounded-sm overflow-hidden"
            style={{
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: `${accentColor.value}60`,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
          >
            {getProfileIcon() ? (
              <img
                src={getProfileIcon() || "/placeholder.svg"}
                alt={profile.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Icon icon="solar:widget-bold" className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-2xl font-minecraft text-white whitespace-nowrap overflow-hidden text-ellipsis lowercase font-normal">
              {profile.name}
            </h3>
            <div className="flex items-center">
              <img
                src={getModLoaderIcon() || "/placeholder.svg"}
                alt={profile.loader || "vanilla"}
                className="w-5 h-5 mr-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icons/minecraft.png";
                }}
              />
              <span className="text-base text-white/70 font-minecraft whitespace-nowrap lowercase">
                {profile.game_version}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!profile.is_standard_version && (
            <IconButton
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              variant="secondary"
              size="xs"
              disabled={isLaunching || isProfileCurrentlyLaunching || isCloning}
              icon={<Icon icon="solar:settings-bold" className="w-3.5 h-3.5" />}
              aria-label="Settings"
            />
          )}
          <IconButton
            onClick={handleClone}
            variant="secondary"
            size="xs"
            disabled={isLaunching || isProfileCurrentlyLaunching || isCloning}
            icon={<Icon icon="solar:copy-bold" className="w-3.5 h-3.5" />}
            aria-label="Clone Profile"
            title="Clone Profile"
          />
          {/* Temporary Test Button for Context Menu */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              // Simulate context menu opening at a fixed position or near the button
              const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect();
              setContextMenuPosition({ 
                x: rect ? rect.left : 200, 
                y: rect ? rect.bottom + 5 : 200 
              });
              setContextMenuVisible(!contextMenuVisible); // Toggle visibility
            }}
            variant="warning" // Different color for testing
            size="xs"
            icon={<Icon icon="solar:question-circle-bold" className="w-3.5 h-3.5" />}
            aria-label="Test Context Menu"
            title="Test Context Menu"
          />
        </div>
      </div>

      <div
        className="p-4 flex-1 flex flex-col justify-end"
        style={{ backgroundColor: `${accentColor.value}05` }}
      >
        {launchError && (
          <div
            className="mb-3 p-2 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-minecraft rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {launchError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isLaunching ? (
            <div
              className="flex flex-col gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={handleAbort}
                variant="destructive"
                size="md"
                icon={
                  <Icon
                    icon="solar:close-bold"
                    className="w-5 h-5 text-white"
                  />
                }
              >
                ABORT
              </Button>
              <div className="w-full h-[3px] bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${Math.max(1, launchProgress * 100)}%` }}
                />
              </div>
              <Label variant="secondary" size="sm" className="text-center">
                {currentStep}
              </Label>
            </div>
          ) : (
            <Button
              onClick={handlePlay}
              variant="default"
              size="md"
              icon={
                <Icon icon="solar:play-bold" className="w-4 h-4 text-white" />
              }
            >
              LAUNCH GAME
            </Button>
          )}
        </div>
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
      />
    </div>
  );
}
