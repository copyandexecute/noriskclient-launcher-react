"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import motdParser from "@sfirew/minecraft-motd-parser";
import { Button } from "../../ui/buttons/Button";
import { IconButton } from "../../ui/buttons/IconButton";
import { Select } from "../../ui/Select";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchInput } from "../../ui/SearchInput";
import { LoadingState } from "../../ui/LoadingState";
import { EmptyState } from "../../ui/EmptyState";
import { gsap } from "gsap";

// --- Import Real Types ---
import type {
  ServerInfo,
  ServerPingInfo,
  WorldInfo,
} from "../../../types/minecraft";
import type { Profile } from "../../../types/profile";
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
  // Copy Dialog State (Placeholders - Dialog not implemented)
  const [, setShowCopyDialog] = useState(false);
  const [, setWorldToCopy] = useState<WorldInfo | null>(null);
  const [copyLoading] = useState(false); // TODO: Use this state
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

  const handleOpenCopyDialog = useCallback((world: WorldInfo) => {
    console.log(`Opening copy dialog for: ${world.folder_name}`);
    setWorldToCopy(world);
    setShowCopyDialog(true);
    notificationStore.error("Copy World dialog not implemented.");
    setTimeout(() => setShowCopyDialog(false), 500);
  }, []);

  const handleDelete = useCallback(
    async (world: WorldInfo) => {
      const currentProfileId = profile?.id;
      if (
        !currentProfileId ||
        !window.confirm(`Delete world "${getWorldDisplayName(world)}"?`)
      )
        return;
      console.log(`Deleting world: ${world.folder_name}`);
      setDeleteLoading((prev) => ({ ...prev, [world.folder_name]: true }));
      try {
        await WorldService.deleteWorld(currentProfileId, world.folder_name);
        notificationStore.success(
          `World "${getWorldDisplayName(world)}" deleted.`,
        );
        await loadData();
      } catch (err) {
        console.error("Delete failed:", err);
        notificationStore.error(`Delete failed: ${err}`);
      } finally {
        setDeleteLoading((prev) => {
          const n = { ...prev };
          delete n[world.folder_name];
          return n;
        });
      }
    },
    [profile?.id, getWorldDisplayName, loadData],
  );

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
                    {/* 3D Image Frame */}
                    <div className="relative w-16 h-16 flex-shrink-0">
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

                    <div className="flex-grow min-w-0">
                      <h3
                        className="font-minecraft text-2xl lowercase tracking-wide truncate"
                        title={itemDisplayName}
                      >
                        {itemDisplayName}
                      </h3>
                      {isWorld ? (
                        <>
                          <p className="text-white/60 text-xl mt-2">
                            {item.last_played
                              ? `Last played: ${timeAgo(item.last_played)}`
                              : "Never played"}
                          </p>
                          <div className="text-white/50 text-lg mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap">
                            <span>
                              Mode: {getGameModeString(item.game_mode)}
                            </span>
                            <span>
                              Difficulty: {getDifficultyString(item.difficulty)}
                            </span>
                            {item.is_hardcore && (
                              <span className="text-red-400 font-bold inline-flex items-center gap-1">
                                <Icon
                                  icon="solar:skull-bold"
                                  className="w-4 h-4"
                                />{" "}
                                Hardcore
                              </span>
                            )}
                            {item.difficulty_locked && (
                              <span
                                title="Difficulty Locked"
                                className="inline-flex items-center gap-1"
                              >
                                <Icon
                                  icon="solar:lock-bold"
                                  className="w-4 h-4"
                                />{" "}
                                Locked
                              </span>
                            )}
                            {item.version_name && (
                              <span title={`Version: ${item.version_name}`}>
                                v: {item.version_name}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="text-white/70 text-xl mt-2 motd-container h-10 overflow-hidden"
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
                          <div className="text-white/50 text-lg mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap">
                            {isPinging ? (
                              <span>Pinging...</span>
                            ) : hasPingError ? (
                              <span className="text-red-400">Error</span>
                            ) : pingInfo ? (
                              <>
                                <span
                                  title="Players"
                                  className="inline-flex items-center gap-2"
                                >
                                  <Icon
                                    icon="solar:users-group-rounded-bold"
                                    className="w-4 h-4"
                                  />
                                  {pingInfo.players_online ?? "-"}/
                                  {pingInfo.players_max ?? "-"}
                                </span>
                                <span
                                  title="Latency"
                                  className="inline-flex items-center gap-2"
                                >
                                  <Icon
                                    icon="solar:wifi-bold"
                                    className="w-4 h-4"
                                  />
                                  {pingInfo.latency_ms ?? "-"} ms
                                </span>
                                {pingInfo.version_name && (
                                  <span
                                    title="Version"
                                    className="inline-flex items-center gap-2"
                                  >
                                    <Icon
                                      icon="solar:tag-bold"
                                      className="w-4 h-4"
                                    />
                                    {pingInfo.version_name}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span>Offline / Unknown</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <Button
                        onClick={() => handleLaunch(item)}
                        disabled={!isWorld && !item.address}
                        variant="default"
                        size="md"
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
                        <div className="flex gap-2">
                          <IconButton
                            onClick={() => handleOpenCopyDialog(item)}
                            title="Copy World"
                            disabled={copyLoading}
                            icon={<Icon icon="solar:copy-bold" />}
                            variant="secondary"
                            size="sm"
                          />
                          <IconButton
                            onClick={() => handleDelete(item)}
                            title="Delete World"
                            disabled={deleteLoading[item.folder_name]}
                            icon={
                              deleteLoading[item.folder_name] ? (
                                <Icon
                                  icon="solar:refresh-circle-bold-duotone"
                                  className="animate-spin"
                                />
                              ) : (
                                <Icon icon="solar:trash-bin-trash-bold" />
                              )
                            }
                            variant="destructive"
                            size="sm"
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
    </div>
  );
}
