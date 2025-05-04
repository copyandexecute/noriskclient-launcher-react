import { invoke } from "@tauri-apps/api/core";
import type { 
    MinecraftProfile 
} from "../types/minecraft"; // Relative path
import type { 
    MinecraftSkin, 
    SkinVariant 
} from "../types/localSkin"; // Relative path

export class MinecraftSkinService {

    /**
     * Fetches the skin profile data for a given user from Mojang.
     * @param uuid - The user's Minecraft UUID.
     * @param accessToken - The user's valid access token.
     * @returns A promise resolving to the MinecraftProfile containing skin data.
     */
    static async getUserSkinData(uuid: string, accessToken: string): Promise<MinecraftProfile> {
        return await invoke<MinecraftProfile>("get_user_skin_data", { uuid, accessToken });
    }

    /**
     * Retrieves all skins stored locally in the application's database.
     * @returns A promise resolving to an array of MinecraftSkin objects.
     */
    static async getAllSkins(): Promise<MinecraftSkin[]> {
        return await invoke<MinecraftSkin[]>("get_all_skins");
    }

    /**
     * Initiates the process to upload a new skin file for the user.
     * NOTE: This likely triggers a file dialog on the Rust side.
     * @param uuid - The user's Minecraft UUID.
     * @param accessToken - The user's valid access token.
     * @param skinVariant - The model variant ('classic' or 'slim').
     * @returns A promise that resolves when the upload process is initiated or completed.
     */
    static async uploadSkin(uuid: string, accessToken: string, skinVariant: SkinVariant): Promise<void> {
        // Assuming "upload_skin" handles file selection internally via Tauri dialogs
        await invoke("upload_skin", { uuid, accessToken, skinVariant });
    }

    /**
     * Resets the user's skin back to the default (Steve/Alex).
     * @param uuid - The user's Minecraft UUID.
     * @param accessToken - The user's valid access token.
     * @returns A promise that resolves when the reset is complete.
     */
    static async resetSkin(uuid: string, accessToken: string): Promise<void> {
        await invoke("reset_skin", { uuid, accessToken });
    }

    /**
     * Applies a locally stored skin (using its base64 data) to the user's profile.
     * @param uuid - The user's Minecraft UUID.
     * @param accessToken - The user's valid access token.
     * @param base64Data - The base64 encoded PNG data of the skin.
     * @param skinVariant - The model variant ('classic' or 'slim').
     * @returns A promise that resolves when the skin is applied.
     */
    static async applySkinFromBase64(uuid: string, accessToken: string, base64Data: string, skinVariant: SkinVariant): Promise<void> {
        await invoke("apply_skin_from_base64", { uuid, accessToken, base64Data, skinVariant });
    }

    /**
     * Updates the properties (name, variant) of a locally stored skin.
     * @param id - The database ID of the skin to update.
     * @param name - The new name for the skin.
     * @param variant - The new variant ('classic' or 'slim') for the skin.
     * @returns A promise resolving to the updated MinecraftSkin object or null if not found.
     */
    static async updateSkinProperties(id: string, name: string, variant: SkinVariant): Promise<MinecraftSkin | null> {
        return await invoke<MinecraftSkin | null>("update_skin_properties", { id, name, variant });
    }
} 