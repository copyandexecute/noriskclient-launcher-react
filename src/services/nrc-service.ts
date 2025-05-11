import { invoke } from '@tauri-apps/api/core';
import type { BlogPost } from '../types/wordPress';

/**
 * Fetches the latest news and changelog posts from the backend.
 *
 * @returns A promise that resolves to an array of BlogPost objects.
 * @throws If the backend command fails.
 */
export const fetchNewsAndChangelogs = (): Promise<BlogPost[]> => {
  // Directly invoke and return the promise. Errors will propagate to the caller.
  return invoke('get_news_and_changelogs_command');
};

/**
 * Triggers a refresh of the Norisk packs configuration from the backend.
 *
 * @returns A promise that resolves when the refresh is complete.
 * @throws If the backend command fails.
 */
export const refreshNoriskPacks = (): Promise<void> => {
  return invoke('refresh_norisk_packs');
};

/**
 * Triggers a refresh of the standard versions configuration from the backend.
 *
 * @returns A promise that resolves when the refresh is complete.
 * @throws If the backend command fails.
 */
export const refreshStandardVersions = (): Promise<void> => {
  return invoke('refresh_standard_versions');
};

/**
 * Refreshes both Norisk packs and standard versions configurations.
 * Logs success or errors to the console.
 */
export const refreshNrcDataOnMount = async (): Promise<void> => {
  try {
    await refreshNoriskPacks();
    console.log("Norisk Packs updated successfully on mount!");
  } catch (error) {
    console.error("Failed to refresh Norisk Packs on mount:", error);
  }

  try {
    await refreshStandardVersions();
    console.log("Standard Versions updated successfully on mount!");
  } catch (error) {
    console.error("Failed to refresh Standard Versions on mount:", error);
  }
}; 