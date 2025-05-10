"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useLaunchStateStore } from "../../store/launch-state-store";
import { IconButton } from "../ui/buttons/IconButton";
import { ProfileSelectionModal } from "./ProfileSelectionModal";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen } from "@tauri-apps/api/event";
import { useThemeStore } from "../../store/useThemeStore";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { gsap } from "gsap";

interface Version {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
  profileId?: string;
}

interface LaunchButtonProps {
  versions?: Version[];
  defaultVersion?: string;
  className?: string;
  onVersionChange?: (version: string) => void;
  maxWidth?: string;
}

export function LaunchButton({
  defaultVersion,
  className,
  onVersionChange,
  versions,
  maxWidth = "280px",
}: LaunchButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const eventListenersSetUp = useRef(false);
  const { accentColor } = useThemeStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const { selectedVersion, setSelectedVersion, openModal } =
    useVersionSelectionStore();

  const { initializeProfile, getProfileState } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchProgress, error, launchState } = profileState;
  useEffect(() => {
    if (defaultVersion && !selectedVersion) {
      setSelectedVersion(defaultVersion);
    }
  }, [defaultVersion, selectedVersion, setSelectedVersion]);

  useEffect(() => {
    if (eventListenersSetUp.current) return;

    const setupListeners = async () => {
      const unlistenEvent = await listen("event", (event) => {
        const payload = event.payload as any;
        if (
          payload.target_id === selectedVersion &&
          payload.event_type?.toLowerCase() === "minecraft_output"
        ) {
          console.log("Game started event received, resetting buttons");
          setIsLaunching(false);
        }
      });

      const unlistenExit = await listen("minecraft_process_exited", (event) => {
        const payload = event.payload as any;
        if (payload.profile_id === selectedVersion) {
          console.log("Process exited event received, resetting buttons");
          setIsLaunching(false);
        }
      });

      const unlistenState = await listen("state_event", (event) => {
        const payload = event.payload as any;
        if (payload.target_id === selectedVersion) {
          if (payload.event_type?.toLowerCase() === "minecraft_output") {
            console.log("State event: game started, resetting buttons");
            setIsLaunching(false);
          } else if (
            payload.event_type?.toLowerCase() === "minecraft_process_exited"
          ) {
            console.log("State event: process exited, resetting buttons");
            setIsLaunching(false);
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
      if (selectedVersion) {
        ProcessService.isMinecraftRunning(selectedVersion)
          .then((isRunning) => {
            if (isRunning && isLaunching) {
              console.log("Game is running, resetting buttons state");
              setIsLaunching(false);
            }
          })
          .catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedVersion]);

  useEffect(() => {
    if (selectedVersion) {
      initializeProfile(selectedVersion);

      ProcessService.isMinecraftRunning(selectedVersion)
        .then((isRunning) => {
          if (!isRunning && isLaunching) {
            setIsLaunching(false);
          }
        })
        .catch(() => {
          setIsLaunching(false);
        });
    }
  }, [selectedVersion, initializeProfile]);

  useEffect(() => {
    if (progressRef.current && isLaunching) {
      gsap.to(progressRef.current, {
        width: `${Math.max(1, launchProgress * 100)}%`,
        duration: 0.3,
        ease: "power1.out",
      });
    }
  }, [launchProgress, isLaunching]);

  const handleLaunch = async () => {
    if (!selectedVersion) return;

    if (isLaunching) {
      try {
        await ProcessService.abort(selectedVersion);
        processMonitor.stopMonitoring();
      } catch (error) {
        console.error("Failed to abort launch:", error);
      } finally {
        setIsLaunching(false);
      }
      return;
    }

    setIsLaunching(true);
    try {
      await ProcessService.launch(selectedVersion);

      setTimeout(() => {
        setIsLaunching(false);
      }, 10000);
    } catch (error) {
      console.error("Failed to launch profile:", error);
      setIsLaunching(false);
    }
  };

  const handleVersionChange = (version: string) => {
    if (isLaunching) return;

    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (isLaunching) return;
    openModal();
  };

  const getButtonText = () => {
    if (isLaunching) {
      return "STOP GAME";
    } else if (error) {
      return "ERROR";
    } else {
      return "LAUNCH GAME";
    }
  };

  const getButtonIcon = () => {
    if (isLaunching) {
      return <Icon icon="solar:stop-bold" width="32" height="32" />;
    } else if (error) {
      return <Icon icon="solar:danger-triangle-bold" width="32" height="32" />;
    } else {
      return <Icon icon="solar:play-bold" width="32" height="32" />;
    }
  };

  return (
    <div
      className={cn("relative flex items-center gap-2", className)}
      style={{ maxWidth }}
    >
      {error && !isLaunching && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/80 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={handleLaunch}
        disabled={!selectedVersion}
        className={cn(
          "flex-1 h-20 font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white tracking-wider lowercase",
          "flex items-center justify-center px-6",
          "text-shadow-sm",
          "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
          "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-black/20",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          "disabled:hover:shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
        )}
        style={{
          backgroundColor: isLaunching
            ? "#d32f2f30"
            : error
              ? "#d32f2f30"
              : `${accentColor.value}30`,
          borderColor: isLaunching
            ? "#d32f2f80"
            : error
              ? "#d32f2f80"
              : `${accentColor.value}80`,
          borderBottomColor: isLaunching
            ? "#d32f2f"
            : error
              ? "#d32f2f"
              : accentColor.value,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm transition-colors duration-200"
          style={{
            backgroundColor: isLaunching
              ? "#ff5252"
              : error
                ? "#ff5252"
                : accentColor.hoverValue,
            opacity: 0.8,
          }}
        />

        <div className="flex items-center justify-center gap-3 z-10">
          {getButtonIcon()}
          <span className="text-2xl font-bold">{getButtonText()}</span>
        </div>

        {isLaunching && (
          <div className="absolute inset-0 bg-black/20">
            <div
              ref={progressRef}
              className="h-full bg-white/20 transition-all duration-300"
              style={{ width: `${Math.max(1, launchProgress * 100)}%` }}
            />
          </div>
        )}
      </button>

      <IconButton
        onClick={handleOpenModal}
        disabled={isLaunching || !versions || versions.length === 0}
        variant="secondary"
        size="xl"
        className="relative overflow-hidden transition-all duration-300 h-20 w-20"
        style={{
          borderColor: `${accentColor.value}80`,
          borderBottomColor: accentColor.value,
          boxShadow:
            "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
          backgroundColor: `${accentColor.value}10`,
        }}
        icon={<Icon icon="solar:alt-arrow-down-bold" width="32" height="32" />}
      />

      {versions && (
        <ProfileSelectionModal
          versions={versions}
          onVersionChange={handleVersionChange}
          title="Select Version"
        />
      )}
    </div>
  );
}
