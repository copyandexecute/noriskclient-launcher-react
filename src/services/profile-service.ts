import { invoke } from "@tauri-apps/api/core";
import type {
  CreateProfileParams,
  Profile,
  UpdateProfileParams,
} from "../types/profile";

export async function listProfiles(): Promise<Profile[]> {
  return invoke<Profile[]>("list_profiles");
}

export async function getProfile(id: string): Promise<Profile> {
  return invoke<Profile>("get_profile", { id });
}

export async function createProfile(
  params: CreateProfileParams,
): Promise<string> {
  return invoke<string>("create_profile", { params });
}

export async function updateProfile(
  id: string,
  params: UpdateProfileParams,
): Promise<void> {
  return invoke<void>("update_profile", { id, params });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke<void>("delete_profile", { id });
}

export async function launchProfile(id: string): Promise<void> {
  return invoke<void>("launch_profile", { id });
}

export async function abortProfileLaunch(id: string): Promise<void> {
  return invoke<void>("abort_profile_launch", { id });
}

export async function isProfileLaunching(id: string): Promise<boolean> {
  return invoke<boolean>("is_profile_launching", { profileId: id });
}

export async function copyProfile(params: {
  source_profile_id: string;
  new_profile_name: string;
  include_files?: string[];
}): Promise<string> {
  return invoke<string>("copy_profile", { params });
}

export async function exportProfile(params: {
  profile_id: string;
  file_name: string;
  include_files?: string[];
  open_folder?: boolean;
}): Promise<string> {
  return invoke<string>("export_profile", { params });
}

export async function getSystemRamMb(): Promise<number> {
  return invoke<number>("get_system_ram_mb");
}

export async function setProfileModEnabled(
  profileId: string,
  modId: string,
  enabled: boolean,
): Promise<void> {
  return invoke<void>("set_profile_mod_enabled", { profileId, modId, enabled });
}

export async function deleteModFromProfile(
  profileId: string,
  modId: string,
): Promise<void> {
  return invoke<void>("delete_mod_from_profile", { profileId, modId });
}

export async function addModrinthModToProfile(
  profileId: string,
  projectId: string,
  versionId: string,
  fileName: string,
  downloadUrl: string,
  fileHashSha1?: string,
  modName?: string,
  versionNumber?: string,
  loaders?: string[],
  gameVersions?: string[],
): Promise<void> {
  return invoke<void>("add_modrinth_mod_to_profile", {
    profileId,
    projectId,
    versionId,
    fileName,
    downloadUrl,
    fileHashSha1,
    modName,
    versionNumber,
    loaders,
    gameVersions,
  });
}

export async function getLocalResourcepacks(profileId: string): Promise<any[]> {
  return invoke<any[]>("get_local_resourcepacks", { profileId });
}

export async function setProfileResourcePackEnabled(
  profileId: string,
  packId: string,
  enabled: boolean,
): Promise<void> {
  return invoke<void>("set_profile_resourcepack_enabled", {
    profileId,
    packId,
    enabled,
  });
}

export async function deleteResourcePackFromProfile(
  profileId: string,
  packId: string,
): Promise<void> {
  return invoke<void>("delete_resourcepack_from_profile", {
    profileId,
    packId,
  });
}

export async function getLocalShaderpacks(profileId: string): Promise<any[]> {
  return invoke<any[]>("get_local_shaderpacks", { profileId });
}

export async function setProfileShaderPackEnabled(
  profileId: string,
  packId: string,
  enabled: boolean,
): Promise<void> {
  return invoke<void>("set_profile_shaderpack_enabled", {
    profileId,
    packId,
    enabled,
  });
}

export async function deleteShaderPackFromProfile(
  profileId: string,
  packId: string,
): Promise<void> {
  return invoke<void>("delete_shaderpack_from_profile", { profileId, packId });
}

export async function getCustomMods(profileId: string): Promise<any[]> {
  return invoke<any[]>("get_custom_mods", { profileId });
}

export async function setCustomModEnabled(
  profileId: string,
  filename: string,
  enabled: boolean,
): Promise<void> {
  return invoke<void>("set_custom_mod_enabled", {
    profileId,
    filename,
    enabled,
  });
}

export async function deleteCustomMod(
  profileId: string,
  filename: string,
): Promise<void> {
  return invoke<void>("delete_custom_mod", { profileId, filename });
}

export async function importLocalMods(profileId: string): Promise<void> {
  return invoke<void>("import_local_mods", { profileId });
}

export async function addModrinthContentToProfile(
  profileId: string,
  projectId: string,
  versionId: string,
  fileName: string,
  downloadUrl: string,
  fileHashSha1: string | null,
  contentName: string | null,
  versionNumber: string | null,
  contentType: string,
): Promise<void> {
  return invoke<void>("add_modrinth_content_to_profile", {
    profileId,
    projectId,
    versionId,
    fileName,
    downloadUrl,
    fileHashSha1,
    contentName,
    versionNumber,
    projectType: contentType,
  });
}
