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

interface ModsTabProps {
  profile: Profile;
  onRefresh?: () => void;
}

export function ModsTab({ profile, onRefresh }: ModsTabProps) {
  const [mods, setMods] = useState<Mod[]>(profile.mods || []);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "enabled" | "version">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchMods();

    const refreshInterval = setInterval(() => {
      fetchMods();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [profile.id]);

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
        `Are you sure you want to delete ${selectedMods.size} selected mod${selectedMods.size !== 1 ? "s" : ""}? This cannot be undone.`,
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="search mods..."
        />

        <div className="flex items-center gap-2">
          <ActionButton
            icon="pixel:upload-solid"
            label="Import"
            onClick={handleImportLocalMods}
          />
          <ActionButton
            icon="pixel:trash-solid"
            label="delete selected"
            onClick={handleDeleteSelected}
            disabled={selectedMods.size === 0}
            danger
          >
            ({selectedMods.size})
          </ActionButton>
          <ActionButton
            icon="pixel:refresh-solid"
            onClick={fetchMods}
            className="w-10 h-10"
            title="Refresh mods"
          />
        </div>
      </div>

      <ContentTable
        headers={[
          {
            key: "name",
            label: "Name",
            sortable: true,
            width: "flex-1",
            className: "px-2",
          },
          { key: "version", label: "Version", sortable: true, width: "w-24" },
          {
            key: "enabled",
            label: "Status",
            sortable: true,
            width: "w-24",
            className: "text-center justify-center",
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            width: "w-16",
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
            />
          ))
        ) : (
          <EmptyState
            icon="pixel:grid-solid"
            title={
              searchQuery ? "No mods match your search" : "No mods installed"
            }
            // @ts-ignore
            actionLabel={searchQuery ? null : "Import Local Mods"}
            // @ts-ignore
            onAction={searchQuery ? null : handleImportLocalMods}
          />
        )}
      </ContentTable>
    </div>
  );
}
