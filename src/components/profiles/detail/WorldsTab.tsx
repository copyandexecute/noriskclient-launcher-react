"use client";

import { useCallback, useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import motdParser from "@sfirew/minecraft-motd-parser";

// --- Import Real Types ---
import type {
  ServerInfo,
  ServerPingInfo,
  WorldInfo,
} from "../../../types/minecraft";
import type { Profile } from "../../../types/profile";
// --- End Imports ---
// --- Import Utils ---
import { timeAgo } from "../../../utils/time-utils"; // Import from util file
// --- End Utils ---
// --- Import World Service ---
// Import the specific helper functions
import * as WorldService from "../../../services/world-service";
import {
  getDifficultyString,
  getGameModeString,
} from "../../../services/world-service";
// --- End Service Import ---

// Assume notificationStore exists globally or imported
const notificationStore = {
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

// --- Component Props ---
interface WorldsTabProps {
  profile: Profile | null;
  onLaunchRequest?: (params: {
    profileId: string;
    quickPlaySingleplayer?: string;
    quickPlayMultiplayer?: string;
  }) => void;
}

// Define combined item type with discriminator
type DisplayItem =
  | (WorldInfo & { type: "world" })
  | (ServerInfo & { type: "server" });

export function WorldsTab({ profile, onLaunchRequest }: WorldsTabProps) {
  // --- State ---
  const [, setWorlds] = useState<WorldInfo[]>([]);
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
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"recent" | "name">("recent");

  // --- Helper Functions ---
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
      } catch (e) {
        /* ignore */
      }
      return '<span class="text-red-400">Invalid MOTD format</span>';
    }
  }, []);

  // --- Data Loading and Processing --- //
  const updateDisplayItems = useCallback(
    (currentWorlds: WorldInfo[], currentServers: ServerInfo[]) => {
      // Add the 'type' discriminator here
      const typedWorlds: DisplayItem[] = currentWorlds.map((w) => ({
        ...w,
        type: "world",
      }));
      const typedServers: DisplayItem[] = currentServers.map((s) => ({
        ...s,
        type: "server",
      }));

      let filteredItems: DisplayItem[] = [];

      // Filter based on active tab
      if (activeTab === "all") {
        filteredItems = [...typedWorlds, ...typedServers];
      } else if (activeTab === "worlds") {
        filteredItems = [...typedWorlds];
      } else if (activeTab === "servers") {
        filteredItems = [...typedServers];
      }

      // Sort items
      filteredItems.sort((a, b) => {
        if (sortOrder === "recent") {
          if (a.type === "world" && b.type === "world") {
            return (b.last_played ?? 0) - (a.last_played ?? 0);
          } else if (a.type === "world" && b.type === "server") {
            return -1; // Worlds first
          } else if (a.type === "server" && b.type === "world") {
            return 1; // Worlds first
          }
        }

        // Default to name sorting
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
    [getServerDisplayName, getWorldDisplayName, activeTab, sortOrder],
  );

  const pingAllServers = useCallback(async (serversToPing: ServerInfo[]) => {
    const relevantServers = serversToPing.filter((s) => s.address);
    if (relevantServers.length === 0) return;

    console.log(`[WorldsTab] Pinging ${relevantServers.length} servers...`);
    const currentPinging = new Set<string>(
      relevantServers.map((s) => s.address!),
    );
    setPingingServers(currentPinging); // Set all as pinging initially
    setServerPings((prev) => {
      // Clear previous pings for servers being pinged
      const next = { ...prev };
      relevantServers.forEach((s) => {
        if (s.address) delete next[s.address];
      });
      return next;
    });

    const promises = relevantServers.map(async (server) => {
      const address = server.address!;
      try {
        // Use service function
        const pingResult = await WorldService.pingMinecraftServer(address);
        setServerPings((prev) => ({ ...prev, [address]: pingResult }));
      } catch (err) {
        console.error(`[WorldsTab] Failed to ping ${address}:`, err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        // Create a full ServerPingInfo object for the error state
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
        // Use service functions
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

  // Update display items when tab or sort order changes
  useEffect(() => {
    if (profile?.id) {
      const currentWorlds: WorldInfo[] = [];
      const currentServers: ServerInfo[] = [];
      updateDisplayItems(currentWorlds, currentServers);
    }
  }, [activeTab, sortOrder, profile?.id, updateDisplayItems]);

  // --- Actions --- //
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
        // Use service function
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

  // --- Render --- //
  return (
    <div className="h-full select-none flex flex-col text-white">
      {/* Main container with border */}
      <div className="border-2 border-white/30 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-black/30 border-b-2 border-white/30 py-3 px-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* Tab filters */}
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 min-w-[100px] text-center font-minecraft text-2xl ${
                activeTab === "all"
                  ? "bg-black/20 text-white border-2 border-white/20"
                  : "text-white/70 hover:text-white hover:bg-black/10"
              }`}
              style={{ transition: "none" }}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("worlds")}
              className={`px-4 py-2 min-w-[100px] text-center font-minecraft text-2xl ${
                activeTab === "worlds"
                  ? "bg-black/20 text-white border-2 border-white/20"
                  : "text-white/70 hover:text-white hover:bg-black/10"
              }`}
              style={{ transition: "none" }}
            >
              Worlds
            </button>
            <button
              onClick={() => setActiveTab("servers")}
              className={`px-4 py-2 min-w-[100px] text-center font-minecraft text-2xl ${
                activeTab === "servers"
                  ? "bg-black/20 text-white border-2 border-white/20"
                  : "text-white/70 hover:text-white hover:bg-black/10"
              }`}
              style={{ transition: "none" }}
            >
              Servers
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "recent" | "name")
                }
                className="bg-black/20 backdrop-blur-md border-2 border-white/10 px-4 py-2 text-white font-minecraft text-3xl shadow-sm appearance-none pr-12 tracking-wide"
                aria-label="Sort by"
              >
                <option value="recent" className="text-3xl">
                  Recent
                </option>
                <option value="name" className="text-3xl">
                  Name
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white">
                <Icon icon="pixel:chevron-down" className="w-6 h-6" />
              </div>
            </div>

            {/* Refresh button */}
            <button
              className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 border-white/30 px-5 py-2 font-minecraft text-2xl flex items-center gap-3 transition-colors"
              onClick={() => pingAllServers(servers)}
              disabled={
                pingingServers.size > 0 ||
                servers.filter((s) => s.address).length === 0
              }
              title={
                servers.filter((s) => s.address).length === 0
                  ? "No servers to ping"
                  : "Refresh server status"
              }
            >
              {pingingServers.size > 0 ? (
                <Icon
                  icon="pixel:spinner-solid"
                  className="w-6 h-6 animate-spin"
                />
              ) : (
                <Icon icon="pixel:refresh-solid" className="w-6 h-6" />
              )}
              <span>refresh</span>
            </button>
          </div>
        </div>

        {/* Content Area - Only this part scrolls */}
        <div className="flex-1 overflow-y-auto bg-black/60 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-white/70 text-2xl">
              <Icon
                icon="pixel:spinner-solid"
                className="w-8 h-8 animate-spin mr-3"
              />{" "}
              Loading...
            </div>
          ) : error ? (
            <div className="p-6 bg-red-900/50 border-2 border-red-700 text-red-300 text-2xl">
              Error: {error}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-16 text-white/50 font-minecraft text-3xl lowercase">
              No worlds or servers found
            </div>
          ) : (
            <ul className="divide-y-2 divide-white/10">
              {displayItems.map((item) => {
                // Type guard is now essential
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
                // Pass item directly if needed, or specific props based on type guard
                const serverIconSrc = !isWorld ? getServerIconSrc(item) : null;
                const itemDisplayName = isWorld
                  ? getWorldDisplayName(item)
                  : getServerDisplayName(item);

                return (
                  <li
                    key={key}
                    className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-16 h-16 bg-black/30 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white/10">
                      {isWorld ? (
                        worldIconSrc ? (
                          <img
                            src={worldIconSrc || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover image-pixelated"
                          />
                        ) : (
                          <Icon
                            icon="pixel:globe"
                            className="w-10 h-10 text-white/50"
                          />
                        )
                      ) : serverIconSrc ? (
                        <img
                          src={serverIconSrc || "/placeholder.svg"}
                          alt=""
                          className="w-full h-full object-cover image-pixelated"
                        />
                      ) : (
                        <Icon
                          icon="pixel:server"
                          className="w-10 h-10 text-white/50"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow min-w-0">
                      <h3
                        className="font-minecraft text-3xl lowercase tracking-wide truncate"
                        title={itemDisplayName}
                      >
                        {itemDisplayName}
                      </h3>
                      {isWorld ? (
                        // Access world-specific props safely
                        <>
                          <p className="text-white/60 text-xl mt-2">
                            {item.last_played
                              ? `Last played: ${timeAgo(item.last_played)}`
                              : "Never played"}
                          </p>
                          {/* Display Game Mode, Difficulty, Hardcore, Locked status */}
                          <div className="text-white/50 text-lg mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap">
                            <span>
                              Mode: {getGameModeString(item.game_mode)}
                            </span>
                            <span>
                              Difficulty: {getDifficultyString(item.difficulty)}
                            </span>
                            {item.is_hardcore && (
                              <span className="text-red-400 font-bold inline-flex items-center gap-1">
                                <Icon icon="pixel:skull" className="w-4 h-4" />{" "}
                                Hardcore
                              </span>
                            )}
                            {item.difficulty_locked && (
                              <span
                                title="Difficulty Locked"
                                className="inline-flex items-center gap-1"
                              >
                                <Icon icon="pixel:lock" className="w-4 h-4" />{" "}
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
                          {/* Access server-specific props safely */}
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
                                    icon="pixel:users"
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
                                    icon="pixel:signal"
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
                                      icon="pixel:tag"
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

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleLaunch(item)}
                        // Check server address safely
                        disabled={!isWorld && !item.address}
                        title={
                          isWorld
                            ? "Play World"
                            : item.address
                              ? "Join Server"
                              : "Address missing"
                        }
                        className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed text-white px-6 py-2 text-2xl font-minecraft transition-colors w-full text-center"
                      >
                        {isWorld ? "Play" : "Join"}
                      </button>
                      {isWorld && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleOpenCopyDialog(item)}
                            title="Copy World"
                            disabled={copyLoading} // Bind disabled state
                            className="bg-black/20 hover:bg-black/30 border-2 border-white/30 px-3 py-1.5 text-white/80 hover:text-white text-lg font-minecraft transition-colors flex items-center justify-center"
                          >
                            <Icon icon="pixel:copy" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Delete World"
                            // Access world-specific props safely
                            disabled={deleteLoading[item.folder_name]}
                            className="bg-red-900/40 hover:bg-red-800/60 border-2 border-red-500/30 px-3 py-1.5 text-red-300 hover:text-red-200 text-lg font-minecraft transition-colors flex items-center justify-center"
                          >
                            {deleteLoading[item.folder_name] ? (
                              <Icon
                                icon="pixel:spinner-solid"
                                className="w-5 h-5 animate-spin"
                              />
                            ) : (
                              <Icon icon="pixel:trash" className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/30 border-t-2 border-white/30 py-3 px-4 flex justify-between items-center">
          <div className="text-white/70 font-minecraft text-xl">
            {displayItems.length > 0 ? (
              <>
                {displayItems.length}{" "}
                {activeTab === "all" ? "items" : activeTab}
                {displayItems.length !== 1 && !activeTab.endsWith("s")
                  ? "s"
                  : ""}
              </>
            ) : (
              <span>No items</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "servers" && (
              <span className="text-white/70 font-minecraft text-xl">
                {pingingServers.size > 0 ? (
                  <span className="flex items-center">
                    <Icon
                      icon="pixel:spinner-solid"
                      className="w-5 h-5 animate-spin mr-2"
                    />
                    Pinging servers...
                  </span>
                ) : (
                  <span>{Object.keys(serverPings).length} servers pinged</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add to global CSS or Tailwind config:
// .image-pixelated { image-rendering: pixelated; image-rendering: crisp-edges; }
