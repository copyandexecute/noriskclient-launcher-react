"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { LaunchStatus } from "./LaunchStatus";
import { useLaunchStateStore } from "../../store/launch-state-store";
import { Button } from "../ui/Button";
import { VersionSelector } from "./VersionSelector";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen } from "@tauri-apps/api/event";

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
}

export function LaunchButton({
  defaultVersion,
  className,
  onVersionChange,
  versions,
}: LaunchButtonProps) {
  const [selectedVersion, setSelectedVersion] = useState(defaultVersion || "");
  const [showVersions, setShowVersions] = useState(false);
  const [showLaunchStatus, setShowLaunchStatus] = useState(false);
  const [hideStatusTimeoutId, setHideStatusTimeoutId] = useState<number | null>(
    null,
  );
  const [isLaunching, setIsLaunching] = useState(false);
  const eventListenersSetUp = useRef(false);

  const { initializeProfile, getProfileState } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchProgress, currentStep, error, logHistory } = profileState;

  useEffect(() => {
    if (eventListenersSetUp.current) return;

    const setupListeners = async () => {
      const unlistenEvent = await listen("event", (event) => {
        const payload = event.payload as any;
        if (
          payload.target_id === selectedVersion &&
          payload.event_type?.toLowerCase() === "minecraft_output"
        ) {
          console.log("Game started event received, resetting button");
          setIsLaunching(false);
        }
      });

      const unlistenExit = await listen("minecraft_process_exited", (event) => {
        const payload = event.payload as any;
        if (payload.profile_id === selectedVersion) {
          console.log("Process exited event received, resetting button");
          setIsLaunching(false);
        }
      });

      const unlistenState = await listen("state_event", (event) => {
        const payload = event.payload as any;
        if (payload.target_id === selectedVersion) {
          if (payload.event_type?.toLowerCase() === "minecraft_output") {
            console.log("State event: game started, resetting button");
            setIsLaunching(false);
          } else if (
            payload.event_type?.toLowerCase() === "minecraft_process_exited"
          ) {
            console.log("State event: process exited, resetting button");
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
              console.log("Game is running, resetting button state");
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
    if (defaultVersion && defaultVersion !== selectedVersion) {
      setSelectedVersion(defaultVersion);
    }
  }, [defaultVersion, selectedVersion]);

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

    setSelectedVersion(version);
    setShowVersions(false);

    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const toggleVersionSelect = () => {
    if (isLaunching) return;

    setShowVersions(!showVersions);
  };

  const getButtonText = () => {
    if (isLaunching) {
      return "STOP";
    } else if (error) {
      return "ERROR";
    } else {
      return "LAUNCH GAME";
    }
  };

  const getButtonVariant = () => {
    if (isLaunching) {
      return "danger";
    } else if (error) {
      return "danger";
    } else {
      return "primary";
    }
  };

  const getButtonIcon = () => {
    if (isLaunching) {
      return <Icon icon="pixel:stop-solid" className="w-9 h-9 text-red-400" />;
    } else if (error) {
      return (
        <Icon
          icon="pixel:exclamation-triangle-solid"
          className="w-9 h-9 text-red-400"
        />
      );
    } else {
      return <Icon icon="pixel:play-solid" className="w-9 h-9" />;
    }
  };

  return (
    <div
      className={cn("relative flex flex-col justify-center w-full", className)}
    >
      {error && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/80 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 max-w-md w-full">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleLaunch}
            disabled={!selectedVersion}
            variant={getButtonVariant()}
            size="lg"
            className="flex-1 py-4 px-12 text-2xl font-bold whitespace-nowrap"
            icon={getButtonIcon()}
          >
            {getButtonText()}
          </Button>

          <Button
            onClick={toggleVersionSelect}
            disabled={isLaunching}
            variant="secondary"
            size="lg"
            className="h-full py-4 px-5"
            icon={<Icon icon="pixel:chevron-down-solid" className="w-8 h-8" />}
          >{``}</Button>
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

      {showVersions && versions && (
        <VersionSelector
          versions={versions}
          selectedVersion={selectedVersion}
          onVersionChange={handleVersionChange}
        />
      )}
    </div>
  );
}
