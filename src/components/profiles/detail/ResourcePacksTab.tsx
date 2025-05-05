"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Profile } from "../../../types/profile";
import type {
  ModrinthVersion,
  ResourcePackInfo,
} from "../../../types/modrinth";
import { ContentPackRow } from "./ContentPackRow";
import { SearchInput } from "./common/SearchInput";
import { ActionButton } from "./common/ActionButton";
import { ContentTable } from "./common/ContentTable";
import { LoadingState } from "./common/LoadingState";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { Icon } from "@iconify/react";
import { formatFileSize } from "../../../utils/format-file-size";
import { cn } from "../../../lib/utils";

interface ResourcePacksTabProps {
  profile: Profile;
  onRefresh?: () => void;
  isActive?: boolean;
}

export function ResourcePacksTab({
  profile,
  onRefresh,
  isActive = false,
}: ResourcePacksTabProps) {
  const [resourcePacks, setResourcePacks] = useState<ResourcePackInfo[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const [loadingResourcePacks, setLoadingResourcePacks] = useState(false);
  const [resourcePacksError, setResourcePacksError] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "enabled">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [loadingOperation, setLoadingOperation] = useState(false);
  const [resourcePackUpdates, setResourcePackUpdates] = useState<
    Record<string, ModrinthVersion>
  >({});
  const [updatingPacks, setUpdatingPacks] = useState<Set<string>>(new Set());
  const [lastUpdateCheck, setLastUpdateCheck] = useState<number>(0);

  const fetchResourcePacks = async () => {
    setLoadingResourcePacks(true);
    setResourcePacksError(null);

    try {
      const packs = await invoke<ResourcePackInfo[]>(
        "get_local_resourcepacks",
        {
          profileId: profile.id,
        },
      );

      console.log("Raw resource packs data:", packs);

      const processedPacks = (packs || []).map((pack) => {
        let fileName = pack.filename;
        if (!fileName || fileName === "0") {
          if (pack.path) {
            const parts = pack.path.split(/[/\\]/);
            fileName = parts[parts.length - 1] || "Unknown file";
          } else {
            fileName = "Unknown file";
          }
        }

        return {
          ...pack,
          file_name: fileName,
        };
      });

      setResourcePacks(processedPacks);

      if (processedPacks.length > 0) {
        checkForResourcePackUpdates();
      }

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to load resource packs:", error);
      setResourcePacksError(
        `Failed to load resource packs: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoadingResourcePacks(false);
    }
  };

  const checkForResourcePackUpdates = async () => {
    const now = Date.now();
    if (now - lastUpdateCheck < 30000 && lastUpdateCheck > 0) {
      console.debug(
        "[ResourcePacksTab] Skipping update check, last check was less than 30 seconds ago",
      );
      return;
    }

    if (!profile.game_version) {
      console.debug(
        "[ResourcePacksTab] Cannot check resource pack updates without game_version.",
      );
      return;
    }

    setCheckingUpdates(true);
    setUpdateError(null);

    try {
      const packsWithHashes = resourcePacks.filter(
        (pack) => pack.modrinth_info && pack.sha1_hash,
      );

      console.debug(
        "[ResourcePacksTab] Packs eligible for resource pack update check:",
        packsWithHashes,
      );

      if (packsWithHashes.length === 0) {
        console.debug(
          "[ResourcePacksTab] No resource packs eligible for update check.",
        );
        setCheckingUpdates(false);
        return;
      }

      const hashes = packsWithHashes
        .map((pack) => pack.sha1_hash!)
        .filter((hash) => hash);

      if (hashes.length === 0) {
        console.debug(
          "[ResourcePacksTab] No valid hashes found for resource pack update check.",
        );
        setCheckingUpdates(false);
        return;
      }

      const request = {
        hashes,
        algorithm: "sha1",
        loaders: [],
        game_versions: [profile.game_version],
      };

      console.debug(
        "[ResourcePacksTab] Checking for updates for resource packs with request:",
        request,
      );

      const updates = await invoke<Record<string, ModrinthVersion>>(
        "check_modrinth_updates",
        { request },
      );

      console.debug(
        "[ResourcePacksTab] Received raw resource pack updates from backend:",
        updates,
      );

      setResourcePackUpdates(updates);
      setLastUpdateCheck(now);
      console.log(
        `[ResourcePacksTab] Found updates for ${Object.keys(updates).length} resource packs`,
      );
    } catch (error) {
      console.error("Error checking for resource pack updates:", error);
      setUpdateError(
        error instanceof Error
          ? error.message
          : "Error checking for resource pack updates",
      );
      setResourcePackUpdates({});
    } finally {
      setCheckingUpdates(false);
    }
  };

  function hasResourcePackUpdate(pack: ResourcePackInfo): boolean {
    if (!pack.sha1_hash || !pack.modrinth_info) return false;

    const updateVersion =
      pack.sha1_hash in resourcePackUpdates
        ? resourcePackUpdates[pack.sha1_hash]
        : null;
    if (!updateVersion) return false;

    return updateVersion.id !== pack.modrinth_info.version_id;
  }

  function getResourcePackUpdateVersion(
    pack: ResourcePackInfo,
  ): ModrinthVersion | null {
    if (!pack.sha1_hash || !(pack.sha1_hash in resourcePackUpdates))
      return null;

    const updateVersion = resourcePackUpdates[pack.sha1_hash];

    if (
      pack.modrinth_info &&
      updateVersion.id === pack.modrinth_info.version_id
    ) {
      return null;
    }

    return updateVersion;
  }

  useEffect(() => {
    fetchResourcePacks();
  }, [profile.id]);

  useEffect(() => {
    if (isActive && resourcePacks.length > 0) {
      checkForResourcePackUpdates();
    }
  }, [isActive, resourcePacks.length]);

  const togglePackEnabled = async (packId: string) => {
    if (loadingOperation) return;

    const pack = resourcePacks.find((p) => p.filename === packId);
    if (!pack || !pack.path) return;

    setLoadingOperation(true);

    try {
      const shouldBeEnabled = pack.is_disabled === true;

      console.log(
        `Toggling pack ${pack.filename}, currently disabled: ${pack.is_disabled}, setting enabled to: ${shouldBeEnabled}`,
      );

      await invoke("set_file_enabled", {
        filePath: pack.path,
        enabled: shouldBeEnabled,
      });

      setResourcePacks((packs) =>
        packs.map((p) =>
          p.filename === packId ? { ...p, is_disabled: !shouldBeEnabled } : p,
        ),
      );

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to toggle pack enabled state:", err);
      setResourcePacksError(
        `Failed to toggle pack: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const updatePack = async (packId: string) => {
    if (loadingOperation) return;

    const pack = resourcePacks.find((p) => p.filename === packId);
    if (!pack || !hasResourcePackUpdate(pack)) return;

    const updateVersion = getResourcePackUpdateVersion(pack);
    if (!updateVersion) {
      console.error(
        "Update version not found despite hasResourcePackUpdate returning true",
      );
      return;
    }

    setUpdatingPacks((prev) => new Set(prev).add(packId));

    try {
      console.log(
        `Updating resource pack ${pack.filename} to version ${updateVersion.version_number}`,
      );

      if (pack.sha1_hash && pack.sha1_hash in resourcePackUpdates) {
        const newUpdates = { ...resourcePackUpdates };
        delete newUpdates[pack.sha1_hash];
        setResourcePackUpdates(newUpdates);
      }

      await invoke("update_resourcepack_from_modrinth", {
        profileId: profile.id,
        resourcepack: pack,
        newVersionDetails: updateVersion,
      });

      console.log(
        `Successfully updated resource pack ${pack.filename} to version ${updateVersion.version_number}`,
      );

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to update pack:", err);
      setResourcePacksError(
        `Failed to update pack: ${err instanceof Error ? err.message : String(err)}`,
      );

      setResourcePackUpdates({ ...resourcePackUpdates });
    } finally {
      setUpdatingPacks((prev) => {
        const updated = new Set(prev);
        updated.delete(packId);
        return updated;
      });
    }
  };

  const updateAllPacks = async () => {
    const packsToUpdate = resourcePacks.filter((pack) =>
      hasResourcePackUpdate(pack),
    );
    if (packsToUpdate.length === 0 || loadingOperation) return;

    setLoadingOperation(true);

    setUpdatingPacks(new Set(packsToUpdate.map((pack) => pack.filename)));

    try {
      for (const pack of packsToUpdate) {
        const updateVersion = getResourcePackUpdateVersion(pack);
        if (!updateVersion) continue;

        try {
          console.log(
            `Updating resource pack ${pack.filename} to version ${updateVersion.version_number}`,
          );

          await invoke("update_resourcepack_from_modrinth", {
            profileId: profile.id,
            resourcepack: pack,
            newVersionDetails: updateVersion,
          });

          console.log(
            `Successfully updated resource pack ${pack.filename} to version ${updateVersion.version_number}`,
          );

          if (pack.sha1_hash) {
            const newUpdates = { ...resourcePackUpdates };
            delete newUpdates[pack.sha1_hash];
            setResourcePackUpdates(newUpdates);
          }

          setUpdatingPacks((prev) => {
            const updated = new Set(prev);
            updated.delete(pack.filename);
            return updated;
          });
        } catch (err) {
          console.error(`Failed to update ${pack.filename}:`, err);
        }
      }

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to update all packs:", err);
      setResourcePacksError(
        `Failed to update all packs: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
      setUpdatingPacks(new Set());
    }
  };

  const deletePack = async (packId: string) => {
    if (loadingOperation) return;

    const pack = resourcePacks.find((p) => p.filename === packId);
    if (!pack || !pack.path) return;

    if (
      !confirm(
        `Are you sure you want to delete "${pack.filename}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setLoadingOperation(true);

    try {
      await invoke("delete_file", {
        filePath: pack.path,
      });

      setResourcePacks((packs) => packs.filter((p) => p.filename !== packId));
      setSelectedPacks((prev) => {
        const updated = new Set(prev);
        updated.delete(packId);
        return updated;
      });

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to delete pack:", err);
      setResourcePacksError(
        `Failed to delete pack: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const openPackDirectory = async (path: string) => {
    if (loadingOperation) return;
    setLoadingOperation(true);

    try {
      await invoke("open_file_directory", {
        filePath: path,
      });
    } catch (err) {
      console.error("Failed to open directory:", err);
      setResourcePacksError(
        `Failed to open directory: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const enableSelectedPacks = async () => {
    if (selectedPacks.size === 0 || loadingOperation) return;
    setLoadingOperation(true);

    try {
      const promises = Array.from(selectedPacks).map(async (packId) => {
        const pack = resourcePacks.find((p) => p.filename === packId);
        if (!pack || !pack.path || !pack.is_disabled) return;

        return invoke("set_file_enabled", {
          filePath: pack.path,
          enabled: true,
        });
      });

      await Promise.all(promises);

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to enable selected packs:", err);
      setResourcePacksError(
        `Failed to enable selected packs: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const disableSelectedPacks = async () => {
    if (selectedPacks.size === 0 || loadingOperation) return;
    setLoadingOperation(true);

    try {
      const promises = Array.from(selectedPacks).map(async (packId) => {
        const pack = resourcePacks.find((p) => p.filename === packId);
        if (!pack || !pack.path || pack.is_disabled) return;

        return invoke("set_file_enabled", {
          filePath: pack.path,
          enabled: false,
        });
      });

      await Promise.all(promises);

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to disable selected packs:", err);
      setResourcePacksError(
        `Failed to disable selected packs: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const deleteSelectedPacks = async () => {
    if (selectedPacks.size === 0 || loadingOperation) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPacks.size} selected resource pack${
          selectedPacks.size !== 1 ? "s" : ""
        }? This cannot be undone.`,
      )
    ) {
      return;
    }

    setLoadingOperation(true);

    try {
      const promises = Array.from(selectedPacks).map(async (packId) => {
        const pack = resourcePacks.find((p) => p.filename === packId);
        if (!pack || !pack.path) return;

        return invoke("delete_file", {
          filePath: pack.path,
        });
      });

      await Promise.all(promises);

      setResourcePacks((packs) =>
        packs.filter((p) => !selectedPacks.has(p.filename)),
      );
      setSelectedPacks(new Set());

      fetchResourcePacks();
    } catch (err) {
      console.error("Failed to delete selected packs:", err);
      setResourcePacksError(
        `Failed to delete selected packs: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingOperation(false);
    }
  };

  const handleSelectPack = (packId: string) => {
    setSelectedPacks((prev) => {
      const updated = new Set(prev);
      if (updated.has(packId)) {
        updated.delete(packId);
      } else {
        updated.add(packId);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedPacks.size === filteredPacks.length) {
      setSelectedPacks(new Set());
    } else {
      setSelectedPacks(new Set(filteredPacks.map((pack) => pack.filename)));
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

  const filteredPacks = resourcePacks.filter((pack) =>
    pack.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedPacks = [...filteredPacks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.filename.localeCompare(b.filename);
        break;
      case "enabled":
        comparison =
          Number(a.is_disabled === true) - Number(b.is_disabled === true);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const enabledPacks = filteredPacks.filter(
    (p) => p.is_disabled !== true,
  ).length;

  // Count packs with updates
  const packsWithUpdates = resourcePacks.filter((pack) =>
    hasResourcePackUpdate(pack),
  ).length;

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex-shrink-0 flex items-center justify-between mb-5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="search resource packs..."
        />

        <div className="flex items-center gap-4">
          {selectedPacks.size > 0 && (
            <>
              <ActionButton
                icon="pixel:check"
                label="enable selected"
                onClick={enableSelectedPacks}
                disabled={loadingOperation}
              >
                ({selectedPacks.size})
              </ActionButton>
              <ActionButton
                icon="pixel:times"
                label="disable selected"
                onClick={disableSelectedPacks}
                disabled={loadingOperation}
              >
                ({selectedPacks.size})
              </ActionButton>
            </>
          )}
          <ActionButton
            icon="pixel:arrow-up"
            label="check updates"
            onClick={checkForResourcePackUpdates}
            disabled={checkingUpdates || loadingOperation}
          />
          {packsWithUpdates > 0 && (
            <ActionButton
              icon="pixel:cloud-download-solid"
              onClick={updateAllPacks}
              disabled={loadingOperation}
              className={cn(
                loadingOperation && updatingPacks.size > 0
                  ? "bg-green-500/20 border-green-500/30 text-green-400"
                  : "",
              )}
            >
              {loadingOperation && updatingPacks.size > 0 ? (
                <span className="flex items-center gap-1">
                  <Icon
                    icon="pixel:circle-notch-solid"
                    className="w-4 h-4 animate-spin"
                  />
                  ({updatingPacks.size}/{packsWithUpdates})
                </span>
              ) : (
                `(${packsWithUpdates})`
              )}
            </ActionButton>
          )}
          <ActionButton
            icon="pixel:trash-solid"
            label="delete selected"
            onClick={deleteSelectedPacks}
            disabled={selectedPacks.size === 0 || loadingOperation}
            danger
          >
            ({selectedPacks.size})
          </ActionButton>
        </div>
      </div>

      {updateError && (
        <div className="flex-shrink-0 bg-red-900/50 border border-red-700/50 text-white p-3 mb-4 rounded">
          <div className="flex items-center gap-2">
            <Icon
              icon="pixel:exclamation-triangle-solid"
              className="w-5 h-5 text-red-400"
            />
            <span>Error checking for updates: {updateError}</span>
          </div>
        </div>
      )}

      {/* Flexible content area that takes remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ContentTable
          headers={[
            {
              key: "name",
              label: "name",
              sortable: true,
              width: "flex-1",
              className: "px-6",
            },
            {
              key: "enabled",
              label: "status",
              sortable: true,
              width: "w-16",
              className: "text-center justify-center",
            },
            {
              key: "actions",
              label: "actions",
              sortable: false,
              width: "w-24",
              className: "text-center",
            },
          ]}
          sortKey={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedCount={selectedPacks.size}
          totalCount={resourcePacks.length}
          filteredCount={filteredPacks.length}
          enabledCount={enabledPacks}
          onSelectAll={handleSelectAll}
          contentType="resourcepack"
          searchQuery={searchQuery}
        >
          {loadingResourcePacks ? (
            <LoadingState message="loading resource packs..." />
          ) : resourcePacksError ? (
            <ErrorState
              message={resourcePacksError}
              onRetry={fetchResourcePacks}
            />
          ) : sortedPacks.length > 0 ? (
            sortedPacks.map((pack) => {
              const hasUpdate = hasResourcePackUpdate(pack);
              const updateVersion = hasUpdate
                ? getResourcePackUpdateVersion(pack)
                : null;
              const isUpdating = updatingPacks.has(pack.filename);

              return (
                <ContentPackRow
                  key={pack.filename}
                  contentPack={{
                    id: pack.filename,
                    file_name: pack.filename,
                    filename: pack.filename, // Ensure filename is passed
                    enabled: !pack.is_disabled,
                    path: pack.path,
                    file_size: pack.file_size,
                    modrinth_info: pack.modrinth_info,
                    sha1_hash: pack.sha1_hash || "",
                    is_disabled: pack.is_disabled,
                    version: pack.modrinth_info?.version_number,
                  }}
                  isSelected={selectedPacks.has(pack.filename)}
                  onSelect={() => handleSelectPack(pack.filename)}
                  onToggle={() => togglePackEnabled(pack.filename)}
                  onDelete={() => deletePack(pack.filename)}
                  onOpenDirectory={
                    pack.path ? () => openPackDirectory(pack.path!) : undefined
                  }
                  onUpdate={hasUpdate ? updatePack : undefined}
                  updateVersion={updateVersion}
                  checkingUpdates={checkingUpdates || isUpdating}
                  iconType="pixel:image-solid"
                  formatFileSize={formatFileSize}
                  onCheckForUpdates={checkForResourcePackUpdates}
                />
              );
            })
          ) : (
            <EmptyState
              icon="pixel:image-solid"
              message={
                searchQuery
                  ? "no resource packs match your search"
                  : "no resource packs installed"
              }
            />
          )}
        </ContentTable>
      </div>
    </div>
  );
}
