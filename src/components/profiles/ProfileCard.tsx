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
import { IconButton } from "../ui/IconButton";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen } from "@tauri-apps/api/event";

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onClick: () => void;
}

export function ProfileCard({ profile, onEdit, onClick }: ProfileCardProps) {
  const { initializeProfile, getProfileState, resetLaunchState } =
    useLaunchStateStore();

  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const eventListenersSetUp = useRef(false);

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
          console.log("Game started event received, resetting button");
          setIsLaunching(false);
          resetLaunchState(profile.id);
        }
      });

      const unlistenExit = await listen("minecraft_process_exited", (event) => {
        const payload = event.payload as any;
        if (payload.profile_id === profile.id) {
          console.log("Process exited event received, resetting button");
          setIsLaunching(false);
          resetLaunchState(profile.id);
        }
      });

      const unlistenState = await listen("state_event", (event) => {
        const payload = event.payload as any;
        if (payload.target_id === profile.id) {
          if (payload.event_type?.toLowerCase() === "minecraft_output") {
            console.log("State event: game started, resetting button");
            setIsLaunching(false);
            resetLaunchState(profile.id);
          } else if (
            payload.event_type?.toLowerCase() === "minecraft_process_exited"
          ) {
            console.log("State event: process exited, resetting button");
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
                "Game is running, resetting button state to allow multiple instances",
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
    e.stopPropagation();
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
              console.log("Game is running after timeout, resetting button");
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
      setIsCloning(true);
      await useProfileStore
        .getState()
        .copyProfile(profile.id, `${profile.name} (Copy)`);
    } catch (error) {
      console.error("Failed to clone profile:", error);
      setLaunchError("Failed to clone profile");
    } finally {
      setIsCloning(false);
    }
  };

  const getButtonContent = () => {
    if (isLaunching) {
      return (
        <>
          <Icon icon="pixel:stop-solid" className="w-4 h-4 text-red-400" />
          <span>STOP</span>
        </>
      );
    } else {
      return (
        <>
          <Icon icon="pixel:play-solid" className="w-4 h-4" />
          <span>LAUNCH GAME</span>
        </>
      );
    }
  };

  return (
    <div
      className={cn(
        "bg-black/10 backdrop-blur-lg border-2 border-white/30 overflow-hidden transition-all duration-300 cursor-pointer h-full flex flex-col select-none",
        isHovered && "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
        isLaunching && "border-red-400/50",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-black/20">
        <div className="flex items-center flex-1 min-w-0">
          <div className="w-12 h-12 mr-3 relative flex-shrink-0 border-2 border-white/30 bg-black/30 flex items-center justify-center">
            {getProfileIcon() ? (
              <img
                src={getProfileIcon() || "/placeholder.svg"}
                alt={profile.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Icon icon="pixel:grid-solid" className="w-6 h-6 text-white/70" />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-2xl font-minecraft text-white whitespace-nowrap overflow-hidden text-ellipsis lowercase font-normal">
              {profile.name}
            </h3>
            <div className="flex items-center ">
              <img
                src={getModLoaderIcon() || "/placeholder.svg"}
                alt={profile.loader || "vanilla"}
                className="w-5 h-5 mr-2"
              />
              <span className="text-base text-white/70 font-minecraft whitespace-nowrap lowercase">
                {profile.game_version}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {profile.selected_norisk_pack_id && (
            <div
              className="w-8 h-8 flex items-center justify-center text-blue-300"
              title="NoRisk Pack"
            >
              <Icon icon="pixel:shield-solid" className="w-5 h-5" />
            </div>
          )}
          <IconButton
            icon={
              isCloning ? (
                <Icon
                  icon="pixel:spinner-solid"
                  className="w-4 h-4 animate-spin"
                />
              ) : (
                <Icon icon="pixel:copy-solid" className="w-4 h-4" />
              )
            }
            // @ts-ignore
            onClick={(e) => handleClone(e)}
            disabled={isCloning}
            title="Clone Profile"
          />
          {!profile.is_standard_version && (
            <IconButton
              icon={<Icon icon="pixel:cog-solid" className="w-4 h-4" />}
              // @ts-ignore
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Settings"
            />
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/20 bg-black/20">
        {launchError && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-minecraft">
            {launchError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isLaunching ? (
            <div className="flex flex-col gap-2">
              <button
                className="backdrop-blur-sm border-2 border-red-400/50 bg-red-900/30 py-4 px-6 text-2xl text-white font-minecraft flex items-center justify-center gap-3 transition-all uppercase whitespace-nowrap hover:bg-red-900/40 select-none"
                onClick={handleAbort}
              >
                <Icon icon="pixel:x-solid" className="w-5 h-5" />
                <span>ABORT</span>
              </button>
              <div className="w-full h-[3px] bg-black/40">
                <div
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${Math.max(1, launchProgress * 100)}%` }}
                />
              </div>
              <div className="text-base text-white/80 font-minecraft text-center">
                {currentStep}
              </div>
            </div>
          ) : (
            <button
              className={cn(
                "backdrop-blur-sm border-2 border-white/30 py-4 px-6 text-2xl text-white font-minecraft flex items-center justify-center gap-3 transition-all uppercase whitespace-nowrap select-none",
                "bg-black/40 hover:bg-black/60 active:bg-black/70 active:scale-[0.99]",
              )}
              onClick={handlePlay}
            >
              {getButtonContent()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
