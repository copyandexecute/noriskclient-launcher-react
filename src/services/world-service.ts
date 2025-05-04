import { invoke } from "@tauri-apps/api/core";

// Import necessary types (adjust paths if needed)
import type {
    WorldInfo,
    ServerInfo,
    ServerPingInfo
} from '../types/minecraft';
import type {
    CopyWorldParams // Assuming this is defined in profile types
} from '../types/profile';

/**
 * Fetches the list of servers associated with a specific profile.
 */
export const getServersForProfile = (profileId: string): Promise<ServerInfo[]> => {
  console.debug(`[WorldService] Fetching servers for profile: ${profileId}`);
  return invoke('get_servers_for_profile', { profileId });
};

/**
 * Fetches the list of worlds associated with a specific profile.
 */
export const getWorldsForProfile = (profileId: string): Promise<WorldInfo[]> => {
  console.debug(`[WorldService] Fetching worlds for profile: ${profileId}`);
  return invoke('get_worlds_for_profile', { profileId });
};

/**
 * Pings a Minecraft server to get its status.
 */
export const pingMinecraftServer = (address: string): Promise<ServerPingInfo> => {
  console.debug(`[WorldService] Pinging server: ${address}`);
  return invoke('ping_minecraft_server', { address });
};

/**
 * Copies a world from one profile to another (or within the same profile).
 */
export const copyWorld = (params: CopyWorldParams): Promise<string> => {
  console.debug(`[WorldService] Copying world: ${params.source_world_folder} to profile ${params.target_profile_id} as ${params.target_world_name}`);
  return invoke('copy_world', { params });
};

/**
 * Deletes a specific world from a profile.
 */
export const deleteWorld = (profileId: string, worldFolder: string): Promise<void> => {
  console.debug(`[WorldService] Deleting world: ${worldFolder} from profile ${profileId}`);
  return invoke('delete_world', { profileId, worldFolder });
}; 