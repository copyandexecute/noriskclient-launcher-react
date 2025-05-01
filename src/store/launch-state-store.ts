import { create } from "zustand";
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

interface LaunchStateStore {
  profileStates: Record<
    string,
    {
      launchState: LaunchState;
      launchProgress: number;
      currentStep: string;
      error: string | null;
      logHistory: string[];
    }
  >;

  initializeProfile: (profileId: string) => void;
  setProfileLaunchState: (profileId: string, state: LaunchState) => void;
  setProfileLaunchProgress: (profileId: string, progress: number) => void;
  setProfileCurrentStep: (profileId: string, step: string) => void;
  setProfileError: (profileId: string, error: string | null) => void;
  addProfileLogEntry: (profileId: string, log: string) => void;
  launchProfile: (profileId: string) => Promise<void>;
  abortProfileLaunch: (profileId: string) => Promise<void>;

  getProfileState: (profileId: string) => {
    launchState: LaunchState;
    launchProgress: number;
    currentStep: string;
    error: string | null;
    logHistory: string[];
  };
}

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
          get().setProfileLaunchState(profileId, LaunchState.IDLE);
          get().addProfileLogEntry(profileId, "Game has started");
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
        const isLaunching = await ProfileService.isProfileLaunching(profileId);

        const currentState = get().getProfileState(profileId).launchState;

        if (isLaunching && currentState !== LaunchState.LAUNCHING) {
          get().setProfileLaunchState(profileId, LaunchState.LAUNCHING);
        } else if (!isLaunching && currentState === LaunchState.LAUNCHING) {
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
            [profileId]: {
              launchState: LaunchState.IDLE,
              launchProgress: 0,
              currentStep: "",
              error: null,
              logHistory: [],
            },
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
            ...(store.profileStates[profileId] || {
              launchProgress: 0,
              currentStep: "",
              error: null,
              logHistory: [],
            }),
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
            ...(store.profileStates[profileId] || {
              launchState: LaunchState.IDLE,
              currentStep: "",
              error: null,
              logHistory: [],
            }),
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
            ...(store.profileStates[profileId] || {
              launchState: LaunchState.IDLE,
              launchProgress: 0,
              error: null,
              logHistory: [],
            }),
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
            ...(store.profileStates[profileId] || {
              launchState: LaunchState.IDLE,
              launchProgress: 0,
              currentStep: "",
              logHistory: [],
            }),
            error,
          },
        },
      }));
    },

    addProfileLogEntry: (profileId, log) => {
      set((store) => {
        const currentState = store.profileStates[profileId] || {
          launchState: LaunchState.IDLE,
          launchProgress: 0,
          currentStep: "",
          error: null,
          logHistory: [],
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

    launchProfile: async (profileId) => {
      try {
        get().setProfileError(profileId, null);
        get().setProfileLaunchState(profileId, LaunchState.LAUNCHING);
        get().setProfileCurrentStep(profileId, "Starting launch process...");
        get().addProfileLogEntry(profileId, "Starting launch process...");

        await ProfileService.launchProfile(profileId);

        processMonitor.startMonitoring(profileId);
      } catch (err) {
        get().setProfileError(profileId, "Failed to launch profile");
        get().setProfileLaunchState(profileId, LaunchState.ERROR);

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

        await ProfileService.abortProfileLaunch(profileId);

        get().setProfileLaunchState(profileId, LaunchState.IDLE);
      } catch (err) {
        get().setProfileError(profileId, "Failed to abort launch");
        get().setProfileLaunchState(profileId, LaunchState.IDLE);
      }
    },

    getProfileState: (profileId) => {
      return (
        get().profileStates[profileId] || {
          launchState: LaunchState.IDLE,
          launchProgress: 0,
          currentStep: "",
          error: null,
          logHistory: [],
        }
      );
    },
  };
});
