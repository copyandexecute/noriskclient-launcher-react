"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cn } from "../../../lib/utils";
import { SearchInput } from "./common/SearchInput";
import { ContentTable } from "./common/ContentTable";
import { LoadingState } from "./common/LoadingState";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { ToggleSwitch } from "./common/ToggleSwitch";
import {
  getNoriskPacks,
  getNoriskPacksResolved,
  refreshNoriskPacks,
} from "../../../services/profile-service";
import type { Profile } from "../../../types/profile";
import type { NoriskModpacksConfig } from "../../../types/noriskPacks";
import { Logo } from "../../ui/Logo";

interface NoRiskMod {
  id: string;
  display_name: string;
  description?: string;
  version?: string;
  enabled: boolean;
  icon_url?: string;
  path?: string;
}

interface NoRiskModsTabProps {
  profile: Profile;
  onRefresh?: () => void;
  isActive?: boolean;
}

export function NoRiskModsTab({ profile }: NoRiskModsTabProps) {
  const [noriskMods, setNoriskMods] = useState<NoRiskMod[]>([]);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "enabled" | "version">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [noriskPacksConfig, setNoriskPacksConfig] =
    useState<NoriskModpacksConfig | null>(null);
  const [localIcons, setLocalIcons] = useState<Record<string, string | null>>(
    {},
  );
  const [unlistenFn, setUnlistenFn] = useState<(() => void) | undefined>();

  useEffect(() => {
    const setupEventListeners = async () => {
      const unlisten = await listen<any>("state_event", (event) => {
        const payload = event.payload;

        if (payload.event_type === "trigger_profile_update") {
          const profileId = payload.target_id;
          if (profileId === profile.id) {
            fetchNoriskMods();
          }
        }
      });

      setUnlistenFn(() => unlisten);
      return unlisten;
    };

    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchNoriskPacks();

        try {
          await refreshNoriskPacks();
          await fetchNoriskPacks();
        } catch (refreshError) {}

        await setupEventListeners();
      } catch (error) {
        setError(
          `Failed to load initial data: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  useEffect(() => {
    if (profile.selected_norisk_pack_id && noriskPacksConfig) {
      fetchNoriskMods();
    } else {
      setNoriskMods([]);
      setIsLoading(false);
    }
  }, [profile.id, profile.selected_norisk_pack_id, noriskPacksConfig]);

  const fetchNoriskPacks = async () => {
    try {
      setError(null);

      try {
        const result = await getNoriskPacksResolved();
        setNoriskPacksConfig(result);
      } catch (resolvedError) {
        const basicResult = await getNoriskPacks();
        setNoriskPacksConfig(basicResult);
      }
    } catch (error) {
      setError(
        `Failed to load NoRisk packs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const fetchNoriskMods = async () => {
    if (!profile.selected_norisk_pack_id) {
      setNoriskMods([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      try {
        const modsResult = await invoke<any>("get_norisk_pack_mods", {
          packId: profile.selected_norisk_pack_id,
          gameVersion: profile.game_version,
          loader: profile.loader,
        });

        if (modsResult && Array.isArray(modsResult)) {
          processFetchedMods(modsResult);
        } else if (
          modsResult &&
          modsResult.mods &&
          Array.isArray(modsResult.mods)
        ) {
          processFetchedMods(modsResult.mods);
        } else {
          throw new Error("Unexpected response format from backend");
        }
      } catch (directError) {
        const packDef =
          noriskPacksConfig?.packs[profile.selected_norisk_pack_id];
        if (!packDef) {
          setError(
            `NoRisk pack "${profile.selected_norisk_pack_id}" not found. Try refreshing the packs.`,
          );
          setIsLoading(false);
          return;
        }

        if (
          !packDef.mods ||
          !Array.isArray(packDef.mods) ||
          packDef.mods.length === 0
        ) {
          try {
            const lastResortResult = await invoke<any>("list_norisk_mods", {
              profileId: profile.id,
            });

            if (lastResortResult && Array.isArray(lastResortResult)) {
              processFetchedMods(lastResortResult);
            } else if (
              lastResortResult &&
              lastResortResult.mods &&
              Array.isArray(lastResortResult.mods)
            ) {
              processFetchedMods(lastResortResult.mods);
            } else {
              setError(
                "Could not load NoRisk mods. No mods found in pack definition.",
              );
              setNoriskMods([]);
            }
          } catch (lastResortError) {
            setError(
              `Failed to load NoRisk mods: ${
                lastResortError instanceof Error
                  ? lastResortError.message
                  : String(lastResortError)
              }`,
            );
            setNoriskMods([]);
          }
        } else {
          processFetchedMods(packDef.mods);
        }
      }
    } catch (error) {
      setError(
        `Failed to load NoRisk mods: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isNoriskModDisabled = (packModId: string): boolean => {
    if (
      !profile.selected_norisk_pack_id ||
      !profile.disabled_norisk_mods_detailed
    ) {
      return false;
    }

    return profile.disabled_norisk_mods_detailed.some(
      (identifier) =>
        identifier.pack_id === profile.selected_norisk_pack_id &&
        identifier.mod_id === packModId &&
        identifier.game_version === profile.game_version &&
        identifier.loader === profile.loader,
    );
  };

  const processFetchedMods = async (mods: any[]) => {
    try {
      let compatibleMods = mods;
      if (mods.length > 0) {
        if (mods[0].compatibility) {
          compatibleMods = mods.filter((mod) => {
            const hasGameVersion =
              mod.compatibility && mod.compatibility[profile.game_version];
            const hasLoader =
              hasGameVersion &&
              mod.compatibility[profile.game_version][profile.loader];
            return hasLoader;
          });
        }
      }

      const modsWithStatus = compatibleMods.map((mod) => {
        const isDisabled = isNoriskModDisabled(mod.id);

        return {
          id: mod.id,
          display_name: mod.name || mod.displayName || mod.id,
          description: mod.description,
          version: mod.version,
          enabled: !isDisabled,
          icon_url: mod.icon_url,
          path: mod.path || mod.id,
        };
      });

      setNoriskMods(modsWithStatus);

      if (compatibleMods.length > 0) {
        fetchModIcons(compatibleMods);
      }
    } catch (processError) {
      setError(
        `Error processing mods: ${processError instanceof Error ? processError.message : String(processError)}`,
      );
    }
  };

  const fetchModIcons = async (compatibleMods: any[]) => {
    try {
      if (compatibleMods.length === 0) return;

      const iconsResult = await invoke<Record<string, string | null>>(
        "get_icons_for_norisk_mods",
        {
          mods: compatibleMods,
          minecraftVersion: profile.game_version,
          loader: profile.loader,
        },
      );

      if (iconsResult) {
        setLocalIcons(iconsResult);
      }
    } catch (error) {
      console.error("Failed to fetch mod icons:", error);
    }
  };

  const handleToggleMod = async (modId: string) => {
    if (!profile.selected_norisk_pack_id) return;

    try {
      const mod = noriskMods.find((m) => m.id === modId);
      if (!mod) return;

      const newEnabledState = !mod.enabled;

      await invoke("set_norisk_mod_status", {
        profileId: profile.id,
        packId: profile.selected_norisk_pack_id,
        modId: modId,
        gameVersion: profile.game_version,
        loaderStr: profile.loader,
        disabled: !newEnabledState,
      });

      setNoriskMods(
        noriskMods.map((m) =>
          m.id === modId ? { ...m, enabled: newEnabledState } : m,
        ),
      );
    } catch (error) {
      setError(
        `Failed to toggle mod: ${error instanceof Error ? error.message : String(error)}`,
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

  const handleSort = (criteria: string) => {
    if (sortBy === criteria) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria as any);
      setSortDirection("asc");
    }
  };

  const filteredMods = noriskMods.filter(
    (mod) =>
      mod.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedMods = [...filteredMods].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.display_name.localeCompare(b.display_name);
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

  const currentPackName = profile.selected_norisk_pack_id
    ? noriskPacksConfig?.packs[profile.selected_norisk_pack_id]?.displayName ||
      "Unknown Pack"
    : "No Pack Selected";

  const isExperimental = profile.selected_norisk_pack_id
    ? noriskPacksConfig?.packs[profile.selected_norisk_pack_id]
        ?.isExperimental || false
    : false;

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="search norisk mods..."
          />
          <div className="text-white/70 font-minecraft text-lg">
            pack: <span className="text-white">{currentPackName}</span>
            {isExperimental && (
              <span className="ml-2 text-yellow-400 text-sm">
                (experimental)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4"></div>
      </div>

      {/* Flexible content area that takes remaining height */}
      <div className="flex-1 min-h-0">
        {!profile.selected_norisk_pack_id ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Logo size="md" className="mx-auto mb-4" />
              <p className="text-white/60 font-minecraft text-xl tracking-wide lowercase select-none">
                no norisk pack selected
              </p>
              <p className="text-white/40 font-minecraft text-sm mt-2 tracking-wide lowercase select-none">
                select a norisk pack in profile settings
              </p>
            </div>
          </div>
        ) : (
          <ContentTable
            headers={[
              {
                key: "name",
                label: "name",
                sortable: true,
                width: "flex-1",
                className: "px-3",
              },
              {
                key: "version",
                label: "version",
                sortable: true,
                width: "w-28",
              },
              {
                key: "enabled",
                label: "status",
                sortable: true,
                width: "w-28",
                className: "text-center justify-center",
              },
            ]}
            sortKey={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            selectedCount={selectedMods.size}
            totalCount={noriskMods.length}
            filteredCount={filteredMods.length}
            enabledCount={filteredMods.filter((m) => m.enabled).length}
            onSelectAll={handleSelectAll}
            contentType="norisk mod"
            searchQuery={searchQuery}
          >
            {isLoading ? (
              <LoadingState message="loading norisk mods..." />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchNoriskMods} />
            ) : sortedMods.length > 0 ? (
              sortedMods.map((mod) => (
                <NoRiskModRow
                  key={mod.id}
                  mod={mod}
                  isSelected={selectedMods.has(mod.id)}
                  onSelect={() => handleSelectMod(mod.id)}
                  onToggle={() => handleToggleMod(mod.id)}
                  localIcon={localIcons[mod.id]}
                />
              ))
            ) : (
              <EmptyState
                icon="pixel:shield-solid"
                message={
                  searchQuery
                    ? "no mods match your search"
                    : "no norisk mods available"
                }
              />
            )}
          </ContentTable>
        )}
      </div>
    </div>
  );
}

interface NoRiskModRowProps {
  mod: NoRiskMod;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  localIcon?: string | null;
}

function NoRiskModRow({
  mod,
  isSelected,
  onSelect,
  onToggle,
  localIcon,
}: NoRiskModRowProps) {
  const [, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center py-4 px-5 border-b border-white/10 hover:bg-white/5 transition-colors",
        isSelected && "bg-white/10",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-8 flex justify-center">
        <input
          type="checkbox"
          className="w-5 h-5 accent-white/70 cursor-pointer"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select ${mod.display_name || "mod"}`}
        />
      </div>

      <div className="flex items-center gap-4 flex-1 min-w-0 px-3">
        <div className="w-12 h-12 bg-black/20 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {localIcon ? (
            <img
              src={`data:image/png;base64,${localIcon}`}
              alt={mod.display_name || "Mod icon"}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : mod.icon_url ? (
            <img
              src={mod.icon_url || "/placeholder.svg"}
              alt={mod.display_name || "Mod icon"}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Icon icon="pixel:shield-solid" className="w-7 h-7 text-white/60" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-white font-minecraft text-lg lowercase tracking-wide truncate">
            {mod.display_name || mod.id}
          </div>
          <div className="text-white/60 text-base lowercase truncate">
            {mod.description || "norisk mod"}
          </div>
        </div>
      </div>

      <div className="w-28 text-white/70 text-base font-minecraft tracking-wide">
        {mod.version || "?"}
      </div>

      <div className="w-28 flex justify-center">
        <ToggleSwitch
          enabled={mod.enabled}
          onChange={onToggle}
          title={mod.enabled ? "Disable mod" : "Enable mod"}
        />
      </div>
    </div>
  );
}
