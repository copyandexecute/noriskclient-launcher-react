export interface MinecraftAccount {
    id: string;
    username: string;
    minecraft_username: string;
    active: boolean;
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
}

/**
 * Represents a Minecraft player profile as returned by Mojang's session server
 */
export interface MinecraftProfile {
    /** Player UUID (without hyphens) */
    id: string;
    /** Player username */
    name: string;
    /** Properties of the profile, including skin and cape data */
    properties: ProfileProperty[];
}

/**
 * A property of a Minecraft profile, typically containing textures
 */
export interface ProfileProperty {
    /** The name of the property (typically "textures") */
    name: string;
    /** Base64-encoded value of the property */
    value: string;
    /** Optional signature */
    signature?: string;
}

/**
 * Decoded textures data for a Minecraft profile (after base64 decoding)
 */
export interface TexturesData {
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Profile's UUID */
    profileId: string;
    /** Profile's name */
    profileName: string;
    /** Textures dictionary containing skin and cape information */
    textures: TexturesDictionary;
}

/**
 * Dictionary of textures for a Minecraft profile
 */
export interface TexturesDictionary {
    /** Skin information */
    SKIN?: TextureInfo;
    /** Cape information */
    CAPE?: TextureInfo;
}

/**
 * Information about a texture (skin or cape)
 */
export interface TextureInfo {
    /** URL to the texture image */
    url: string;
    /** Optional metadata for the texture (used for slim skin model) */
    metadata?: TextureMetadata;
}

/**
 * Metadata for a texture
 */
export interface TextureMetadata {
    /** Skin model type ("slim" or "default") */
    model?: string;
} 

export interface MinecraftVersion {
    id: string;
    type: string;
    url: string;
    time: string;
    releaseTime: string;
}

export interface WorldInfo {
  folder_name: string;
  display_name: string | null;
  last_played: number | null; // Assuming Rust i64 maps to number (epoch milliseconds)
  icon_path: string | null; // Changed type from object to string | null
}