"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import motdParser from "@sfirew/minecraft-motd-parser";
import { Button } from "../../ui/buttons/Button";
import { IconButton } from "../../ui/buttons/IconButton";
import { Select } from "../../ui/Select";
import { useThemeStore } from "../../../store/useThemeStore";
import { useProfileStore } from "../../../store/profile-store";
import { SearchInput } from "../../ui/SearchInput";
import { LoadingState } from "../../ui/LoadingState";
import { EmptyState } from "../../ui/EmptyState";
import { gsap } from "gsap";
import { TagBadge } from "../../ui/TagBadge";
import { CopyWorldDialog } from "../../modals/CopyWorldDialog";
import { ConfirmDeleteDialog } from "../../modals/ConfirmDeleteDialog";
import { toast } from "react-hot-toast";

// --- Import Real Types ---
import type {
  ServerInfo,
  ServerPingInfo,
  WorldInfo,
} from "../../../types/minecraft";
import type { Profile, CopyWorldParams } from "../../../types/profile";
import { timeAgo } from "../../../utils/time-utils";
import * as WorldService from "../../../services/world-service";
import {
  getDifficultyString,
  getGameModeString,
} from "../../../services/world-service";

const notificationStore = {
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

interface WorldsTabProps {
  profile: Profile;
  onRefresh?: () => void;
  isActive?: boolean;
  searchQuery?: string;
  onLaunchRequest?: (params: {
    profileId: string;
    quickPlaySingleplayer?: string;
    quickPlayMultiplayer?: string;
  }) => void;
}

type DisplayItem =
  | (WorldInfo & { type: "world" })
  | (ServerInfo & { type: "server" });

export function WorldsTab({
  profile,
  onRefresh,
  isActive = false,
  searchQuery = "",
  onLaunchRequest,
}: WorldsTabProps) {
  const allProfilesFromStore = useProfileStore((state) => state.profiles);
  const isLoadingProfilesFromStore = useProfileStore((state) => state.loading);

  // --- State ---
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverPings, setServerPings] = useState<
    Record<string, ServerPingInfo>
  >({});
  const [pingingServers, setPingingServers] = useState<Set<string>>(new Set());
  
  // --- Copy Dialog State ---
  const [isCopyWorldDialogOpen, setIsCopyWorldDialogOpen] = useState(false);
  const [worldToCopy, setWorldToCopy] = useState<WorldInfo | null>(null);
  const [isCopyingWorld, setIsCopyingWorld] = useState(false);
  const [copyWorldError, setCopyWorldError] = useState<string | null>(null);
  // --- End Copy Dialog State ---

  // --- Delete Dialog State ---
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [worldToDelete, setWorldToDelete] = useState<WorldInfo | null>(null);
  const [isActuallyDeleting, setIsActuallyDeleting] = useState(false);
  // --- End Delete Dialog State ---

  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"all" | "worlds" | "servers">(
    "servers",
  );
  const [sortOrder, setSortOrder] = useState<"recent" | "name">("recent");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const accentColor = useThemeStore((state) => state.accentColor);

  const containerRef = useRef<HTMLDivElement>(null);

  // Use parent's search query if provided
  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (containerRef.current && isActive) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, [isActive]);

  const getWorldDisplayName = useCallback((world: WorldInfo): string => {
    return world.display_name || world.folder_name;
  }, []);

  const getWorldIconSrc = useCallback((world: WorldInfo): string | null => {
    if (world.icon_path) {
      try {
        return convertFileSrc(world.icon_path);
      } catch (err) {
        console.error(`Failed to convert icon path ${world.icon_path}:`, err);
        return null;
      }
    }
    return null;
  }, []);

  const getServerDisplayName = useCallback((server: ServerInfo): string => {
    return server.name || server.address || "Unnamed Server";
  }, []);

  const getServerIconSrc = useCallback(
    (server: ServerInfo): string | null => {
      const pingInfo = server.address ? serverPings[server.address] : null;
      const iconData = pingInfo?.favicon_base64 || server.icon_base64;
      if (iconData) {
        return iconData.startsWith("data:image")
          ? iconData
          : `data:image/png;base64,${iconData}`;
      }
      return null;
    },
    [serverPings],
  );

  const parseMotdToHtml = useCallback((motd: any): string => {
    if (!motd) return '<span class="text-white/50">No description</span>';
    try {
      const html = motdParser.autoToHTML(motd);
      return html || '<span class="text-white/50">No description</span>';
    } catch (err) {
      console.error("Failed to parse MOTD:", err);
      if (typeof motd === "string") {
        const cleaned = motdParser.cleanCodes(motd);
        // Basic HTML escape
        return cleaned
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }
      try {
        return JSON.stringify(motd);
      } catch (e) {}
      return '<span class="text-red-400">Invalid MOTD format</span>';
    }
  }, []);

  const updateDisplayItems = useCallback(
    (currentWorlds: WorldInfo[], currentServers: ServerInfo[]) => {
      const typedWorlds: DisplayItem[] = currentWorlds.map((w) => ({
        ...w,
        type: "world",
      }));
      const typedServers: DisplayItem[] = currentServers.map((s) => ({
        ...s,
        type: "server",
      }));

      let filteredItems: DisplayItem[] = [];

      if (activeTab === "all") {
        filteredItems = [...typedWorlds, ...typedServers];
      } else if (activeTab === "worlds") {
        filteredItems = [...typedWorlds];
      } else if (activeTab === "servers") {
        filteredItems = [...typedServers];
      }

      // Apply search filter
      const effectiveSearchQuery = searchQuery || localSearchQuery;
      if (effectiveSearchQuery) {
        filteredItems = filteredItems.filter((item) => {
          const name =
            item.type === "world"
              ? getWorldDisplayName(item).toLowerCase()
              : getServerDisplayName(item).toLowerCase();
          return name.includes(effectiveSearchQuery.toLowerCase());
        });
      }

      filteredItems.sort((a, b) => {
        if (sortOrder === "recent") {
          if (a.type === "world" && b.type === "world") {
            return (b.last_played ?? 0) - (a.last_played ?? 0);
          } else if (a.type === "world" && b.type === "server") {
            return -1;
          } else if (a.type === "server" && b.type === "world") {
            return 1;
          }
        }

        const nameA =
          a.type === "world"
            ? getWorldDisplayName(a).toLowerCase()
            : getServerDisplayName(a).toLowerCase();
        const nameB =
          b.type === "world"
            ? getWorldDisplayName(b).toLowerCase()
            : getServerDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setDisplayItems(filteredItems);
    },
    [
      getServerDisplayName,
      getWorldDisplayName,
      activeTab,
      sortOrder,
      searchQuery,
      localSearchQuery,
    ],
  );

  const pingAllServers = useCallback(async (serversToPing: ServerInfo[]) => {
    const relevantServers = serversToPing.filter((s) => s.address);
    if (relevantServers.length === 0) return;

    console.log(`[WorldsTab] Pinging ${relevantServers.length} servers...`);
    const currentPinging = new Set<string>(
      relevantServers.map((s) => s.address!),
    );
    setPingingServers(currentPinging);
    setServerPings((prev) => {
      const next = { ...prev };
      relevantServers.forEach((s) => {
        if (s.address) delete next[s.address];
      });
      return next;
    });

    const promises = relevantServers.map(async (server) => {
      const address = server.address!;
      try {
        const pingResult = await WorldService.pingMinecraftServer(address);
        setServerPings((prev) => ({ ...prev, [address]: pingResult }));
      } catch (err) {
        console.error(`[WorldsTab] Failed to ping ${address}:`, err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorResult: ServerPingInfo = {
          error: errorMsg,
          description: null,
          description_json: null,
          version_name: null,
          version_protocol: null,
          players_online: null,
          players_max: null,
          favicon_base64: null,
          latency_ms: null,
        };
        setServerPings((prev) => ({ ...prev, [address]: errorResult }));
      } finally {
        setPingingServers((prev) => {
          const next = new Set(prev);
          next.delete(address);
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    console.log("[WorldsTab] All server pings finished.");
  }, []);

  const loadData = useCallback(async () => {
    const currentProfileId = profile?.id;
    if (!currentProfileId) {
      setWorlds([]);
      setServers([]);
      setDisplayItems([]);
      setError(null);
      setServerPings({});
      setPingingServers(new Set());
      return;
    }
    console.log(`[WorldsTab] Loading data for profile: ${currentProfileId}`);
    setLoading(true);
    setError(null);
    setServerPings({});
    setPingingServers(new Set());

    try {
      const [worldsResult, serversResult] = await Promise.allSettled([
        WorldService.getWorldsForProfile(currentProfileId),
        WorldService.getServersForProfile(currentProfileId),
      ]);

      let currentWorlds: WorldInfo[] = [];
      let currentServers: ServerInfo[] = [];
      let loadError = false;
      const errorMessages: string[] = [];

      if (worldsResult.status === "fulfilled") {
        currentWorlds = worldsResult.value;
        setWorlds(currentWorlds);
      } else {
        console.error("Worlds Error:", worldsResult.reason);
        errorMessages.push(`Worlds: ${worldsResult.reason}`);
        loadError = true;
      }

      if (serversResult.status === "fulfilled") {
        currentServers = serversResult.value;
        setServers(currentServers);
      } else {
        console.error("Servers Error:", serversResult.reason);
        errorMessages.push(`Servers: ${serversResult.reason}`);
        loadError = true;
      }

      if (loadError) {
        setError(errorMessages.join("; "));
        setDisplayItems([]);
      } else {
        updateDisplayItems(currentWorlds, currentServers);
        pingAllServers(currentServers);
      }
    } catch (err) {
      console.error("Unexpected load error:", err);
      setError(`Unexpected error: ${err}`);
      setDisplayItems([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, updateDisplayItems, pingAllServers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (profile?.id) {
      updateDisplayItems(worlds, servers);
    }
  }, [
    activeTab,
    sortOrder,
    profile?.id,
    updateDisplayItems,
    worlds,
    servers,
    searchQuery,
    localSearchQuery,
  ]);

  const handleLaunch = useCallback(
    (item: DisplayItem) => {
      const currentProfileId = profile?.id;
      if (!currentProfileId || !onLaunchRequest) return;
      if (item.type === "world")
        onLaunchRequest({
          profileId: currentProfileId,
          quickPlaySingleplayer: item.folder_name,
        });
      else if (item.type === "server" && item.address)
        onLaunchRequest({
          profileId: currentProfileId,
          quickPlayMultiplayer: item.address,
        });
    },
    [profile?.id, onLaunchRequest],
  );

  const handleOpenCopyDialog = useCallback(async (world: WorldInfo) => {
    setWorldToCopy(world);
    setCopyWorldError(null);
    setIsCopyWorldDialogOpen(true);
  }, []);

  const handleCloseCopyDialog = useCallback(() => {
    setIsCopyWorldDialogOpen(false);
    setWorldToCopy(null);
  }, []);

  const handleConfirmCopyWorld = useCallback(async (params: { targetProfileId: string; targetWorldName: string }) => {
    if (!worldToCopy || !profile?.id) return;

    setIsCopyingWorld(true);
    setCopyWorldError(null);

    const copyParams: CopyWorldParams = {
      source_profile_id: profile.id,
      source_world_folder: worldToCopy.folder_name,
      target_profile_id: params.targetProfileId,
      target_world_name: params.targetWorldName,
    };

    try {
      await WorldService.copyWorld(copyParams);
      toast.success(`World '${getWorldDisplayName(worldToCopy)}' copied successfully as '${params.targetWorldName}'!`);
      if (params.targetProfileId === profile.id) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to copy world:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setCopyWorldError(`Copy failed: ${errorMsg}`);
      toast.error(`Failed to copy world: ${errorMsg}`);
    } finally {
      setIsCopyingWorld(false);
    }
  }, [worldToCopy, profile?.id, getWorldDisplayName, loadData, handleCloseCopyDialog]);

  const handleDeleteRequest = useCallback((world: WorldInfo) => {
    setWorldToDelete(world);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleCloseDeleteConfirmDialog = useCallback(() => {
    setIsDeleteConfirmOpen(false);
    setWorldToDelete(null);
  }, []);

  const handleConfirmActualDelete = useCallback(async () => {
    if (!worldToDelete || !profile?.id) return;

    setIsActuallyDeleting(true);
    try {
      await WorldService.deleteWorld(profile.id, worldToDelete.folder_name);
      toast.success(`World "${getWorldDisplayName(worldToDelete)}" deleted.`);
      handleCloseDeleteConfirmDialog();
      await loadData();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsActuallyDeleting(false);
    }
  }, [worldToDelete, profile?.id, getWorldDisplayName, loadData, handleCloseDeleteConfirmDialog]);

  const handleRefresh = () => {
    loadData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const effectiveSearchQuery = searchQuery || localSearchQuery;

  return (
    <div ref={containerRef} className="h-full flex flex-col select-none p-4">
      {/* Action bar with transparent styling */}
      <div
        className="flex items-center justify-between mb-4 p-3 rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${accentColor.value}10`,
          borderColor: `${accentColor.value}30`,
        }}
      >
        {/* Only show search if parent isn't providing it */}
        {!searchQuery && (
          <div className="w-full md:w-1/3">
            <SearchInput
              value={localSearchQuery}
              onChange={setLocalSearchQuery}
              placeholder={`search ${activeTab === "all" ? "worlds & servers" : activeTab}...`}
            />
          </div>
        )}

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <Select
              value={sortOrder}
              onChange={(value) => setSortOrder(value as "recent" | "name")}
              options={[
                { value: "recent", label: "Recent" },
                { value: "name", label: "Name" },
              ]}
              className="w-40"
            />

            <Button
              variant="secondary"
              size="sm"
              icon={<Icon icon="solar:filter-bold" />}
              onClick={() =>
                setActiveTab(
                  activeTab === "all"
                    ? "servers"
                    : activeTab === "servers"
                      ? "worlds"
                      : "all",
                )
              }
            >
              {activeTab === "all"
                ? "All"
                : activeTab === "servers"
                  ? "Servers"
                  : "Worlds"}
            </Button>

            <Button
              onClick={() => {
                if (activeTab === "servers" || activeTab === "all") {
                  pingAllServers(servers);
                } else {
                  handleRefresh();
                }
              }}
              disabled={
                (activeTab === "servers" || activeTab === "all") &&
                (pingingServers.size > 0 ||
                  servers.filter((s) => s.address).length === 0)
              }
              variant="secondary"
              size="sm"
              icon={
                pingingServers.size > 0 ? (
                  <Icon icon="solar:refresh-bold" className="animate-spin" />
                ) : (
                  <Icon icon="solar:refresh-bold" />
                )
              }
            >
              refresh
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="p-3 flex items-center gap-2 mb-4 rounded-lg border backdrop-blur-sm"
          style={{
            backgroundColor: `rgba(220, 38, 38, 0.1)`,
            borderColor: `rgba(220, 38, 38, 0.3)`,
          }}
        >
          <Icon
            icon="solar:danger-triangle-bold"
            className="w-5 h-5 text-red-400"
          />
          <span className="text-white font-minecraft text-lg">{error}</span>
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${accentColor.value}08`,
          borderColor: `${accentColor.value}20`,
        }}
      >
        {loading ? (
          <LoadingState
            message={`loading ${activeTab === "all" ? "worlds & servers" : activeTab}...`}
          />
        ) : displayItems.length === 0 ? (
          <EmptyState
            icon={
              activeTab === "worlds"
                ? "solar:planet-bold"
                : activeTab === "servers"
                  ? "solar:server-bold"
                  : "solar:planet-bold"
            }
            message={
              effectiveSearchQuery
                ? `no ${activeTab === "all" ? "worlds or servers" : activeTab} match your search`
                : `no ${activeTab === "all" ? "worlds or servers" : activeTab} found`
            }
            description={
              activeTab === "servers"
                ? "Add servers in the Minecraft game menu"
                : activeTab === "worlds"
                  ? "Create a new world in Minecraft"
                  : "Create worlds or add servers in Minecraft"
            }
          />
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <ul className="divide-y divide-white/10">
              {displayItems.map((item) => {
                const isWorld = item.type === "world";
                const key = isWorld
                  ? item.folder_name
                  : item.address || item.name || Math.random().toString();
                const pingInfo =
                  !isWorld && item.address ? serverPings[item.address] : null;
                const isPinging =
                  !isWorld && item.address
                    ? pingingServers.has(item.address)
                    : false;
                const hasPingError = !!pingInfo?.error;
                const worldIconSrc = isWorld ? getWorldIconSrc(item) : null;
                const serverIconSrc = !isWorld ? getServerIconSrc(item) : null;
                const itemDisplayName = isWorld
                  ? getWorldDisplayName(item)
                  : getServerDisplayName(item);

                return (
                  <li
                    key={key}
                    className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Icon Section */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <div
                        className="absolute inset-0 border-2 border-b-4 overflow-hidden rounded-md"
                        style={{
                          backgroundColor: `${accentColor.value}15`,
                          borderColor: `${accentColor.value}30`,
                          borderBottomColor: `${accentColor.value}50`,
                          boxShadow: `0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}20`,
                        }}
                      >
                        {isWorld ? (
                          worldIconSrc ? (
                            <img
                              src={worldIconSrc || "/placeholder.svg"}
                              alt=""
                              className="w-full h-full object-cover image-pixelated"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon
                                icon="solar:planet-bold"
                                className="w-10 h-10 text-white/50"
                              />
                            </div>
                          )
                        ) : serverIconSrc ? (
                          <img
                            src={serverIconSrc || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover image-pixelated"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon
                              icon="solar:server-bold"
                              className="w-10 h-10 text-white/50"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Section (Description) */}
                    <div className="flex-grow min-w-0 h-24 flex flex-col overflow-hidden">
                      {/* Top: Title */}
                      <h3
                        className="font-minecraft-ten text-base tracking-wide truncate flex-shrink-0"
                        title={itemDisplayName}
                      >
                        {itemDisplayName}
                      </h3>

                      {/* Middle: Subtitle (Last Played / MOTD) - vertically centered */}
                      <div className="flex-grow flex items-center my-1 overflow-hidden">
                        {isWorld ? (
                          <p className="text-white/60 text-xs truncate font-minecraft-ten">
                            {item.last_played
                              ? `Last played: ${timeAgo(item.last_played)}`
                              : "Never played"}
                          </p>
                        ) : (
                          <div
                            className="text-white/70 text-xs motd-container overflow-hidden truncate font-minecraft-ten text-center"
                            title={pingInfo?.description || item.address || ""}
                          >
                            {isPinging ? (
                              <span className="italic text-white/50">
                                Pinging...
                              </span>
                            ) : hasPingError ? (
                              <span className="text-red-400 italic">
                                Error: {pingInfo?.error}
                              </span>
                            ) : pingInfo ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: parseMotdToHtml(
                                    pingInfo?.description_json ||
                                      pingInfo?.description,
                                  ),
                                }}
                              />
                            ) : (
                              <span className="italic text-white/50">
                                {item.address || "Address missing"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom: Tag Badges */}
                      <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
                        {isWorld ? (
                          <>
                            <TagBadge size="sm" variant="info" withIcon>
                              <Icon icon="solar:gamepad-bold-duotone" className="w-3 h-3 mr-0.5" />
                              {getGameModeString(item.game_mode)}
                            </TagBadge>
                            <TagBadge size="sm" variant="default" withIcon>
                              <Icon icon="solar:tuning-square-bold-duotone" className="w-3 h-3 mr-0.5" />
                              {getDifficultyString(item.difficulty)}
                            </TagBadge>
                            {item.is_hardcore && (
                              <TagBadge variant="destructive" size="sm" withIcon>
                                <Icon
                                  icon="solar:skull-bold"
                                  className="w-3 h-3 mr-0.5"
                                />
                                Hardcore
                              </TagBadge>
                            )}
                            {item.difficulty_locked && (
                              <TagBadge size="sm" withIcon>
                                <Icon
                                  icon="solar:lock-bold"
                                  className="w-3 h-3 mr-0.5"
                                />
                                Locked
                              </TagBadge>
                            )}
                            {item.version_name && (
                              <TagBadge size="sm" withIcon>
                                <Icon icon="solar:tag-bold" className="w-3 h-3 mr-0.5" />
                                {item.version_name}
                              </TagBadge>
                            )}
                          </>
                        ) : (
                          <>
                            {isPinging ? (
                              <TagBadge size="sm" variant="default">Pinging...</TagBadge>
                            ) : hasPingError ? (
                              <TagBadge size="sm" variant="destructive">Error</TagBadge>
                            ) : pingInfo ? (() => {
                                let playerCountVariant: "default" | "success" | "info" | "inactive" | "destructive" | "warning" = 'inactive';
                                if (pingInfo.players_online != null) {
                                  if (pingInfo.players_online > 0) {
                                    playerCountVariant = 'success';
                                  } else { // players_online === 0
                                    playerCountVariant = 'default'; 
                                  }
                                }

                                let pingLatencyVariant: "default" | "success" | "info" | "inactive" | "destructive" | "warning" = 'inactive';
                                if (pingInfo.latency_ms != null) {
                                  if (pingInfo.latency_ms <= 80) {
                                    pingLatencyVariant = 'success';
                                  } else if (pingInfo.latency_ms <= 150) {
                                    pingLatencyVariant = 'default';
                                  } else if (pingInfo.latency_ms <= 250) {
                                    pingLatencyVariant = 'warning';
                                  } else { // > 250
                                    pingLatencyVariant = 'destructive';
                                  }
                                }

                                return (
                                  <>
                                    <TagBadge size="sm" withIcon variant={playerCountVariant}>
                                      <Icon
                                        icon="solar:users-group-rounded-bold"
                                        className="w-3 h-3 mr-0.5"
                                      />
                                      {pingInfo.players_online ?? "-"}/
                                      {pingInfo.players_max ?? "-"}
                                    </TagBadge>
                                    <TagBadge size="sm" withIcon variant={pingLatencyVariant}>
                                      <Icon
                                        icon="solar:wifi-bold"
                                        className="w-3 h-3 mr-0.5"
                                      />
                                      {pingInfo.latency_ms ?? "-"} ms
                                    </TagBadge>
                                    {pingInfo.version_name && (
                                      <TagBadge size="sm" withIcon variant="default">
                                        <Icon
                                          icon="solar:tag-bold"
                                          className="w-3 h-3 mr-0.5"
                                        />
                                        {pingInfo.version_name}
                                      </TagBadge>
                                    )}
                                  </>
                                );
                              })() : (
                              <TagBadge size="sm" variant="inactive">Offline / Unknown</TagBadge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Section (Buttons) */}
                    <div className="flex-shrink-0 h-24 flex flex-col items-end justify-center gap-1">
                      <Button
                        onClick={() => handleLaunch(item)}
                        disabled={!isWorld && !item.address}
                        variant="default"
                        size="sm"
                        title={
                          isWorld
                            ? "Play World"
                            : item.address
                              ? "Join Server"
                              : "Address missing"
                        }
                      >
                        {isWorld ? "Play" : "Join"}
                      </Button>
                      {isWorld && (
                        <div className="flex gap-1">
                          <IconButton
                            onClick={() => handleOpenCopyDialog(item)}
                            title="Copy World"
                            disabled={isCopyingWorld}
                            icon={<Icon icon="solar:copy-bold" />}
                            variant="secondary"
                            size="xs"
                          />
                          <IconButton
                            onClick={() => handleDeleteRequest(item)}
                            title="Delete World"
                            disabled={isActuallyDeleting && worldToDelete?.folder_name === item.folder_name}
                            icon={
                              (isActuallyDeleting && worldToDelete?.folder_name === item.folder_name) ? (
                                <Icon
                                  icon="solar:refresh-circle-bold-duotone"
                                  className="animate-spin"
                                />
                              ) : (
                                <Icon icon="solar:trash-bin-trash-bold" />
                              )
                            }
                            variant="destructive"
                            size="xs"
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {isCopyWorldDialogOpen && worldToCopy && profile?.id && (
        <CopyWorldDialog
          isOpen={isCopyWorldDialogOpen}
          sourceWorldName={getWorldDisplayName(worldToCopy)}
          sourceProfileId={profile.id}
          availableProfiles={allProfilesFromStore}
          isLoadingProfiles={isLoadingProfilesFromStore}
          isCopying={isCopyingWorld}
          onClose={handleCloseCopyDialog}
          onConfirm={handleConfirmCopyWorld}
          initialError={copyWorldError}
        />
      )}

      {isDeleteConfirmOpen && worldToDelete && (
        <ConfirmDeleteDialog
          isOpen={isDeleteConfirmOpen}
          itemName={getWorldDisplayName(worldToDelete)}
          onClose={handleCloseDeleteConfirmDialog}
          onConfirm={handleConfirmActualDelete}
          isDeleting={isActuallyDeleting}
        />
      )}
    </div>
  );
}
