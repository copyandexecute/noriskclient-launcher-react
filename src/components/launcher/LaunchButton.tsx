"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
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
import { toast } from 'react-hot-toast';
import { EventType as FrontendEventType, EventPayload as FrontendEventPayload, MinecraftProcessExitedPayload } from "../../types/events";

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
  const { accentColor } = useThemeStore();
  const [detailedStatusMessage, setDetailedStatusMessage] = useState<string | null>(null);
  const [transientStatus, setTransientStatus] = useState<{ message: string, color: string } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { selectedVersion, setSelectedVersion, openModal } =
    useVersionSelectionStore();

  const { initializeProfile, getProfileState, setLaunchError, resetLaunchState } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchProgress, currentStep, error, logHistory, launchState } = profileState;

  useEffect(() => {
    if (defaultVersion && !selectedVersion) {
      setSelectedVersion(defaultVersion);
    }
  }, [defaultVersion, selectedVersion, setSelectedVersion]);

  // Effect for managing event listeners (game start/exit, detailed status)
  useEffect(() => {
    if (!selectedVersion) return;

    let unlistenStart: (() => void) | undefined;
    let unlistenDetailedStateEvent: (() => void) | undefined;

    // Listener for game actually starting (e.g., reaching main menu)
    const setupGameLifecycleListeners = async () => {
      unlistenStart = await listen("event", (event: TauriEvent<any>) => {
        const payload = event.payload as any;
        if (
          payload.target_id === selectedVersion &&
          payload.event_type?.toLowerCase() === "minecraft_output"
        ) {
          console.log("[LaunchButton] Game started (minecraft_output) event, resetting UI if still launching.");
          if(isLaunching) setIsLaunching(false);
          setDetailedStatusMessage(null);
        }
      });
    };

    // Listener for detailed status messages while launching
    const setupDetailedListener = async () => {
      console.log(`[LaunchButton] Setting up detailed status listener for ${selectedVersion}`);
      unlistenDetailedStateEvent = await listen<FrontendEventPayload>(
        "state_event",
        (event: TauriEvent<FrontendEventPayload>) => {
          if (event.payload.target_id === selectedVersion) {
            const eventTypeFromPayload = event.payload.event_type; 
            const eventMessage = event.payload.message;

            if (eventTypeFromPayload === FrontendEventType.LaunchSuccessful) { 
              console.log(`[LaunchButton] LaunchSuccessful event for ${selectedVersion}`);
              setIsLaunching(false);
              setDetailedStatusMessage(null);
              setTransientStatus({ message: "ERFOLGREICH GESTARTET!", color: "text-green-400" });
              setTimeout(() => setTransientStatus(null), 3000);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log("[LaunchButton] Polling stopped due to LaunchSuccessful event for", selectedVersion);
              }
            } else if (eventTypeFromPayload === FrontendEventType.Error) {
              console.log(`[LaunchButton] Error event via state_event for ${selectedVersion}, resetting UI.`);
              const eventErrorMsg = eventMessage || "Fehler während des Startvorgangs.";
              toast.error(`Fehler: ${eventErrorMsg}`);
              if (selectedVersion) {
                setLaunchError(selectedVersion, eventErrorMsg); 
              }
              setIsLaunching(false); 
              setTransientStatus(null); 
            } else {
              // Handle other detailed messages (progress, steps, etc.) for the selectedVersion
              if (eventMessage) {
                setDetailedStatusMessage(eventMessage);
              }
            }
          }
        }
      );
    };
    
    setupGameLifecycleListeners();
    if (isLaunching) {
      setupDetailedListener();
      // Initial message, will be overwritten by detailed events
      if (!detailedStatusMessage) setDetailedStatusMessage("Initializing launch..."); 
    } else {
      setDetailedStatusMessage(null);
      if (unlistenDetailedStateEvent) unlistenDetailedStateEvent(); // Clean up if not launching
    }

    return () => {
      if (unlistenStart) unlistenStart();
      if (unlistenDetailedStateEvent) unlistenDetailedStateEvent();
    };
  }, [selectedVersion, isLaunching]); // isLaunching dependency manages detailed listener

  // Effect for Polling 'is_profile_launching' status (Svelte-like approach)
  useEffect(() => {
    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log("[LaunchButton] Polling stopped for", selectedVersion);
      }
    };

    if (isLaunching && selectedVersion) {
      console.log("[LaunchButton] Starting polling for launcher task finished for", selectedVersion);
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const isStillLaunching = await invoke<boolean>('is_profile_launching', { profileId: selectedVersion });
          const launcherTaskFinished = !isStillLaunching;
          
          if (launcherTaskFinished) {
            console.log("[LaunchButton] Polling determined launcher task finished for", selectedVersion, ". Resetting UI.");
            // If a LaunchSuccessful event is reliably emitted, this part might become redundant
            // for setting success. For now, keep it as a fallback or general cleanup.
            setIsLaunching(false);
            clearPolling();

            const currentProfileState = getProfileState(selectedVersion);
            if (currentProfileState.launchState === LaunchState.ERROR || currentProfileState.error) {
              console.log("[LaunchButton] Polling: Launch task finished, but an error was detected.");
              const errorMsg = currentProfileState.error || "Ein Fehler ist aufgetreten.";
              setDetailedStatusMessage(errorMsg); 
              setTransientStatus(null);
            } else {
              // The LaunchSuccessful event should ideally handle this.
              // If that event is missed for some reason, this polling logic might still show success.
              // To prevent double messaging, we might remove this 'else' block if LaunchSuccessful is robust.
              console.log("[LaunchButton] Polling: Launch task finished successfully (fallback). Consider relying on LaunchSuccessful event.");
              // setDetailedStatusMessage(null); 
              // setTransientStatus({ message: "ERFOLGREICH GESTARTET! (Poll)", color: "text-green-400" });
              // setTimeout(() => setTransientStatus(null), 3000); 
            }
          }
        } catch (err: any) {
          console.error("[LaunchButton] Error during polling is_profile_launching:", err);
          const pollErrorMsg = err.message || err.toString() || "Fehler beim Prüfen des Profilstatus.";
          toast.error(`Polling-Fehler: ${pollErrorMsg}`);
          setIsLaunching(false); 
          setDetailedStatusMessage(pollErrorMsg);
          setTransientStatus(null);
          clearPolling();
        }
      }, 1500);
    } else {
      clearPolling(); // Stop polling if not launching or no version selected
    }

    return clearPolling; // Cleanup on unmount or when dependencies change
  }, [selectedVersion, isLaunching]);

  // Effect for initializing profile state (less frequent updates)
  useEffect(() => {
    if (selectedVersion) {
      initializeProfile(selectedVersion);
      // Check initial running state (could be simplified or integrated with polling start)
      ProcessService.isMinecraftRunning(selectedVersion)
        .then((isRunning) => {
          if (isRunning && !isLaunching) {
            // Potentially set isLaunching to true if MC is already running and we want STOP button
            // console.log("[LaunchButton] Game already running on init, setting UI to STOP mode");
            // setIsLaunching(true); 
          } else if (!isRunning && isLaunching) {
             // This case is now handled by the new polling logic if isLaunching was true
          }
        })
        .catch(() => {
          if(isLaunching) setIsLaunching(false); // If check fails while launching, assume not running
        });
    }
  }, [selectedVersion, initializeProfile]);

  const handleLaunch = async () => {
    if (!selectedVersion) return;

    if (isLaunching) {
      try {
        await ProcessService.abort(selectedVersion);
      } catch (err: any) {
        console.error("Failed to abort launch:", err);
        const abortErrorMsg = typeof err === 'string' ? err : (err.message || err.toString() || "Fehler beim Abbrechen.");
        toast.error(`Abbruch fehlgeschlagen: ${abortErrorMsg}`);
      } finally {
        setIsLaunching(false); 
        setDetailedStatusMessage(null);
        setTransientStatus(null); 
      }
      return;
    }

    setIsLaunching(true);
    setDetailedStatusMessage("Starte Profil..."); 
    setTransientStatus(null); 
    if (selectedVersion) {
      resetLaunchState(selectedVersion);
    }

    try {
      await ProcessService.launch(selectedVersion);
    } catch (err: any) {
      console.error("Failed to launch profile:", err);
      const launchErrorMsg = typeof err === 'string' ? err : (err.message || err.toString() || "Unbekannter Fehler beim Start.");
      toast.error(`Start fehlgeschlagen: ${launchErrorMsg}`);
      if (selectedVersion) {
        setLaunchError(selectedVersion, launchErrorMsg);
      }
      setIsLaunching(false);
      setDetailedStatusMessage(launchErrorMsg); 
      setTransientStatus(null); 
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
    } 
    return <Icon icon="solar:play-bold" width="24" height="24" />;
  };

  const getMainButtonText = () => {
    if (isLaunching) {
      return "STOP";
    }
    return "LAUNCH";
  };
  
  const getButtonVariant = () => {
    if (isLaunching) {
      return "destructive";
    }
    return "default";
  };

  return (
    <div
      className={cn("relative flex flex-col justify-center", className)}
      style={{ maxWidth }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 relative">
          <Button
            onClick={handleLaunch}
            disabled={!selectedVersion}
            size="lg"
            icon={getMainButtonIcon()}
            className="flex-1"
          >
            {getMainButtonText()}
          </Button>

          <IconButton
            onClick={handleOpenModal}
            disabled={isLaunching || !versions || versions.length === 0}
            colorScheme="secondary"
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
        
        {(isLaunching || transientStatus) && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 flex justify-center"
          >
            <p 
              className={cn(
                "text-2xl font-minecraft lowercase whitespace-nowrap",
                transientStatus ? transientStatus.color : "text-gray-300" 
              )}
              title={
                transientStatus?.message ||
                detailedStatusMessage ||
                currentStep ||
                (isLaunching ? "Wird gestartet..." : "")
              } 
            >
              {transientStatus?.message ||
                detailedStatusMessage ||
                currentStep ||
                (isLaunching ? "Wird gestartet..." : "")}
            </p>
          </div>
        )}
      </div>

      {versions && (
        <ProfileSelectionModal
          onVersionChange={handleVersionChange}
          title="Select Version"
        />
      )}
    </div>
  );
}
