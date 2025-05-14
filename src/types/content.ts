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

/**
 * Payload for toggling the enabled state of content in a profile.
 * Mirrors the Rust struct `ToggleContentPayload`.
 */
export interface ToggleContentPayload {
  profile_id: string; // UUID
  sha1_hash?: string;  // Made optional - SHA1 hash of the content to toggle
  enabled: boolean;   // The desired new enabled state
  // Future: content_identifier (e.g., could be sha1, mod_id, filename)
  // Future: content_type?: 'mod' | 'resourcepack' | 'shaderpack' | 'datapack';
} 