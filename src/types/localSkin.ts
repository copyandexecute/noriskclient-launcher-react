// This file is auto-generated from the Rust sources. Do not edit manually.
// Corresponding Rust file: src-tauri/src/state/skin_state.rs

/**
 * Represents the possible variants for a Minecraft skin.
 */
export type SkinVariant = 'slim' | 'classic';

/**
 * Represents a Minecraft skin stored locally.
 * Corresponds to the Rust struct `MinecraftSkin`.
 */
export interface MinecraftSkin {
  id: string;
  name: string;
  base64_data: string;
  variant: SkinVariant; // Changed from string
  description?: string | null;
  added_at: string; // DateTime<Utc> as ISO string
}

/**
 * Container for all stored Minecraft skins.
 * Corresponds to the Rust struct `SkinDatabase`.
 */
export interface SkinDatabase {
  skins?: MinecraftSkin[] | null;
} 