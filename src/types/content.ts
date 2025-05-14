/**
 * Payload for uninstalling content from a profile.
 * Mirrors the Rust struct `UninstallContentPayload`.
 */
export interface UninstallContentPayload {
  profile_id: string; // UUID
  sha1_hash?: string; // Optional SHA1 hash of the content to remove
  // Future potential fields:
  // mod_id_to_remove?: string; // UUID of a specific mod entry
  // filename_to_remove?: string; // Specific filename for custom mods/assets
  // content_type_to_scan?: 'shader' | 'resourcepack' | 'datapack'; // To target specific asset types if filename is generic
} 