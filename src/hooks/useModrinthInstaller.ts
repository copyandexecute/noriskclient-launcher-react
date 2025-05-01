"use client";

import { useCallback, useState } from "react";
import { ModrinthService } from "../services/modrinth-service";
import type {
  ModrinthFile,
  ModrinthProjectType,
  ModrinthVersion,
} from "../types/modrinth";
import type { Profile } from "../types/profile";

function useModrinthInstaller(
  profiles: Profile[],
  selectedProfileId: string | null = null,
  onInstallSuccess?: () => void,
) {
  const [installState, setInstallState] = useState<
    Record<string, "idle" | "adding" | "error" | "success">
  >({});
  const [error, setError] = useState<string | null>(null);

  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<{
    version: ModrinthVersion;
    file: ModrinthFile;
  } | null>(null);

  const installToProfile = useCallback(
    async (version: ModrinthVersion, file: ModrinthFile, profileId: string) => {
      const versionId = version.id;
      setInstallState((prev) => ({ ...prev, [versionId]: "adding" }));
      setError(null);

      try {
        const hit = version.search_hit;
        if (!hit) {
          throw new Error("Missing search hit context");
        }

        if (hit.project_type === "mod") {
          await ModrinthService.addModToProfile(
            profileId,
            version.project_id,
            version.id,
            file.filename,
            file.url,
            file.hashes.sha1,
            hit.title || file.filename,
            version.version_number,
            version.loaders,
            version.game_versions,
          );
        } else if (
          ["resourcepack", "shader", "datapack"].includes(hit.project_type)
        ) {
          await ModrinthService.addContentToProfile(
            profileId,
            version.project_id,
            version.id,
            file.filename,
            file.url,
            file.hashes.sha1,
            hit.title || file.filename,
            version.version_number,
            hit.project_type as ModrinthProjectType,
          );
        }

        setInstallState((prev) => ({ ...prev, [versionId]: "success" }));

        if (onInstallSuccess) {
          onInstallSuccess();
        }

        setTimeout(() => {
          setInstallState((prev) => ({ ...prev, [versionId]: "idle" }));
        }, 2000);
      } catch (err) {
        setError(
          `Failed to add: ${err instanceof Error ? err.message : String(err)}`,
        );
        setInstallState((prev) => ({ ...prev, [versionId]: "error" }));

        setTimeout(() => {
          setInstallState((prev) => {
            if (prev[versionId] === "error") {
              const newState = { ...prev };
              newState[versionId] = "idle";
              return newState;
            }
            return prev;
          });
        }, 5000);
      }
    },
    [onInstallSuccess],
  );

  const installModpack = useCallback(
    async (version: ModrinthVersion) => {
      const versionId = version.id;
      setInstallState((prev) => ({ ...prev, [versionId]: "adding" }));
      setError(null);

      try {
        const hit = version.search_hit;
        if (!hit) {
          throw new Error("Missing search hit context");
        }

        setInstallState((prev) => ({ ...prev, [versionId]: "success" }));

        if (onInstallSuccess) {
          onInstallSuccess();
        }

        setTimeout(() => {
          setInstallState((prev) => ({ ...prev, [versionId]: "idle" }));
        }, 2000);
      } catch (err) {
        setError(
          `Failed to install: ${err instanceof Error ? err.message : String(err)}`,
        );
        setInstallState((prev) => ({ ...prev, [versionId]: "error" }));

        setTimeout(() => {
          setInstallState((prev) => {
            if (prev[versionId] === "error") {
              const newState = { ...prev };
              newState[versionId] = "idle";
              return newState;
            }
            return prev;
          });
          setError(null);
        }, 5000);
      }
    },
    [onInstallSuccess],
  );

  const handleContentInstall = useCallback(
    (version: ModrinthVersion, file: ModrinthFile) => {
      try {
        if (version.search_hit?.project_type === "modpack") {
          installModpack(version);
          return;
        }

        if (selectedProfileId) {
          installToProfile(version, file, selectedProfileId);
          return;
        }

        if (!profiles || profiles.length === 0) {
          setError(
            "Installation error: No profiles available. Please create a profile first.",
          );
          return;
        }

        if (profiles.length === 1) {
          installToProfile(version, file, profiles[0].id);
          return;
        }

        setPendingInstall({ version, file });
        setShowProfilePopup(true);
      } catch (error) {
        setError(
          `Installation error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [selectedProfileId, profiles, installToProfile, installModpack],
  );

  const handleProfileSelect = useCallback(
    async (profileId: string) => {
      if (!pendingInstall) return;

      const { version, file } = pendingInstall;
      setShowProfilePopup(false);
      await installToProfile(version, file, profileId);
      setPendingInstall(null);
    },
    [pendingInstall, installToProfile],
  );

  return {
    installState,
    error,
    installToProfile,
    installModpack,
    showProfilePopup,
    setShowProfilePopup,
    pendingInstall,
    setPendingInstall,
    handleProfileSelect,
    handleContentInstall,
  };
}

export { useModrinthInstaller };
