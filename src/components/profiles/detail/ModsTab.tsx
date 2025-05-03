"use client";

import { useEffect, useState } from "react";
import { ModRow } from "./ModRow";
import type { Mod, Profile } from "../../../types/profile";
import * as ProfileService from "../../../services/profile-service";
import { SearchInput } from "./common/SearchInput";
import { ActionButton } from "./common/ActionButton";
import { ContentTable } from "./common/ContentTable";
import { LoadingState } from "./common/LoadingState";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import type {
  ModrinthBulkUpdateRequestBody,
  ModrinthHashAlgorithm,
  ModrinthVersion,
} from "../../../types/modrinth";

interface ModsTabProps {
  profile: Profile;
  onRefresh?: () => void;
}

interface ModSourceModrinth {
  type: "modrinth";
  project_id: string;
  version_id: string;
  file_name: string;
  file_hash_sha1?: string;
}

export function ModsTab({ profile, onRefresh }: ModsTabProps) {
  const [mods, setMods] = useState<Mod[]>(profile.mods || []);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "enabled" | "version">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);

  const [modUpdates, setModUpdates] = useState<Record<string, ModrinthVersion>>(
    {},
  );
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updatingMods, setUpdatingMods] = useState<Set<string>>(new Set());

  const handleUpdateMod = async (mod: Mod, updateVersion: ModrinthVersion) => {
    if (
      mod.source?.type !== "modrinth" ||
      !(mod.source as ModSourceModrinth).file_hash_sha1
    ) {
      console.error("Cannot update non-Modrinth mod or mod without hash");
      return;
    }

    setUpdatingMods((prev) => new Set(prev).add(mod.id));

    try {
      const newUpdates = { ...modUpdates };
      delete newUpdates[(mod.source as ModSourceModrinth).file_hash_sha1!];
      setModUpdates(newUpdates);

      console.log(
        `Updating mod ${mod.display_name || mod.id} from ${mod.version} to ${updateVersion.version_number}`,
      );

      await invoke("update_modrinth_mod_version", {
        profileId: profile.id,
        modInstanceId: mod.id,
        newVersionDetails: updateVersion,
      });

      console.log(`Successfully updated mod ${mod.display_name || mod.id}`);

      setMods((currentMods) =>
        currentMods.map((m) =>
          m.id === mod.id
            ? {
                ...m,
                version: updateVersion.version_number,
                source:
                  m.source?.type === "modrinth"
                    ? {
                        ...m.source,
                        version_id: updateVersion.id,
                      }
                    : m.source,
              }
            : m,
        ),
      );

      await fetchMods();
    } catch (error) {
      console.error("Failed to update mod:", error);
      setError(
        `Failed to update mod: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setUpdatingMods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mod.id);
        return newSet;
      });
    }
  };

  const fetchMods = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedProfile = await ProfileService.getProfile(profile.id);
      setMods(updatedProfile.mods || []);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to fetch mods:", error);
      setError(
        `Failed to load mods: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkForModUpdates = async (currentProfile = profile) => {
    if (!currentProfile.mods || currentProfile.mods.length === 0) return;

    const modsWithHashes = currentProfile.mods.filter(
      (mod: Mod) =>
        mod.source?.type === "modrinth" &&
        (mod.source as ModSourceModrinth).file_hash_sha1 != null,
    );

    if (modsWithHashes.length === 0) return;

    const hashes = modsWithHashes.map(
      (mod: Mod) => (mod.source as ModSourceModrinth).file_hash_sha1!,
    );

    setCheckingUpdates(true);
    setUpdateError(null);

    try {
      const request: ModrinthBulkUpdateRequestBody = {
        hashes,
        algorithm: "sha1" as ModrinthHashAlgorithm,
        loaders: [currentProfile.loader],
        game_versions: [currentProfile.game_version],
      };

      console.log(`Checking for updates for ${hashes.length} mods...`);

      const updates = await invoke<Record<string, ModrinthVersion>>(
        "check_modrinth_updates",
        { request },
      );

      setModUpdates({});

      const filteredUpdates: Record<string, ModrinthVersion> = {};

      const modsByHash = new Map<string, Mod>();
      for (const mod of modsWithHashes) {
        const hash = (mod.source as ModSourceModrinth).file_hash_sha1!;
        modsByHash.set(hash, mod);
      }

      for (const [hash, version] of Object.entries(updates)) {
        const mod = modsByHash.get(hash);
        if (mod && mod.version !== version.version_number) {
          filteredUpdates[hash] = version;
          console.log(
            `Update available for mod ${mod.display_name || mod.id}: Current: ${mod.version}, New: ${version.version_number}`,
          );
        } else if (mod) {
          console.log(
            `Mod ${mod.display_name || mod.id} is already at the latest version: ${mod.version}`,
          );
        }
      }
      if (Object.keys(filteredUpdates).length > 0) {
        setModUpdates(filteredUpdates);
        console.log(
          `Found updates for ${Object.keys(filteredUpdates).length} mods`,
        );
      } else {
        console.log("No updates available for any mods");
      }
    } catch (error) {
      console.error("Error checking for mod updates:", error);
      setUpdateError(
        error instanceof Error
          ? error.message
          : "Error checking for mod updates",
      );
    } finally {
      setCheckingUpdates(false);
    }
  };

  useEffect(() => {
    fetchMods();
  }, [profile.id]);

  const handleCheckUpdates = () => {
    checkForModUpdates({ ...profile, mods });
  };

  useEffect(() => {
    if (profile.mods && profile.mods.length > 0) {
      checkForModUpdates(profile);
    }
  }, []);

  const handleToggleMod = async (modId: string) => {
    try {
      const mod = mods.find((m) => m.id === modId);
      if (!mod) return;

      await ProfileService.setProfileModEnabled(
        profile.id,
        modId,
        !mod.enabled,
      );

      setMods(
        mods.map((m) => (m.id === modId ? { ...m, enabled: !m.enabled } : m)),
      );
    } catch (error) {
      console.error("Failed to toggle mod:", error);
      setError(
        `Failed to toggle mod: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleDeleteMod = async (modId: string) => {
    try {
      await ProfileService.deleteModFromProfile(profile.id, modId);

      setMods(mods.filter((m) => m.id !== modId));
      setSelectedMods((prev) => {
        const updated = new Set(prev);
        updated.delete(modId);
        return updated;
      });
    } catch (error) {
      console.error("Failed to delete mod:", error);
      setError(
        `Failed to delete mod: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleSelectMod = (modId: string) => {
    setSelectedMods((prev) => {
      const updated = new Set(prev);
      if (updated.has(modId)) {
        updated.delete(modId);
      } else {
        updated.add(modId);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedMods.size === filteredMods.length) {
      setSelectedMods(new Set());
    } else {
      setSelectedMods(new Set(filteredMods.map((mod) => mod.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMods.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedMods.size} selected mod${
          selectedMods.size !== 1 ? "s" : ""
        }? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const promises = Array.from(selectedMods).map((modId) =>
        ProfileService.deleteModFromProfile(profile.id, modId),
      );
      await Promise.all(promises);

      setMods(mods.filter((m) => !selectedMods.has(m.id)));
      setSelectedMods(new Set());
    } catch (error) {
      console.error("Failed to delete selected mods:", error);
      setError(
        `Failed to delete selected mods: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleImportLocalMods = async () => {
    try {
      await ProfileService.importLocalMods(profile.id);
      fetchMods();
    } catch (error) {
      console.error("Failed to import local mods:", error);
      setError(
        `Failed to import local mods: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleSort = (criteria: string) => {
    if (sortBy === criteria) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria as any);
      setSortDirection("asc");
    }
  };

  const getModUpdateVersion = (mod: Mod): ModrinthVersion | null => {
    if (
      mod.source?.type !== "modrinth" ||
      !(mod.source as ModSourceModrinth).file_hash_sha1
    ) {
      return null;
    }

    const hash = (mod.source as ModSourceModrinth).file_hash_sha1!;
    return hash in modUpdates ? modUpdates[hash] : null;
  };

  const filteredMods = mods.filter(
    (mod) =>
      mod.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedMods = [...filteredMods].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = (a.display_name || "").localeCompare(b.display_name || "");
        break;
      case "enabled":
        comparison = Number(a.enabled) - Number(b.enabled);
        break;
      case "version":
        comparison = (a.version || "").localeCompare(b.version || "");
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const modsWithUpdates = mods.filter(
    (mod) =>
      mod.source?.type === "modrinth" &&
      (mod.source as ModSourceModrinth).file_hash_sha1 &&
      (mod.source as ModSourceModrinth).file_hash_sha1! in modUpdates,
  ).length;

  return (
    <div className="h-full flex flex-col select-none">
      <div className="flex items-center justify-between mb-5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="search mods..."
        />

        <div className="flex items-center gap-4">
          <ActionButton
            icon="pixel:upload-solid"
            label="import"
            onClick={handleImportLocalMods}
          />
          <ActionButton
            icon="pixel:arrow-up"
            label="check updates"
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
          >
            {modsWithUpdates > 0 && (
              <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs px-1.5 py-0.5 rounded-sm font-sans ml-1">
                {modsWithUpdates}
              </span>
            )}
          </ActionButton>
          <ActionButton
            icon="pixel:trash-solid"
            label="delete selected"
            onClick={handleDeleteSelected}
            disabled={selectedMods.size === 0}
            danger
          >
            ({selectedMods.size})
          </ActionButton>
        </div>
      </div>

      {updateError && (
        <div className="bg-red-900/50 border border-red-700/50 text-white p-3 mb-4 rounded">
          <div className="flex items-center gap-2">
            <Icon
              icon="pixel:exclamation-triangle-solid"
              className="w-5 h-5 text-red-400"
            />
            <span>Error checking for updates: {updateError}</span>
          </div>
        </div>
      )}

      <ContentTable
        headers={[
          {
            key: "name",
            label: "name",
            sortable: true,
            width: "flex-1",
            className: "px-3",
          },
          { key: "version", label: "version", sortable: true, width: "w-28" },
          {
            key: "enabled",
            label: "status",
            sortable: true,
            width: "w-28",
            className: "text-center justify-center",
          },
          {
            key: "actions",
            label: "actions",
            sortable: false,
            width: "w-20",
            className: "text-center",
          },
        ]}
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedCount={selectedMods.size}
        totalCount={mods.length}
        filteredCount={filteredMods.length}
        enabledCount={filteredMods.filter((m) => m.enabled).length}
        onSelectAll={handleSelectAll}
        contentType="mod"
        searchQuery={searchQuery}
      >
        {isLoading ? (
          <LoadingState message="loading mods..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMods} />
        ) : sortedMods.length > 0 ? (
          sortedMods.map((mod) => (
            <ModRow
              key={mod.id}
              mod={mod}
              isSelected={selectedMods.has(mod.id)}
              onSelect={() => handleSelectMod(mod.id)}
              onToggle={() => handleToggleMod(mod.id)}
              onDelete={() => handleDeleteMod(mod.id)}
              onUpdate={handleUpdateMod}
              updateVersion={getModUpdateVersion(mod)}
              checkingUpdates={checkingUpdates || updatingMods.has(mod.id)}
            />
          ))
        ) : (
          <EmptyState
            icon="pixel:grid-solid"
            message={
              searchQuery ? "no mods match your search" : "no mods installed"
            }
          />
        )}
      </ContentTable>
    </div>
  );
}
