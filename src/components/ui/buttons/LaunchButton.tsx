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
  isIconOnly?: boolean;
  forceDisplaySpinner?: boolean;
  onInternalLaunchStateChange?: (isLaunching: boolean) => void;
  onEventMessage?: (message: string | null) => void;
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
  isIconOnly = false,
  forceDisplaySpinner = false,
  onInternalLaunchStateChange,
  onEventMessage,
}: LaunchButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isButtonDisabledBriefly, setIsButtonDisabledBriefly] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isActive = true;
    if (id) {
      ProfileService.isProfileLaunching(id)
        .then((currentlyLaunching) => {
          if (isActive) {
            setIsLaunching(currentlyLaunching);
          }
        })
        .catch((err) => {
          if (isActive) {
            console.error(
              `[LaunchButton ${id}] Error checking initial launch state:`, 
              err
            );
            setIsLaunching(false); 
          }
        });
    }
    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isLaunching);
    }
    if (onInternalLaunchStateChange) {
      onInternalLaunchStateChange(isLaunching);
    }
  }, [isLaunching, onStatusChange, onInternalLaunchStateChange]);

  useEffect(() => {
    console.log(`[LaunchButton ${id}] Setting up state_event listener.`);
    let isMounted = true;

    const handleStateEvent = (event: any) => {
      if (!isMounted) return;
      const payload = event.payload as EventPayload;

      if (payload.target_id === id) {
        if (payload.message && onEventMessage) {
          onEventMessage(payload.message);
        }

        if (payload.event_type === EventType.LaunchSuccessful) {
          console.log(`[LaunchButton ${id}] Event: LaunchSuccessful`);
          toast.success(`Profile '${name}' launched successfully!`);
          stopPolling();
          resetButtonState();
          if (onEventMessage) onEventMessage(null);
        } else if (payload.event_type === EventType.Error) {
          const errorMessage =
            payload.message || "An unknown error occurred during launch.";
          console.error(
            `[LaunchButton ${id}] Event: Error - ${errorMessage}`,
          );
          toast.error(errorMessage);
          stopPolling();
          resetButtonState();
          if (!payload.message && onEventMessage) onEventMessage(null);
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
  }, [id, name, onEventMessage]);

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

  if (isIconOnly) {
    const iconToShow = forceDisplaySpinner || isLaunching ? (
      <Icon icon="eos-icons:loading" width="60%" height="60%" />
    ) : (
      <Icon icon="solar:play-bold" width="60%" height="60%" />
    );

    return (
      <div
        onClick={!disabled && !isButtonDisabledBriefly ? handlePlay : undefined}
        className={`flex w-full h-full items-center justify-center ${
          (disabled || isButtonDisabledBriefly) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${className || ""}`}
        role="button"
        aria-label={forceDisplaySpinner || isLaunching ? `Cancel launch for ${name}` : `Launch ${name}`}
        aria-disabled={disabled || isButtonDisabledBriefly}
        tabIndex={disabled || isButtonDisabledBriefly ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && !isButtonDisabledBriefly && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handlePlay(e as any); 
          }
        }}
      >
        {iconToShow}
      </div>
    );
  }

  return (
    <Button
      onClick={handlePlay}
      variant={isLaunching ? "destructive" : variant}
      size={size}
      className={className}
      disabled={disabled || isButtonDisabledBriefly}
      icon={
        forceDisplaySpinner || isLaunching ? (
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