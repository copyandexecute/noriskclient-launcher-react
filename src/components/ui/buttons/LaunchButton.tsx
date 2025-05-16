import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { Button } from "./Button";
import { toast } from "react-hot-toast";
import { listen } from "@tauri-apps/api/event";
import { EventPayload, EventType } from "../../../types/events";
import * as ProcessService from "../../../services/process-service";
import * as ProfileService from "../../../services/profile-service";

interface LaunchButtonProps {
  id: string;
  name: string;
  buttonText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "secondary" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  onStatusChange?: (isLaunching: boolean) => void;
  quickPlaySingleplayer?: string;
  quickPlayMultiplayer?: string;
}

export function LaunchButton({
  id,
  name,
  buttonText = "LAUNCH GAME",
  cancelText = "CANCEL",
  variant = "default",
  size = "md",
  className,
  disabled = false,
  onStatusChange,
  quickPlaySingleplayer,
  quickPlayMultiplayer,
}: LaunchButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isButtonDisabledBriefly, setIsButtonDisabledBriefly] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isLaunching);
    }
  }, [isLaunching, onStatusChange]);

  useEffect(() => {
    console.log(`[LaunchButton ${id}] Setting up state_event listener.`);
    let isMounted = true;

    const handleStateEvent = (event: any) => {
      if (!isMounted) return;
      const payload = event.payload as EventPayload;

      if (payload.target_id === id) {
        if (payload.event_type === EventType.LaunchSuccessful) {
          console.log(`[LaunchButton ${id}] Event: LaunchSuccessful`);
          toast.success(`Profile '${name}' launched successfully!`);
          stopPolling();
          resetButtonState();
        } else if (payload.event_type === EventType.Error) {
          const errorMessage =
            payload.message || "An unknown error occurred during launch.";
          console.error(
            `[LaunchButton ${id}] Event: Error - ${errorMessage}`,
          );
          toast.error(errorMessage);
          stopPolling();
          resetButtonState();
        }
      }
    };

    const unlistenPromise = listen<EventPayload>(
      "state_event",
      handleStateEvent,
    );

    const cleanup = async () => {
      console.log(
        `[LaunchButton ${id}] Cleaning up state_event listener.`,
      );
      isMounted = false;
      try {
        const unlisten = await unlistenPromise;
        unlisten();
      } catch (error) {
        console.error(
          `[LaunchButton ${id}] Error during state_event listener cleanup:`,
          error,
        );
      }
    };

    return () => {
      cleanup();
    };
  }, [id, name]);

  useEffect(() => {
    if (!id) return;

    if (isLaunching) {
      console.log(
        `[LaunchButton ${id}] Starting polling for is_profile_launching.`,
      );
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const isStillLaunchingBackend =
            await ProfileService.isProfileLaunching(id);
          if (!isStillLaunchingBackend) {
            console.log(
              `[LaunchButton ${id}] Polling: Backend reports profile is NOT launching. Resetting UI.`,
            );
            stopPolling();
            resetButtonState();
          }
        } catch (err: any) {
          console.error(
            `[LaunchButton ${id}] Error during is_profile_launching polling:`,
            err,
          );
          toast.error(`Polling error: ${err.message || "Unknown error"}`);
          stopPolling();
          resetButtonState();
        }
      }, 2000);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [id, isLaunching]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log(
        `[LaunchButton ${id}] Polling for is_profile_launching stopped.`,
      );
    }
  };

  const resetButtonState = () => {
    setIsButtonDisabledBriefly(true);
    setTimeout(() => {
      setIsLaunching(false);
      setIsButtonDisabledBriefly(false);
    }, 300);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;

    if (isLaunching) {
      try {
        await ProcessService.abort(id);
        toast.success("Launch cancellation requested.");
      } catch (error) {
        console.error("Failed to request launch cancellation:", error);
        const message =
          error instanceof Error ? error.message : "Failed to cancel launch";
        toast.error(`Cancellation request failed: ${message}`);
      } finally {
        console.log(
          `[LaunchButton ${id}] User clicked CANCEL. Resetting UI immediately.`,
        );
        stopPolling();
        resetButtonState();
      }
      return;
    }

    console.log(
      `[LaunchButton ${id}] Initiating new launch. Resetting states.`,
    );
    setIsLaunching(true);

    try {
      await ProcessService.launch(id, quickPlaySingleplayer, quickPlayMultiplayer);
      
      if (quickPlaySingleplayer || quickPlayMultiplayer) {
        console.warn("Quick play options are not yet implemented in the backend");
      }
    } catch (error) {
      console.error("Failed to initiate launch:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to launch";
      toast.error(`Launch initiation failed: ${errorMessage}`);
      stopPolling();
      resetButtonState();
    }
  };

  return (
    <Button
      onClick={handlePlay}
      variant={isLaunching ? "destructive" : variant}
      size={size}
      className={className}
      disabled={disabled || isButtonDisabledBriefly}
      icon={
        isLaunching ? (
          <Icon
            icon="eos-icons:loading"
            className="w-5 h-5 text-white"
          />
        ) : (
          <Icon icon="solar:play-bold" className="w-4 h-4 text-white" />
        )
      }
    >
      {isLaunching ? cancelText : buttonText}
    </Button>
  );
} 