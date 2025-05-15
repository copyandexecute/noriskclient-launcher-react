import { create } from "zustand";
import type {
  CreateProfileParams,
  Profile,
  UpdateProfileParams,
  AllProfilesAndLastPlayed,
} from "../types/profile";
import * as ProfileService from "../services/profile-service";

interface ProfileState {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  selectedProfile: Profile | null;
  lastPlayedProfileId: string | null;

  fetchProfiles: () => Promise<void>;
  getProfile: (id: string) => Promise<Profile>;
  createProfile: (params: CreateProfileParams) => Promise<string>;
  updateProfile: (id: string, updates: UpdateProfileParams) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  launchProfile: (id: string) => Promise<void>;
  installProfile: (id: string) => Promise<void>;
  abortProfileLaunch: (id: string) => Promise<void>;
  isProfileLaunching: (id: string) => Promise<boolean>;
  copyProfile: (
    sourceId: string,
    newName: string,
    includeFiles?: string[],
  ) => Promise<string>;
  exportProfile: (
    profileId: string,
    fileName: string,
    includeFiles?: string[],
    openFolder?: boolean,
  ) => Promise<string>;
  setSelectedProfile: (profile: Profile | null) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: true,
  error: null,
  selectedProfile: null,
  lastPlayedProfileId: null,

  fetchProfiles: async () => {
    try {
      set({ error: null });
      const response = await ProfileService.getAllProfilesAndLastPlayed();
      const { all_profiles, last_played_profile_id } = response;

      let newlySelectedProfile: Profile | null = null;
      if (last_played_profile_id) {
        newlySelectedProfile =
          all_profiles.find((p) => p.id === last_played_profile_id) || null;
      }
      
      set({
        profiles: all_profiles,
        lastPlayedProfileId: last_played_profile_id,
        selectedProfile: newlySelectedProfile,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch all profiles and last played:", error);
      set({ error: "Failed to load profiles data", loading: false });
    }
  },

  getProfile: async (id: string) => {
    try {
      const profile = await ProfileService.getProfile(id);
      const { profiles } = get();
      const updatedProfiles = profiles.map((p) => (p.id === id ? profile : p));
      set({ profiles: updatedProfiles });
      return profile;
    } catch (error) {
      console.error(`Failed to get profile ${id}:`, error);
      throw error;
    }
  },

  createProfile: async (params: CreateProfileParams) => {
    try {
      const id = await ProfileService.createProfile(params);
      await get().fetchProfiles();
      return id;
    } catch (error) {
      console.error("Failed to create profile:", error);
      throw error;
    }
  },

  updateProfile: async (id: string, updates: UpdateProfileParams) => {
    try {
      await ProfileService.updateProfile(id, updates);
      const { profiles } = get();
      const updatedProfiles = profiles.map((profile) =>
        profile.id === id ? { ...profile, ...updates } : profile,
      );
      //@ts-ignore
      set({ profiles: updatedProfiles });

      const { selectedProfile } = get();
      if (selectedProfile && selectedProfile.id === id) {
        //@ts-ignore
        set({ selectedProfile: { ...selectedProfile, ...updates } });
      }
    } catch (error) {
      console.error(`Failed to update profile ${id}:`, error);
      throw error;
    }
  },

  deleteProfile: async (id: string) => {
    try {
      await ProfileService.deleteProfile(id);
      set((state) => ({
        profiles: state.profiles.filter((profile) => profile.id !== id),
      }));

      const { selectedProfile } = get();
      if (selectedProfile && selectedProfile.id === id) {
        set({ selectedProfile: null });
      }
    } catch (error) {
      console.error(`Failed to delete profile ${id}:`, error);
      throw error;
    }
  },

  launchProfile: async (id: string) => {
    try {
      await ProfileService.launchProfile(id);
    } catch (error) {
      console.error(`Failed to launch profile ${id}:`, error);
      throw error;
    }
  },

  installProfile: async (id: string) => {
    try {
      //@ts-ignore
      await ProfileService.installProfile(id);
    } catch (error) {
      console.error(`Failed to install profile ${id}:`, error);
      throw error;
    }
  },

  abortProfileLaunch: async (id: string) => {
    try {
      await ProfileService.abortProfileLaunch(id);
    } catch (error) {
      console.error(`Failed to abort profile launch ${id}:`, error);
      throw error;
    }
  },

  isProfileLaunching: async (id: string) => {
    try {
      return await ProfileService.isProfileLaunching(id);
    } catch (error) {
      console.error(`Failed to check if profile ${id} is launching:`, error);
      return false;
    }
  },

  copyProfile: async (
    sourceId: string,
    newName: string,
    includeFiles?: string[],
  ) => {
    try {
      const params = {
        source_profile_id: sourceId,
        new_profile_name: newName,
        include_files: includeFiles,
      };
      const newProfileId = await ProfileService.copyProfile(params);
      await get().fetchProfiles();
      return newProfileId;
    } catch (error) {
      console.error(`Failed to copy profile ${sourceId}:`, error);
      throw error;
    }
  },

  exportProfile: async (
    profileId: string,
    fileName: string,
    includeFiles?: string[],
    openFolder = true,
  ) => {
    try {
      const params = {
        profile_id: profileId,
        file_name: fileName,
        include_files: includeFiles,
        open_folder: openFolder,
      };
      return await ProfileService.exportProfile(params);
    } catch (error) {
      console.error(`Failed to export profile ${profileId}:`, error);
      throw error;
    }
  },

  setSelectedProfile: (profile: Profile | null) => {
    set({ selectedProfile: profile });
  },
}));
