import { invoke } from '@tauri-apps/api/core';
import type { UninstallContentPayload, ToggleContentPayload, InstallContentPayload } from '../types/content';

/**
 * Uninstalls content from a specified profile based on the provided payload.
 *
 * @param payload - The criteria for uninstallation, such as profile ID and SHA1 hash.
 * @returns A promise that resolves if the uninstallation is successful, or rejects with an error.
 */
export async function uninstallContentFromProfile(
  payload: UninstallContentPayload,
): Promise<void> {
  try {
    await invoke<void>('uninstall_content_from_profile', { payload });
    console.log(
      `Successfully requested content uninstallation for profile ${payload.profile_id} with criteria:`, 
      payload
    );
  } catch (error) {
    console.error(
      `Error uninstalling content for profile ${payload.profile_id} with criteria:`, 
      payload, 
      '\nError:', 
      error
    );
    throw error
  }
}

/**
 * Toggles the enabled state of content within a specified profile.
 *
 * @param payload - The criteria for identifying the content and the desired new state.
 * @returns A promise that resolves if the toggle is successful, or rejects with an error.
 */
export async function toggleContentFromProfile(
  payload: ToggleContentPayload,
): Promise<void> {
  try {
    await invoke<void>('toggle_content_from_profile', { payload });
    console.log(
      `Successfully requested content toggle for profile ${payload.profile_id} to enabled=${payload.enabled} with criteria:`, 
      payload
    );
    // Consider toast: toast.success("Content state updated.");
  } catch (error) {
    console.error(
      `Error toggling content for profile ${payload.profile_id} to enabled=${payload.enabled} with criteria:`, 
      payload, 
      '\nError:', 
      error
    );
    // Consider toast: toast.error(`Failed to update content state: ${error}`);
    throw error;
  }
}

/**
 * Installs content into a specified profile based on the provided payload.
 *
 * @param payload - The details of the content to install.
 * @returns A promise that resolves if the installation request is successful, or rejects with an error.
 */
export async function installContentToProfile(
  payload: InstallContentPayload,
): Promise<void> {
  try {
    await invoke<void>('install_content_to_profile', { payload });
    console.log(
      `Successfully requested content installation for profile ${payload.profile_id}, type: ${payload.content_type}, name: ${payload.content_name || payload.file_name} with criteria:`, 
      payload
    );
    // Consider toast: toast.success("Content installation initiated.");
  } catch (error) {
    console.error(
      `Error installing content for profile ${payload.profile_id}, type: ${payload.content_type}, name: ${payload.content_name || payload.file_name} with criteria:`, 
      payload, 
      '\nError:', 
      error
    );
    // Consider toast: toast.error(`Failed to install content: ${error}`);
    throw error;
  }
} 