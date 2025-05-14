import { invoke } from '@tauri-apps/api/core';
import type { UninstallContentPayload } from '../types/content';

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