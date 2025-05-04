import { invoke } from "@tauri-apps/api/core";
// Import the actual type with corrected path
import type { ProcessMetadata } from "../types/processState";

export async function isMinecraftRunning(profileId: string): Promise<boolean> {
  return invoke<boolean>("is_minecraft_running", { profileId });
}

export async function killMinecraft(profileId: string): Promise<void> {
  return invoke<void>("kill_minecraft", { profileId });
}

export async function launch(profileId: string): Promise<void> {
  return invoke<void>("launch_profile", { id: profileId });
}

export async function abort(profileId: string): Promise<void> {
  return invoke<void>("abort_profile_launch", { profileId });
}

/**
 * Fetches metadata for all currently tracked processes.
 */
export async function getRunningProcesses(): Promise<ProcessMetadata[]> {
  console.debug("[ProcessService] Fetching running processes");
  try {
    // Assuming the Rust command returns Vec<ProcessMetadata>
    const processes = await invoke<ProcessMetadata[]>("get_processes");
    return processes || []; // Return empty array if null/undefined
  } catch (error) {
    console.error("[ProcessService] Failed to get running processes:", error);
    return []; // Return empty on error
  }
}

/**
 * Stops a specific running process by its ID.
 */
export async function stopProcess(processId: string): Promise<void> {
  console.debug(`[ProcessService] Stopping process: ${processId}`);
  try {
    await invoke<void>("stop_process", { processId });
  } catch (error) {
    console.error(`[ProcessService] Failed to stop process ${processId}:`, error);
    // Re-throw or handle as needed
    throw error; 
  }
}
