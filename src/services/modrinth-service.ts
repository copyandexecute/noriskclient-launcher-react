import type {
  ModrinthAllVersionsResult,
  ModrinthBulkUpdateRequestBody,
  ModrinthProject,
  ModrinthProjectContext,
  ModrinthProjectType,
  ModrinthSearchHit,
  ModrinthSearchResponse,
  ModrinthSortType,
  ModrinthVersion,
  ModrinthCategory,
  ModrinthLoader,
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
    categoriesFilter?: string[],
    clientSideFilter?: string,
    serverSideFilter?: string,
  ): Promise<ModrinthSearchResponse> {
    return invoke<ModrinthSearchResponse>("search_modrinth_projects", {
      query,
      projectType,
      gameVersion,
      loader,
      limit,
      offset,
      sort,
      categoriesFilter,
      clientSideFilter,
      serverSideFilter,
    });
  }

  static async searchMods(
    query: string,
    gameVersion?: string,
    loader?: string,
    limit = 20,
  ): Promise<ModrinthSearchHit[]> {
    return invoke<ModrinthSearchHit[]>("search_modrinth_mods", {
      query,
      gameVersion,
      loader,
      limit,
    });
  }

  static async getModVersions(
    projectIdOrSlug: string,
    loaders?: string[],
    gameVersions?: string[],
  ): Promise<ModrinthVersion[]> {
    return invoke<ModrinthVersion[]>("get_modrinth_mod_versions", {
      projectIdOrSlug,
      loaders,
      gameVersions,
    });
  }

  static async getAllVersionsForContexts(
    contexts: ModrinthProjectContext[],
  ): Promise<ModrinthAllVersionsResult[]> {
    return invoke<ModrinthAllVersionsResult[]>(
      "get_all_modrinth_versions_for_contexts",
      {
        contexts,
      },
    );
  }

  static async getProjectDetails(ids: string[]): Promise<ModrinthProject[]> {
    return invoke<ModrinthProject[]>("get_modrinth_project_details", {
      ids,
    });
  }

  static async checkUpdates(
    request: ModrinthBulkUpdateRequestBody,
  ): Promise<Record<string, ModrinthVersion>> {
    return invoke<Record<string, ModrinthVersion>>("check_modrinth_updates", {
      request,
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

  static async getModrinthCategories(): Promise<ModrinthCategory[]> {
    return invoke<ModrinthCategory[]>("get_modrinth_categories_command");
  }

  static async getModrinthLoaders(): Promise<ModrinthLoader[]> {
    return invoke<ModrinthLoader[]>("get_modrinth_loaders_command");
  }
}
