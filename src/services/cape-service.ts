import { invoke } from '@tauri-apps/api/core';
import type { CapesBrowseResponse, BrowseCapesOptions, GetPlayerCapesOptions } from '../types/noriskCapes';

/**
 * Browse capes with optional parameters
 * 
 * @param options Options for browsing capes including pagination, filtering and sorting
 * @returns A promise that resolves to a CapesBrowseResponse
 */
export const browseCapes = (options: BrowseCapesOptions = {}): Promise<CapesBrowseResponse> => {
  return invoke('browse_capes', {
    page: options.page,
    page_size: options.page_size,
    sort_by: options.sort_by,
    filter_has_elytra: options.filter_has_elytra,
    filter_creator: options.filter_creator,
    time_frame: options.time_frame,
    norisk_token: options.norisk_token,
    request_uuid: options.request_uuid
  });
};

/**
 * Get capes for a specific player
 * 
 * @param player_uuid UUID of the player
 * @param options Options for retrieving player capes including pagination and filtering
 * @returns A promise that resolves to a CapesBrowseResponse
 */
export const getPlayerCapes = (
  player_uuid: string,
  options: GetPlayerCapesOptions = {}
): Promise<CapesBrowseResponse> => {
  return invoke('get_player_capes', {
    player_uuid,
    page: options.page,
    page_size: options.page_size,
    filter_accepted: options.filter_accepted,
    norisk_token: options.norisk_token,
    request_uuid: options.request_uuid
  });
};

/**
 * Equip a specific cape for a player
 * 
 * @param cape_hash Hash of the cape to equip
 * @param norisk_token Optional NoRisk token
 * @param player_uuid Optional UUID of the player (defaults to active account)
 * @returns A promise that resolves when the cape is equipped
 */
export const equipCape = (
  cape_hash: string,
  norisk_token?: string,
  player_uuid?: string
): Promise<void> => {
  return invoke('equip_cape', {
    cape_hash,
    norisk_token,
    player_uuid
  });
};

/**
 * Delete a specific cape owned by the player
 * 
 * @param cape_hash Hash of the cape to delete
 * @param norisk_token Optional NoRisk token
 * @param player_uuid Optional UUID of the player (defaults to active account)
 * @returns A promise that resolves when the cape is deleted
 */
export const deleteCape = (
  cape_hash: string,
  norisk_token?: string,
  player_uuid?: string
): Promise<void> => {
  return invoke('delete_cape', {
    cape_hash,
    norisk_token,
    player_uuid
  });
};

/**
 * Upload a new cape image for the active player
 * 
 * @param image_path Path to the cape image file (PNG)
 * @param norisk_token Optional NoRisk token
 * @param player_uuid Optional UUID of the player (defaults to active account)
 * @returns A promise that resolves to the cape hash of the uploaded cape
 */
export const uploadCape = (
  image_path: string,
  norisk_token?: string,
  player_uuid?: string
): Promise<string> => {
  return invoke('upload_cape', {
    image_path,
    norisk_token,
    player_uuid
  });
};

/**
 * Unequip the currently equipped cape for the active player
 * 
 * @param norisk_token Optional NoRisk token
 * @param player_uuid Optional UUID of the player (defaults to active account)
 * @returns A promise that resolves when the cape is unequipped
 */
export const unequipCape = (
  norisk_token?: string,
  player_uuid?: string
): Promise<void> => {
  return invoke('unequip_cape', {
    norisk_token,
    player_uuid
  });
}; 