"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useLaunchStateStore, LaunchState } from "../../store/launch-state-store";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { ProfileSelectionModal } from "./ProfileSelectionModal";
import * as ProcessService from "../../services/process-service";
import { processMonitor } from "../../services/process-monitor";
import { listen, Event as TauriEvent } from "@tauri-apps/api/event";
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
  const [isLaunching, setIsLaunching] = useState(false);
  const eventListenersSetUp = useRef(false);
  const { accentColor } = useThemeStore();
  const [detailedStatusMessage, setDetailedStatusMessage] = useState<string | null>(null);

  const { selectedVersion, setSelectedVersion, openModal } =
    useVersionSelectionStore();

  const { initializeProfile, getProfileState } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchProgress, currentStep, error, logHistory, launchState } = profileState;

  useEffect(() => {
    if (defaultVersion && !selectedVersion) {
      setSelectedVersion(defaultVersion);
    }
  }, [defaultVersion, selectedVersion, setSelectedVersion]);

  useEffect(() => {
    if (eventListenersSetUp.current && !selectedVersion) return;

    let unlistenStart: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;
    let unlistenDetailedStateEvent: (() => void) | undefined;

    const setupBaseListeners = async () => {
      if (!selectedVersion) return;
      unlistenStart = await listen("event", (event: TauriEvent<any>) => {
        const payload = event.payload as any;
        if (
          payload.target_id === selectedVersion &&
          payload.event_type?.toLowerCase() === "minecraft_output"
        ) {
          console.log("[LaunchButton] Game started event, resetting UI");
          setIsLaunching(false);
          setDetailedStatusMessage(null);
        }
      });

      unlistenExit = await listen("minecraft_process_exited", (event: TauriEvent<any>) => {
        const payload = event.payload as any;
        if (payload.profile_id === selectedVersion) {
          console.log("[LaunchButton] Process exited event, resetting UI");
          setIsLaunching(false);
          setDetailedStatusMessage(null);
        }
      });
      
      unlistenError = await listen("launch_error_event", (event: TauriEvent<any>) => {
        const payload = event.payload as any;
        if (payload.profile_id === selectedVersion) {
          console.log("[LaunchButton] Launch error event received, resetting UI");
          setIsLaunching(false);
          setDetailedStatusMessage(null);
        }
      });
    };

    const setupDetailedListener = async () => {
      if (!selectedVersion) return;
      console.log(`[LaunchButton] Setting up detailed listener for ${selectedVersion}`);
      unlistenDetailedStateEvent = await listen<any>(
        "state_event", 
        (event: TauriEvent<any>) => {
          if (event.payload && event.payload.target_id === selectedVersion) {
            if (event.payload.message) {
              console.log(`[LaunchButton] Detailed state_event for ${selectedVersion}: ${event.payload.message}`);
              setDetailedStatusMessage(event.payload.message);
            }
            if (event.payload.event_type?.toLowerCase() === "error") {
              console.log(`[LaunchButton] Error event received for ${selectedVersion}, resetting UI.`);
              setIsLaunching(false);
            }
          }
        }
      );
    };

    if (isLaunching && selectedVersion) {
      setupDetailedListener();
      if (!detailedStatusMessage) setDetailedStatusMessage("Initializing launch...");
    } else {
      setDetailedStatusMessage(null);
      if (unlistenDetailedStateEvent) {
        unlistenDetailedStateEvent();
        unlistenDetailedStateEvent = undefined;
      }
    }
    
    if (!eventListenersSetUp.current && selectedVersion) {
      setupBaseListeners();
      eventListenersSetUp.current = true;
    }

    const intervalId = setInterval(() => {
      if (selectedVersion) {
        ProcessService.isMinecraftRunning(selectedVersion)
          .then((isRunning) => {
            if (!isRunning && isLaunching) {
              console.log("[LaunchButton] Minecraft not running (polled), resetting UI");
              setIsLaunching(false);
            } else if (isRunning && !isLaunching){
            }
          })
          .catch(() => {});
      }
    }, 3000);

    return () => {
      if (unlistenStart) unlistenStart();
      if (unlistenExit) unlistenExit();
      if (unlistenError) unlistenError();
      if (unlistenDetailedStateEvent) unlistenDetailedStateEvent();
      clearInterval(intervalId);
    };
  }, [selectedVersion, isLaunching]);

  useEffect(() => {
    if (selectedVersion) {
      initializeProfile(selectedVersion);
      ProcessService.isMinecraftRunning(selectedVersion)
        .then((isRunning) => {
          if (isRunning && !isLaunching) {
            console.log("[LaunchButton] Game already running on init, setting UI to launching (stop mode)");
          } else if (!isRunning && isLaunching) {
            setIsLaunching(false);
          }
        })
        .catch(() => {
          setIsLaunching(false);
        });
    }
  }, [selectedVersion, initializeProfile]);

  const handleLaunch = async () => {
    if (!selectedVersion) return;

    if (isLaunching) {
      try {
        await ProcessService.abort(selectedVersion);
        processMonitor.stopMonitoring();
      } catch (err) {
        console.error("Failed to abort launch:", err);
      } finally {
        setIsLaunching(false);
        setDetailedStatusMessage(null);
      }
      return;
    }

    setIsLaunching(true);
    setDetailedStatusMessage("Starting launch process...");
    try {
      await ProcessService.launch(selectedVersion);
    } catch (err: any) {
      console.error("Failed to launch profile:", err);
      setIsLaunching(false);
      setDetailedStatusMessage(null);
    }
  };

  const handleVersionChange = (version: string) => {
    if (isLaunching) return;
    setDetailedStatusMessage(null);
    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLaunching) return;
    openModal();
  };

  const getMainButtonIcon = () => {
    if (isLaunching) {
      return <Icon icon="solar:stop-bold" width="24" height="24" />;
    } else if (error && launchState === LaunchState.ERROR) {
      return <Icon icon="solar:danger-triangle-bold" width="24" height="24" />;
    }
    return <Icon icon="solar:play-bold" width="24" height="24" />;
  };

  const getMainButtonText = () => {
    if (isLaunching) {
      return "STOP";
    }
    if (error && launchState === LaunchState.ERROR) {
      return "ERROR";
    }
    return "LAUNCH";
  };
  
  const getButtonVariant = () => {
    if (isLaunching) {
      return "destructive"; 
    } 
    if (error && launchState === LaunchState.ERROR) { 
      return "destructive";
    }
    return "default";
  };

  return (
    <div
      className={cn("relative flex flex-col justify-center", className)}
      style={{ maxWidth }}
    >
      {error && !isLaunching && launchState === LaunchState.ERROR && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/80 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 relative">
          <Button
            onClick={handleLaunch}
            disabled={!selectedVersion}
            variant={getButtonVariant()}
            size="lg"
            icon={getMainButtonIcon()}
            className="flex-1"
          >
            {getMainButtonText()}
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
        
        {isLaunching && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 flex justify-center"
          >
            <p 
              className="text-2xl text-gray-300 font-minecraft lowercase whitespace-nowrap"
              title={detailedStatusMessage || currentStep || ""} 
            >
              {detailedStatusMessage || currentStep || "Launching..."}
            </p>
          </div>
        )}
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
