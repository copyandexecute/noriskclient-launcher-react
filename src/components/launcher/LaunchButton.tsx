"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { LaunchStatus } from "./LaunchStatus";
import { useLaunchStateStore } from "../../store/launch-state-store";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { ProfileSelectionModal } from "./ProfileSelectionModal";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen } from "@tauri-apps/api/event";
import { useThemeStore } from "../../store/useThemeStore";
import { useVersionSelectionStore } from "../../store/version-selection-store";

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
  maxWidth = "300px",
}: LaunchButtonProps) {
  const [showLaunchStatus, setShowLaunchStatus] = useState(false);
  const [hideStatusTimeoutId, setHideStatusTimeoutId] =
    useState<NodeJS.Timeout | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const eventListenersSetUp = useRef(false);
  const { accentColor } = useThemeStore();

  const { selectedVersion, setSelectedVersion, openModal } =
    useVersionSelectionStore();

  const { initializeProfile, getProfileState } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchProgress, currentStep, error, logHistory } = profileState;

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
    if (isLaunching) {
      setShowLaunchStatus(true);

      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
        setHideStatusTimeoutId(null);
      }
    } else {
      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        setShowLaunchStatus(false);
        setHideStatusTimeoutId(null);
      }, 5000);

      setHideStatusTimeoutId(timeoutId);
    }
  }, [isLaunching]);

  useEffect(() => {
    return () => {
      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
      }
    };
  }, [hideStatusTimeoutId]);

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
    e.stopPropagation();
    if (isLaunching) return;
    openModal();
  };

  const getButtonText = () => {
    if (isLaunching) {
      return "STOP";
    } else if (error) {
      return "ERROR";
    } else {
      return "LAUNCH";
    }
  };

  const getButtonVariant = () => {
    if (isLaunching) {
      return "destructive";
    } else if (error) {
      return "destructive";
    } else {
      return "default";
    }
  };

  const getButtonIcon = () => {
    if (isLaunching) {
      return <Icon icon="solar:stop-bold" width="24" height="24" />;
    } else if (error) {
      return <Icon icon="solar:danger-triangle-bold" width="24" height="24" />;
    } else {
      return <Icon icon="solar:play-bold" width="24" height="24" />;
    }
  };

  return (
    <div
      className={cn("relative flex flex-col justify-center", className)}
      style={{ maxWidth }}
    >
      {error && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/80 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleLaunch}
            disabled={!selectedVersion}
            variant={getButtonVariant()}
            size="lg"
            icon={getButtonIcon()}
            className="flex-1"
          >
            {getButtonText()}
          </Button>

          <IconButton
            onClick={handleOpenModal}
            disabled={isLaunching || !versions || versions.length === 0}
            variant="secondary"
            size="lg"
            className="relative overflow-hidden transition-all duration-300"
            style={{
              borderColor: `${accentColor.value}80`,
              borderBottomColor: accentColor.value,
              boxShadow:
                "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
              backgroundColor: `${accentColor.value}10`,
            }}
            icon={
              <Icon icon="solar:alt-arrow-down-bold" width="24" height="24" />
            }
          ></IconButton>
        </div>

        <div className="h-[60px] relative">
          {showLaunchStatus && selectedVersion && (
            <LaunchStatus
              profileId={selectedVersion}
              isLaunching={isLaunching}
              currentStep={currentStep}
              progress={launchProgress}
              logHistory={logHistory}
              onAbort={() => {
                ProcessService.abort(selectedVersion);
                setIsLaunching(false);
              }}
              className="absolute top-0 left-0 right-0 w-full"
            />
          )}
        </div>
      </div>

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
