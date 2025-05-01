"use client";

import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { EventPayload } from "../types/events";
import { EventType } from "../types/events";
import * as ProfileService from "../services/profile-service";
import { processMonitor } from "../services/process-monitor";

export enum LaunchState {
  IDLE = "idle",
  LAUNCHING = "launching",
  ERROR = "error",
}

export function useLaunchState(profileId: string) {
  const [launchState, setLaunchState] = useState<LaunchState>(LaunchState.IDLE);
  const [launchProgress, setLaunchProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [logHistory, setLogHistory] = useState<string[]>([]);

  const profileIdRef = useRef<string>(profileId);

  useEffect(() => {
    profileIdRef.current = profileId;
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const unlistenPromises: Promise<() => void>[] = [];

    const stateEventPromise = listen<EventPayload>("state_event", (event) => {
      handleEvent(event.payload);
    });
    unlistenPromises.push(stateEventPromise);

    const eventPromise = listen<EventPayload>("event", (event) => {
      handleEvent(event.payload);
    });
    unlistenPromises.push(eventPromise);

    const processExitPromise = listen("minecraft_process_exited", (event) => {
      const payload = event.payload as any;
      if (payload.profile_id === profileId) {
        console.log(
          `[useLaunchState] Minecraft process exited for profile ${profileId}`,
        );
        setLaunchState(LaunchState.IDLE);
        addToLogHistory("Minecraft process exited");
      }
    });
    unlistenPromises.push(processExitPromise);

    checkProfileState();

    const intervalId = setInterval(() => {
      if (profileIdRef.current) {
        checkProfileState();
      }
    }, 1000);

    return () => {
      unlistenPromises.forEach((promise) => {
        promise.then((unlisten) => unlisten());
      });
      clearInterval(intervalId);
    };
  }, [profileId]);

  const checkProfileState = async () => {
    const currentProfileId = profileIdRef.current;

    if (!currentProfileId) {
      console.log(
        "[useLaunchState] No profileId provided, skipping state check",
      );
      return;
    }

    try {
      const isLaunching =
        await ProfileService.isProfileLaunching(currentProfileId);

      console.log(
        `[useLaunchState] Profile ${currentProfileId} state: launching=${isLaunching}, current=${launchState}`,
      );

      if (isLaunching) {
        if (launchState !== LaunchState.LAUNCHING) {
          setLaunchState(LaunchState.LAUNCHING);
        }
      } else {
        if (
          launchState !== LaunchState.IDLE &&
          launchState !== LaunchState.ERROR
        ) {
          console.log(
            `[useLaunchState] Setting state to IDLE for profile ${currentProfileId}`,
          );
          setLaunchState(LaunchState.IDLE);
        }
      }
    } catch (err) {
      console.error("Error checking profile state:", err);
    }
  };

  const handleEvent = (payload: EventPayload) => {
    if (payload.target_id === profileId) {
      if (payload.message) {
        setCurrentStep(payload.message);
        addToLogHistory(payload.message);
      }

      if (payload.progress !== null && payload.progress !== undefined) {
        setLaunchProgress(payload.progress);
      }

      if (payload.event_type) {
        const eventType = payload.event_type.toLowerCase();

        if (eventType === EventType.MinecraftOutput.toLowerCase()) {
          console.log(
            `[useLaunchState] Minecraft started for profile ${profileId}, setting state to IDLE`,
          );
          setLaunchState(LaunchState.IDLE);
        } else if (
          eventType === EventType.MinecraftProcessExited.toLowerCase()
        ) {
          setLaunchState(LaunchState.IDLE);
        } else if (eventType === EventType.Error.toLowerCase()) {
          setError(payload.error || "Unknown error");
          setLaunchState(LaunchState.ERROR);

          setTimeout(() => {
            setLaunchState(LaunchState.IDLE);
            setError(null);
          }, 5000);
        } else if (
          eventType === EventType.LaunchingMinecraft.toLowerCase() ||
          eventType === EventType.InstallingJava.toLowerCase() ||
          eventType === EventType.DownloadingLibraries.toLowerCase() ||
          eventType === EventType.DownloadingAssets.toLowerCase() ||
          eventType === EventType.DownloadingClient.toLowerCase()
        ) {
          setLaunchState(LaunchState.LAUNCHING);
        }
      }
    }
  };

  const addToLogHistory = (message: string) => {
    setLogHistory((prev) => {
      const newHistory = [...prev, message];
      if (newHistory.length > 100) {
        return newHistory.slice(newHistory.length - 100);
      }
      return newHistory;
    });
  };

  const launchProfile = async () => {
    try {
      setError(null);
      setLaunchState(LaunchState.LAUNCHING);
      setCurrentStep("Starting launch process...");
      addToLogHistory("Starting launch process...");

      await ProfileService.launchProfile(profileId);

      processMonitor.startMonitoring(profileId);
    } catch (err) {
      console.error("Error launching profile:", err);
      setError("Failed to launch profile");
      setLaunchState(LaunchState.ERROR);

      setTimeout(() => {
        setLaunchState(LaunchState.IDLE);
        setError(null);
      }, 5000);
    }
  };

  const abortLaunch = async () => {
    try {
      setCurrentStep("Aborting launch process...");
      addToLogHistory("Aborting launch process...");

      await ProfileService.abortProfileLaunch(profileId);

      setLaunchState(LaunchState.IDLE);
    } catch (err) {
      console.error("Error aborting launch:", err);
      setError("Failed to abort launch");

      setLaunchState(LaunchState.IDLE);
    }
  };

  return {
    launchState,
    launchProgress,
    currentStep,
    error,
    logHistory,
    launchProfile,
    abortLaunch,
  };
}
