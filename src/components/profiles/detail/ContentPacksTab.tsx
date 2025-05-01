"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../../../types/profile";
import { SearchInput } from "./common/SearchInput";
import { ActionButton } from "./common/ActionButton";
import { ContentTable } from "./common/ContentTable";
import { LoadingState } from "./common/LoadingState";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { ContentPackRow } from "./ContentPackRow";

interface ContentPack {
  id: string;
  display_name?: string | null;
  file_name: string;
  enabled: boolean;
  icon_url?: string;
  version?: string;
  creator?: string;
  source?: string;
  path?: string;
  file_size?: number;
  is_disabled?: boolean;
}

interface ContentPacksTabProps {
  profile: Profile;
  onRefresh?: () => void;
  contentType: "resourcepack" | "shaderpack";
  title: string;
  icon: string;
  browseUrl: string;
  fetchFunction: (profileId: string) => Promise<ContentPack[]>;
  toggleFunction: (
    profileId: string,
    packId: string,
    enabled: boolean,
  ) => Promise<void>;
  deleteFunction: (profileId: string, packId: string) => Promise<void>;
}

export function ContentPacksTab({
  profile,
  onRefresh,
  contentType,
  title,
  icon,
  browseUrl,
  fetchFunction,
  toggleFunction,
  deleteFunction,
}: ContentPacksTabProps) {
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "enabled">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchPacks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let fetchedPacks: ContentPack[] = [];
      try {
        fetchedPacks = await fetchFunction(profile.id);
      } catch (err) {
        console.error("API error:", err);
        setError(
          `Failed to load ${title}: ${err instanceof Error ? err.message : String(err)}`,
        );
        fetchedPacks = [];
      }

      setPacks(Array.isArray(fetchedPacks) ? fetchedPacks : []);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(`Failed to fetch ${title}:`, error);
      setError(`Failed to load ${title}. Please try again.`);
      setPacks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();

    const refreshInterval = setInterval(() => {
      fetchPacks();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [profile.id]);

  const handleTogglePack = async (packId: string) => {
    try {
      const pack = packs.find((p) => p.id === packId);
      if (!pack) return;

      await toggleFunction(profile.id, packId, !pack.enabled);

      setPacks(
        packs.map((p) => (p.id === packId ? { ...p, enabled: !p.enabled } : p)),
      );
    } catch (error) {
      console.error(`Failed to toggle ${contentType}:`, error);
      setError(
        `Failed to toggle ${contentType}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleDeletePack = async (packId: string) => {
    try {
      await deleteFunction(profile.id, packId);

      setPacks(packs.filter((p) => p.id !== packId));
      setSelectedPacks((prev) => {
        const updated = new Set(prev);
        updated.delete(packId);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to delete ${contentType}:`, error);
      setError(
        `Failed to delete ${contentType}: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      setSelectedPacks(new Set(filteredPacks.map((pack) => pack.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPacks.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPacks.size} selected ${contentType}${
          selectedPacks.size !== 1 ? "s" : ""
        }? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const promises = Array.from(selectedPacks).map((packId) =>
        deleteFunction(profile.id, packId),
      );
      await Promise.all(promises);

      setPacks(packs.filter((p) => !selectedPacks.has(p.id)));
      setSelectedPacks(new Set());
    } catch (error) {
      console.error(`Failed to delete selected ${contentType}s:`, error);
      setError(
        `Failed to delete selected ${contentType}s: ${error instanceof Error ? error.message : String(error)}`,
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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const filteredPacks = packs.filter(
    (pack) =>
      (pack.display_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (pack.creator?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      pack.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pack.file_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedPacks = [...filteredPacks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = (a.display_name || a.file_name || "").localeCompare(
          b.display_name || b.file_name || "",
        );
        break;
      case "enabled":
        comparison = Number(a.enabled) - Number(b.enabled);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="h-full flex flex-col select-none">
      <div className="flex items-center justify-between mb-5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`search ${title}...`}
        />

        <div className="flex items-center gap-3">
          <ActionButton
            icon="pixel:trash-solid"
            label="delete selected"
            onClick={handleDeleteSelected}
            disabled={selectedPacks.size === 0}
            danger
          >
            ({selectedPacks.size})
          </ActionButton>
          <ActionButton
            icon="pixel:refresh-solid"
            onClick={fetchPacks}
            className="w-11 h-11"
            title={`Refresh ${title}`}
          />
        </div>
      </div>

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
        selectedCount={selectedPacks.size}
        totalCount={packs.length}
        filteredCount={filteredPacks.length}
        enabledCount={filteredPacks.filter((p) => p.enabled).length}
        onSelectAll={handleSelectAll}
        contentType={contentType}
        searchQuery={searchQuery}
      >
        {isLoading ? (
          <LoadingState message={`loading ${title}...`} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPacks} />
        ) : sortedPacks.length > 0 ? (
          sortedPacks.map((pack) => (
            <ContentPackRow
              key={pack.id}
              contentPack={pack}
              isSelected={selectedPacks.has(pack.id)}
              onSelect={() => handleSelectPack(pack.id)}
              onToggle={() => handleTogglePack(pack.id)}
              onDelete={() => handleDeletePack(pack.id)}
              formatFileSize={formatFileSize}
              iconType={icon}
            />
          ))
        ) : (
          <EmptyState
            icon={icon}
            title={
              searchQuery
                ? `no ${title} match your search`
                : `no ${title} installed`
            }
            actionLabel={`browse ${title} on modrinth`}
            actionUrl={browseUrl}
          />
        )}
      </ContentTable>
    </div>
  );
}
