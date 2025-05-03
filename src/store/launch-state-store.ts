import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type { EventPayload } from "../types/events";
import { EventType } from "../types/events";
import * as ProcessService from "../services/process-service";
import * as ProfileService from "../services/profile-service";
import { processMonitor } from "../services/process-monitor";

export enum LaunchState {
  IDLE = "idle",
  LAUNCHING = "launching",
  ERROR = "error",
}

interface ProfileStateData {
  launchState: LaunchState;
  launchProgress: number;
  currentStep: string;
  error: string | null;
  logHistory: string[];
}

interface LaunchStateStore {
  profileStates: Record<string, ProfileStateData>;

  initializeProfile: (profileId: string) => void;
  setProfileLaunchState: (profileId: string, state: LaunchState) => void;
  setProfileLaunchProgress: (profileId: string, progress: number) => void;
  setProfileCurrentStep: (profileId: string, step: string) => void;
  setProfileError: (profileId: string, error: string | null) => void;
  addProfileLogEntry: (profileId: string, log: string) => void;
  addDebugLog: (message: string) => void;
  setLaunchState: (state: string) => void;
  launchProfile: (profileId: string) => Promise<void>;
  abortProfileLaunch: (profileId: string) => Promise<void>;
  getProfileState: (profileId: string) => ProfileStateData;
  isLaunching: (profileId: string) => boolean;
}

const defaultProfileState: ProfileStateData = {
  launchState: LaunchState.IDLE,
  launchProgress: 0,
  currentStep: "",
  error: null,
  logHistory: [],
};
// @ts-ignore
export const useLaunchStateStore = create<LaunchStateStore>((set, get) => {
  const setupEventListeners = async (profileId: string) => {
    listen<EventPayload>("state_event", (event) => {
      handleEvent(profileId, event.payload);
    });

    listen<EventPayload>("event", (event) => {
      handleEvent(profileId, event.payload);
    });

    listen("minecraft_process_exited", (event) => {
      const payload = event.payload as any;
      if (payload.profile_id === profileId) {
        get().setProfileLaunchState(profileId, LaunchState.IDLE);
        get().addProfileLogEntry(profileId, "Minecraft process exited");
      }
    });

    startPolling(profileId);
  };

  const handleEvent = (profileId: string, payload: EventPayload) => {
    if (payload.target_id === profileId) {
      if (payload.message) {
        get().setProfileCurrentStep(profileId, payload.message);
        get().addProfileLogEntry(profileId, payload.message);
      }

      if (payload.progress !== null && payload.progress !== undefined) {
        get().setProfileLaunchProgress(profileId, payload.progress);
      }

      if (payload.event_type) {
        const eventType = payload.event_type.toLowerCase();

        if (eventType === EventType.MinecraftOutput.toLowerCase()) {
          get().addProfileLogEntry(profileId, "Game has started");
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
        } else if (
          eventType === EventType.MinecraftProcessExited.toLowerCase()
        ) {
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
          get().addProfileLogEntry(profileId, "Minecraft process exited");
        } else if (eventType === EventType.Error.toLowerCase()) {
          get().setProfileError(profileId, payload.error || "Unknown error");
          get().setProfileLaunchState(profileId, LaunchState.ERROR);

          setTimeout(() => {
            get().setProfileLaunchState(profileId, LaunchState.IDLE);
            get().setProfileError(profileId, null);
          }, 5000);
        } else if (
          eventType === EventType.LaunchingMinecraft.toLowerCase() ||
          eventType === EventType.InstallingJava.toLowerCase() ||
          eventType === EventType.DownloadingLibraries.toLowerCase() ||
          eventType === EventType.DownloadingAssets.toLowerCase() ||
          eventType === EventType.DownloadingClient.toLowerCase()
        ) {
          get().setProfileLaunchState(profileId, LaunchState.LAUNCHING);
        }
      }
    }
  };

  const startPolling = (profileId: string) => {
    const checkProfileState = async () => {
      try {
        const isRunning = await ProcessService.isMinecraftRunning(profileId);
        const currentState = get().getProfileState(profileId).launchState;

        if (isRunning && currentState === LaunchState.IDLE) {
        } else if (!isRunning && currentState === LaunchState.LAUNCHING) {
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
        }
      } catch (err) {}
    };

    checkProfileState();
    const intervalId = setInterval(checkProfileState, 1000);
    return intervalId;
  };

  return {
    profileStates: {},

    initializeProfile: (profileId) => {
      if (!get().profileStates[profileId]) {
        set((state) => ({
          profileStates: {
            ...state.profileStates,
            [profileId]: { ...defaultProfileState },
          },
        }));

        setupEventListeners(profileId);
      }
    },

    setProfileLaunchState: (profileId, state) => {
      set((store) => ({
        profileStates: {
          ...store.profileStates,
          [profileId]: {
            ...(store.profileStates[profileId] || { ...defaultProfileState }),
            launchState: state,
          },
        },
      }));
    },

    setProfileLaunchProgress: (profileId, progress) => {
      set((store) => ({
        profileStates: {
          ...store.profileStates,
          [profileId]: {
            ...(store.profileStates[profileId] || { ...defaultProfileState }),
            launchProgress: progress,
          },
        },
      }));
    },

    setProfileCurrentStep: (profileId, step) => {
      set((store) => ({
        profileStates: {
          ...store.profileStates,
          [profileId]: {
            ...(store.profileStates[profileId] || { ...defaultProfileState }),
            currentStep: step,
          },
        },
      }));
    },

    setProfileError: (profileId, error) => {
      set((store) => ({
        profileStates: {
          ...store.profileStates,
          [profileId]: {
            ...(store.profileStates[profileId] || { ...defaultProfileState }),
            error,
          },
        },
      }));
    },

    addProfileLogEntry: (profileId, log) => {
      set((store) => {
        const currentState = store.profileStates[profileId] || {
          ...defaultProfileState,
        };
        const newLogHistory = [...currentState.logHistory, log];

        if (newLogHistory.length > 100) {
          newLogHistory.shift();
        }

        return {
          profileStates: {
            ...store.profileStates,
            [profileId]: {
              ...currentState,
              logHistory: newLogHistory,
            },
          },
        };
      });
    },

    addDebugLog: (message) => {
      console.log(`[DEBUG] ${message}`);
    },

    launchProfile: async (profileId) => {
      try {
        get().setProfileError(profileId, null);
        get().setProfileLaunchState(profileId, LaunchState.LAUNCHING);
        get().setProfileCurrentStep(profileId, "Starting launch process...");
        get().addProfileLogEntry(profileId, "Starting launch process...");

        await ProfileService.launchProfile(profileId);
        processMonitor.startMonitoring(profileId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        get().setProfileError(profileId, errorMessage);
        get().setProfileLaunchState(profileId, LaunchState.ERROR);
        get().addProfileLogEntry(profileId, `Error: ${errorMessage}`);

        setTimeout(() => {
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
          get().setProfileError(profileId, null);
        }, 5000);
      }
    },

    abortProfileLaunch: async (profileId) => {
      try {
        get().setProfileCurrentStep(profileId, "Aborting launch process...");
        get().addProfileLogEntry(profileId, "Aborting launch process...");

        await ProcessService.killMinecraft(profileId);
        processMonitor.stopMonitoring();

        get().setProfileLaunchState(profileId, LaunchState.IDLE);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        get().setProfileError(profileId, `Failed to abort: ${errorMessage}`);
        get().addProfileLogEntry(profileId, `Error aborting: ${errorMessage}`);

        setTimeout(() => {
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
          get().setProfileError(profileId, null);
        }, 5000);
      }
    },

    getProfileState: (profileId) => {
      return get().profileStates[profileId] || { ...defaultProfileState };
    },

    isLaunching: (profileId) => {
      const state = get().getProfileState(profileId);
      return state.launchState === LaunchState.LAUNCHING;
    },
  };
});
