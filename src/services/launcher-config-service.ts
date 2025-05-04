import { invoke } from "@tauri-apps/api/core";
import type { LauncherConfig } from "../types/launcherConfig";

/**
 * Fetches the current launcher configuration from the backend.
 * @returns A promise that resolves with the LauncherConfig.
 */
export async function getLauncherConfig(): Promise<LauncherConfig> {
  try {
    const config = await invoke<LauncherConfig>("get_launcher_config");
    console.log("[LauncherConfigService] Fetched config:", config);
    return config;
  } catch (error) {
    console.error("[LauncherConfigService] Failed to get launcher config:", error);
    // Consider re-throwing or returning a default/error state depending on desired error handling
    throw error; 
  }
}

/**
 * Saves the provided launcher configuration to the backend.
 * @param config The LauncherConfig object to save.
 * @returns A promise that resolves with the saved (potentially updated) LauncherConfig.
 */
export async function setLauncherConfig(config: LauncherConfig): Promise<LauncherConfig> {
   try {
    const updatedConfig = await invoke<LauncherConfig>("set_launcher_config", {
      config: config, // Pass the config object under the 'config' key
    });
    console.log("[LauncherConfigService] Saved config:", updatedConfig);
    return updatedConfig;
  } catch (error) {
    console.error("[LauncherConfigService] Failed to set launcher config:", error);
    // Consider re-throwing or returning the original config depending on desired error handling
    throw error;
  }
} 