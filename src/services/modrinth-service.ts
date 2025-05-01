import type {
  ModrinthProjectType,
  ModrinthSearchResponse,
  ModrinthSortType,
  ModrinthVersion,
} from "../types/modrinth";
import { invoke } from "@tauri-apps/api/core";

export class ModrinthService {
  static async searchProjects(
    query: string,
    projectType: ModrinthProjectType,
    gameVersion?: string,
    loader?: string,
    limit = 20,
    offset = 0,
    sort?: ModrinthSortType,
  ): Promise<ModrinthSearchResponse> {
    return invoke<ModrinthSearchResponse>("search_modrinth_projects", {
      query,
      projectType,
      gameVersion,
      loader,
      limit,
      offset,
      sort,
    });
  }

  static async getModVersions(
    projectIdOrSlug: string,
    gameVersions?: string[],
    loaders?: string[],
  ): Promise<ModrinthVersion[]> {
    return invoke<ModrinthVersion[]>("get_modrinth_mod_versions", {
      projectIdOrSlug,
      gameVersions,
      loaders,
    });
  }

  static async addModToProfile(
    profileId: string,
    projectId: string,
    versionId: string,
    fileName: string,
    downloadUrl: string,
    fileHashSha1: string | undefined,
    modName: string,
    versionNumber: string,
    loaders: string[],
    gameVersions: string[],
  ): Promise<void> {
    return invoke("add_modrinth_mod_to_profile", {
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

  static async addContentToProfile(
    profileId: string,
    projectId: string,
    versionId: string,
    fileName: string,
    downloadUrl: string,
    fileHashSha1: string | undefined,
    contentName: string,
    versionNumber: string,
    projectType: ModrinthProjectType,
  ): Promise<void> {
    return invoke("add_modrinth_content_to_profile", {
      profileId,
      projectId,
      versionId,
      fileName,
      downloadUrl,
      fileHashSha1,
      contentName,
      versionNumber,
      projectType,
    });
  }

  static async downloadAndInstallModpack(
    projectId: string,
    versionId: string,
    fileName: string,
    downloadUrl: string,
  ): Promise<string> {
    return invoke<string>("download_and_install_modrinth_modpack", {
      projectId,
      versionId,
      fileName,
      downloadUrl,
    });
  }
}
