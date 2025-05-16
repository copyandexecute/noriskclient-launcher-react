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
import { Button } from "../ui/buttons/Button";
import * as ProcessService from "../../services/process-service";
import { type Event as TauriEvent, listen } from "@tauri-apps/api/event";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { toast } from "react-hot-toast";
import { ProfileContextMenu } from "./ProfileContextMenu";
import * as ProfileService from "../../services/profile-service";
import { type EventPayload, EventType } from "../../types/events";
import { Card } from "../ui/Card";

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
    resetLaunchState,
    setLaunchError,
  } = useLaunchStateStore();
  const accentColor = useThemeStore((state) => state.accentColor);

  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isButtonDisabledBriefly, setIsButtonDisabledBriefly] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const cardRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (profile.id) {
      initializeProfile(profile.id);
    }
  }, [profile.id, initializeProfile]);

  const { launchState } = getProfileState(profile.id);
  const isProfileCurrentlyLaunching = launchState === LaunchState.LAUNCHING;

  useEffect(() => {
    if (!profile.id) return;

    console.log(`[ProfileCard ${profile.id}] Setting up state_event listener.`);
    let isMounted = true;

    const handleStateEvent = (event: TauriEvent<EventPayload>) => {
      if (!isMounted) return;
      const payload = event.payload;

      if (payload.target_id === profile.id) {
        if (payload.event_type === EventType.LaunchSuccessful) {
          console.log(`[ProfileCard ${profile.id}] Event: LaunchSuccessful`);
          toast.success(`Profile '${profile.name}' launched successfully!`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsButtonDisabledBriefly(true);
          setTimeout(() => {
            setIsLaunching(false);
            resetLaunchState(profile.id);
            setIsButtonDisabledBriefly(false);
          }, 300);
        } else if (payload.event_type === EventType.Error) {
          const errorMessage =
            payload.message || "An unknown error occurred during launch.";
          console.error(
            `[ProfileCard ${profile.id}] Event: Error - ${errorMessage}`,
          );
          toast.error(errorMessage);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsButtonDisabledBriefly(true);
          setTimeout(() => {
            setIsLaunching(false);
            resetLaunchState(profile.id);
            setIsButtonDisabledBriefly(false);
          }, 300);
        } else if (payload.event_type === EventType.MinecraftOutput) {
          console.log(
            `[ProfileCard ${profile.id}] Event: MinecraftOutput - ${payload.message}`,
          );
        } else if (payload.event_type === EventType.MinecraftProcessExited) {
          console.log(
            `[ProfileCard ${profile.id}] Event: MinecraftProcessExited - Success: ${payload.error}`,
          );
        }
      }
    };

    const unlistenPromise = listen<EventPayload>(
      "state_event",
      handleStateEvent,
    );

    const cleanup = async () => {
      console.log(
        `[ProfileCard ${profile.id}] Cleaning up state_event listener.`,
      );
      isMounted = false;
      try {
        const unlisten = await unlistenPromise;
        unlisten();
      } catch (error) {
        console.error(
          `[ProfileCard ${profile.id}] Error during state_event listener cleanup:`,
          error,
        );
      }
    };

    return () => {
      cleanup();
    };
  }, [profile.id, profile.name, resetLaunchState]);

  useEffect(() => {
    if (!profile.id) return;

    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log(
          `[ProfileCard ${profile.id}] Polling for is_profile_launching stopped.`,
        );
      }
    };

    if (isLaunching) {
      console.log(
        `[ProfileCard ${profile.id}] Starting polling for is_profile_launching.`,
      );
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const isStillLaunchingBackend =
            await ProfileService.isProfileLaunching(profile.id);
          if (!isStillLaunchingBackend) {
            console.log(
              `[ProfileCard ${profile.id}] Polling: Backend reports profile is NOT launching. Resetting UI.`,
            );
            clearPolling();
            const currentProfileState = getProfileState(profile.id);
            if (currentProfileState.error) {
              console.warn(
                `[ProfileCard ${profile.id}] Polling reset UI, an error was previously logged in global state: ${currentProfileState.error}`,
              );
            }
            setIsButtonDisabledBriefly(true);
            setTimeout(() => {
              setIsLaunching(false);
              resetLaunchState(profile.id);
              setIsButtonDisabledBriefly(false);
            }, 300);
          }
        } catch (err: any) {
          console.error(
            `[ProfileCard ${profile.id}] Error during is_profile_launching polling:`,
            err,
          );
          toast.error(`Polling error: ${err.message || "Unknown error"}`);
          clearPolling();
          setIsButtonDisabledBriefly(true);
          setTimeout(() => {
            setIsLaunching(false);
            resetLaunchState(profile.id);
            setIsButtonDisabledBriefly(false);
          }, 300);
        }
      }, 2000);
    } else {
      clearPolling();
    }

    return clearPolling;
  }, [profile.id, isLaunching, resetLaunchState, getProfileState]);

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
    e.stopPropagation();
    if (!profile.id) return;

    if (isLaunching) {
      try {
        await ProcessService.abort(profile.id);
        toast.success("Launch cancellation requested.");
      } catch (error) {
        console.error("Failed to request launch cancellation:", error);
        const message =
          error instanceof Error ? error.message : "Failed to cancel launch";
        toast.error(`Cancellation request failed: ${message}`);
      } finally {
        console.log(
          `[ProfileCard ${profile.id}] User clicked CANCEL. Resetting UI immediately.`,
        );
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log(
            `[ProfileCard ${profile.id}] Polling stopped due to CANCEL action.`,
          );
        }
        setIsButtonDisabledBriefly(true);
        setTimeout(() => {
          setIsLaunching(false);
          resetLaunchState(profile.id);
          setIsButtonDisabledBriefly(false);
        }, 300);
      }
      return;
    }

    console.log(
      `[ProfileCard ${profile.id}] Initiating new launch. Resetting states.`,
    );
    setIsLaunching(true);
    resetLaunchState(profile.id);

    try {
      await ProcessService.launch(profile.id);
    } catch (error) {
      console.error("Failed to initiate launch profile:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to launch profile";
      toast.error(`Launch initiation failed: ${errorMessage}`);
      setLaunchError(profile.id, errorMessage);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log(
          `[ProfileCard ${profile.id}] Polling stopped due to initial launch failure.`,
        );
      }
      setIsButtonDisabledBriefly(true);
      setTimeout(() => {
        setIsLaunching(false);
        resetLaunchState(profile.id);
        setIsButtonDisabledBriefly(false);
      }, 300);
    }
  };

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
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    console.log("[ProfileCard] closeContextMenu called");
    setContextMenuVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuVisible &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        console.log("[ProfileCard] handleClickOutside - closing menu");
        closeContextMenu();
      } else if (contextMenuVisible) {
        console.log(
          "[ProfileCard] handleClickOutside - click was inside menu or on menu itself, not closing.",
        );
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      !(e.target as HTMLElement).closest("button")
    ) {
      onClick();
    }
  };

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

  const handleExportFromContextMenu = () => {
    if (profile) {
      onShouldExport(profile);
    }
  };

  return (
    <Card
      ref={cardRef}
      className="h-full flex flex-col select-none cursor-pointer"
      onClick={(e) => handleCardClick(e)}
      onContextMenu={handleContextMenu}
    >
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
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              variant="secondary"
              size="xs"
              disabled={isLaunching || isProfileCurrentlyLaunching || isCloning}
              icon={<Icon icon="solar:settings-bold" className="w-3.5 h-3.5" />}
              aria-label="Settings"
            />
          )}
        </div>
      </div>

      <div
        className="p-4 flex-1 flex flex-col justify-end"
        style={{ backgroundColor: `${accentColor.value}05` }}
      >
        <div className="flex flex-col gap-3">
          {isLaunching ? (
            <div
              className="flex flex-col gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={handlePlay}
                variant="destructive"
                size="md"
                disabled={isButtonDisabledBriefly}
                icon={
                  <Icon
                    icon="eos-icons:loading"
                    className="w-5 h-5 text-white"
                  />
                }
              >
                CANCEL
              </Button>
            </div>
          ) : (
            <Button
              onClick={handlePlay}
              variant="default"
              size="md"
              disabled={isButtonDisabledBriefly}
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
        onExport={handleExportFromContextMenu}
      />
    </Card>
  );
}
