"use client";

import { useState, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import motdParser from '@sfirew/minecraft-motd-parser';

// --- Import Real Types ---
import type { 
    WorldInfo, 
    ServerInfo, 
    ServerPingInfo 
} from '../../../types/minecraft';
import type { 
    Profile, 
    CopyWorldParams // Assuming this is defined here
} from '../../../types/profile';
// --- End Imports ---

// --- Import Utils ---
import { timeAgo } from "../../../utils/time-utils"; // Import from util file
// --- End Utils ---

// --- Import World Service ---
import * as WorldService from "../../../services/world-service";
// Import the specific helper functions
import { getGameModeString, getDifficultyString } from "../../../services/world-service";
// --- End Service Import ---

// Assume notificationStore exists globally or imported
const notificationStore = {
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

// --- Component Props ---
interface WorldsTabProps {
  profile: Profile | null;
  onLaunchRequest?: (params: { profileId: string; quickPlaySingleplayer?: string; quickPlayMultiplayer?: string }) => void;
}

// Define combined item type with discriminator
type DisplayItem = (WorldInfo & { type: 'world' }) | (ServerInfo & { type: 'server' });

export function WorldsTab({ profile, onLaunchRequest }: WorldsTabProps) {
  // --- State ---
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverPings, setServerPings] = useState<Record<string, ServerPingInfo>>({});
  const [pingingServers, setPingingServers] = useState<Set<string>>(new Set());
  // Copy Dialog State (Placeholders - Dialog not implemented)
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [worldToCopy, setWorldToCopy] = useState<WorldInfo | null>(null);
  const [copyLoading, setCopyLoading] = useState(false); // TODO: Use this state
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});


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
        return server.name || server.address || 'Unnamed Server';
    }, []);

    const getServerIconSrc = useCallback((server: ServerInfo): string | null => {
        const pingInfo = server.address ? serverPings[server.address] : null;
        const iconData = pingInfo?.favicon_base64 || server.icon_base64;
        if (iconData) {
            return iconData.startsWith('data:image') ? iconData : `data:image/png;base64,${iconData}`;
        }
        return null;
    }, [serverPings]);

    const parseMotdToHtml = useCallback((motd: any): string => {
         if (!motd) return '<span class="text-white/50">No description</span>';
        try {
            const html = motdParser.autoToHTML(motd);
            return html || '<span class="text-white/50">No description</span>';
        } catch (err) {
            console.error('Failed to parse MOTD:', err);
            if (typeof motd === 'string') {
                const cleaned = motdParser.cleanCodes(motd);
                // Basic HTML escape
                return cleaned.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
            }
            try { return JSON.stringify(motd); } catch (e) { /* ignore */ }
            return '<span class="text-red-400">Invalid MOTD format</span>';
        }
    }, []);


  // --- Data Loading and Processing --- //
  const updateDisplayItems = useCallback((currentWorlds: WorldInfo[], currentServers: ServerInfo[]) => {
    // Add the 'type' discriminator here
    const typedWorlds: DisplayItem[] = currentWorlds.map(w => ({ ...w, type: 'world' }));
    const typedServers: DisplayItem[] = currentServers.map(s => ({ ...s, type: 'server' }));

    typedWorlds.sort((a, b) => {
        // Add type guard for sorting worlds
        if (a.type === 'world' && b.type === 'world') {
            return (b.last_played ?? 0) - (a.last_played ?? 0);
        }
        return 0; // Should not happen if array contains only worlds
    });
    typedServers.sort((a, b) => {
        // Add type guard for sorting servers
        if (a.type === 'server' && b.type === 'server') {
           return getServerDisplayName(a).toLowerCase().localeCompare(getServerDisplayName(b).toLowerCase());
        }
        return 0; // Should not happen if array contains only servers
    });

    setDisplayItems([...typedWorlds, ...typedServers]);
  }, [getServerDisplayName]);

   const pingAllServers = useCallback(async (serversToPing: ServerInfo[]) => {
        const relevantServers = serversToPing.filter(s => s.address);
        if (relevantServers.length === 0) return;

        console.log(`[WorldsTab] Pinging ${relevantServers.length} servers...`);
        const currentPinging = new Set<string>(relevantServers.map(s => s.address!));
        setPingingServers(currentPinging); // Set all as pinging initially
        setServerPings(prev => { // Clear previous pings for servers being pinged
            const next = {...prev};
            relevantServers.forEach(s => { if(s.address) delete next[s.address]; });
            return next;
        });

        const promises = relevantServers.map(async (server) => {
            const address = server.address!;
            try {
                // Use service function
                const pingResult = await WorldService.pingMinecraftServer(address);
                setServerPings(prev => ({ ...prev, [address]: pingResult }));
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
                    latency_ms: null 
                 };
                setServerPings(prev => ({ ...prev, [address]: errorResult }));
            } finally {
                 setPingingServers(prev => {
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
      setWorlds([]); setServers([]); setDisplayItems([]); setError(null); setServerPings({}); setPingingServers(new Set()); return;
    }
    console.log(`[WorldsTab] Loading data for profile: ${currentProfileId}`);
    setLoading(true); setError(null); setServerPings({}); setPingingServers(new Set());

    try {
      const [worldsResult, serversResult] = await Promise.allSettled([
         // Use service functions
        WorldService.getWorldsForProfile(currentProfileId),
        WorldService.getServersForProfile(currentProfileId)
      ]);

      let currentWorlds: WorldInfo[] = []; let currentServers: ServerInfo[] = []; let loadError = false; let errorMessages: string[] = [];

      if (worldsResult.status === 'fulfilled') { currentWorlds = worldsResult.value; setWorlds(currentWorlds); }
      else { console.error('Worlds Error:', worldsResult.reason); errorMessages.push(`Worlds: ${worldsResult.reason}`); loadError = true; }

      if (serversResult.status === 'fulfilled') { currentServers = serversResult.value; setServers(currentServers); }
      else { console.error('Servers Error:', serversResult.reason); errorMessages.push(`Servers: ${serversResult.reason}`); loadError = true; }

      if (loadError) { setError(errorMessages.join('; ')); setDisplayItems([]); }
      else { updateDisplayItems(currentWorlds, currentServers); pingAllServers(currentServers); }

    } catch (err) {
      console.error('Unexpected load error:', err); setError(`Unexpected error: ${err}`); setDisplayItems([]);
    } finally { setLoading(false); }
  }, [profile?.id, updateDisplayItems, pingAllServers]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Actions --- //
  const handleLaunch = useCallback((item: DisplayItem) => {
      const currentProfileId = profile?.id;
      if (!currentProfileId || !onLaunchRequest) return;
      if (item.type === 'world') onLaunchRequest({ profileId: currentProfileId, quickPlaySingleplayer: item.folder_name });
      else if (item.type === 'server' && item.address) onLaunchRequest({ profileId: currentProfileId, quickPlayMultiplayer: item.address });
  }, [profile?.id, onLaunchRequest]);

  const handleOpenCopyDialog = useCallback((world: WorldInfo) => {
      console.log(`Opening copy dialog for: ${world.folder_name}`);
      setWorldToCopy(world); setShowCopyDialog(true);
      notificationStore.error("Copy World dialog not implemented.");
      setTimeout(() => setShowCopyDialog(false), 500);
  }, []);

   const handleDelete = useCallback(async (world: WorldInfo) => {
      const currentProfileId = profile?.id;
      if (!currentProfileId || !window.confirm(`Delete world "${getWorldDisplayName(world)}"?`)) return;
      console.log(`Deleting world: ${world.folder_name}`);
      setDeleteLoading(prev => ({ ...prev, [world.folder_name]: true }));
      try {
          // Use service function
          await WorldService.deleteWorld(currentProfileId, world.folder_name);
          notificationStore.success(`World "${getWorldDisplayName(world)}" deleted.`);
          await loadData();
      } catch (err) { console.error("Delete failed:", err); notificationStore.error(`Delete failed: ${err}`);
      } finally { setDeleteLoading(prev => { const n = { ...prev }; delete n[world.folder_name]; return n; }); }
  }, [profile?.id, getWorldDisplayName, loadData]);


  // --- Render --- //
  return (
    <div className="h-full select-none flex flex-col text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="font-minecraft text-xl lowercase tracking-wide">worlds & servers</h2>
        <button
          className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 border-white/30 px-4 py-1.5 font-minecraft text-base flex items-center gap-2 transition-colors"
          onClick={() => pingAllServers(servers)}
          disabled={pingingServers.size > 0 || servers.filter(s => s.address).length === 0}
          title={servers.filter(s => s.address).length === 0 ? "No servers to ping" : "Refresh server status"}
        >
          {pingingServers.size > 0 ? (
            <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
          ) : (
            <Icon icon="pixel:refresh-solid" className="w-4 h-4" />
          )}
          <span>refresh</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-3 pr-3 min-h-0"> {/* Ensure parent has height and min-h-0 */}
          {loading ? (
             <div className="flex items-center justify-center h-32 text-white/70">
                 <Icon icon="pixel:spinner-solid" className="w-6 h-6 animate-spin mr-2" /> Loading...
            </div>
          ) : error ? (
             <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-300">Error: {error}</div>
          ) : displayItems.length === 0 ? (
             <div className="text-center py-10 text-white/50 font-minecraft text-lg lowercase">No worlds or servers found</div>
          ) : (
            <ul className="space-y-3">
                 {displayItems.map((item) => {
                    // Type guard is now essential
                    const isWorld = item.type === 'world';
                    const key = isWorld ? item.folder_name : item.address || item.name || Math.random().toString();
                    const pingInfo = !isWorld && item.address ? serverPings[item.address] : null;
                    const isPinging = !isWorld && item.address ? pingingServers.has(item.address) : false;
                    const hasPingError = !!(pingInfo?.error);
                    const worldIconSrc = isWorld ? getWorldIconSrc(item) : null;
                    // Pass item directly if needed, or specific props based on type guard
                    const serverIconSrc = !isWorld ? getServerIconSrc(item) : null; 
                    const itemDisplayName = isWorld ? getWorldDisplayName(item) : getServerDisplayName(item);

                    return (
                         <li
                            key={key}
                            className="bg-black/20 border-2 border-white/20 p-3 flex items-start gap-3 hover:border-white/30 transition-colors"
                        >
                            {/* Icon */}
                             <div className="w-12 h-12 bg-black/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {isWorld ? (
                                    worldIconSrc ? <img src={worldIconSrc} alt="" className="w-full h-full object-cover image-pixelated" /> : <Icon icon="pixel:globe" className="w-8 h-8 text-white/50" />
                                ) : (
                                    serverIconSrc ? <img src={serverIconSrc} alt="" className="w-full h-full object-cover image-pixelated" /> : <Icon icon="pixel:server" className="w-8 h-8 text-white/50" />
                                )}
              </div>

                            {/* Details */}
                             <div className="flex-grow min-w-0">
                                 <h3 className="font-minecraft text-lg lowercase tracking-wide truncate" title={itemDisplayName}>
                                     {itemDisplayName}
                </h3>
                                 {isWorld ? (
                                      // Access world-specific props safely
                                      <>
                                        <p className="text-white/60 text-base mt-1"> 
                                          {item.last_played ? `Last played: ${timeAgo(item.last_played)}` : 'Never played'}
                                        </p>
                                        {/* Display Game Mode, Difficulty, Hardcore, Locked status */}
                                        <div className="text-white/50 text-xs mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap">
                                            <span>Mode: {getGameModeString(item.game_mode)}</span>
                                            <span>Difficulty: {getDifficultyString(item.difficulty)}</span>
                                            {item.is_hardcore && (
                                                <span className="text-red-400 font-bold inline-flex items-center gap-1">
                                                    <Icon icon="pixel:skull" className="w-3 h-3" /> Hardcore
                                                </span>
                                            )}
                                            {item.difficulty_locked && (
                                                <span title="Difficulty Locked" className="inline-flex items-center gap-1">
                                                    <Icon icon="pixel:lock" className="w-3 h-3" /> Locked
                                                </span>
                                            )}
                                            {item.version_name && (
                                                <span title={`Version: ${item.version_name}`}>v: {item.version_name}</span>
                                            )}
                                        </div>
                                      </>
                                 ) : (
                                     <>
                                         {/* Access server-specific props safely */}
                                         <div className="text-white/70 text-sm mt-1 motd-container h-8 overflow-hidden" title={pingInfo?.description || item.address || ''}>
                                             {isPinging ? (<span className="italic text-white/50">Pinging...</span>)
                                              : hasPingError ? (<span className="text-red-400 italic">Error: {pingInfo?.error}</span>)
                                              : pingInfo ? (<span dangerouslySetInnerHTML={{ __html: parseMotdToHtml(pingInfo?.description_json || pingInfo?.description) }} />)
                                              : (<span className="italic text-white/50">{item.address || 'Address missing'}</span>)}
              </div>
                                          <div className="text-white/50 text-xs mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap">
                                              {isPinging ? (<span>Pinging...</span>)
                                              : hasPingError ? (<span className="text-red-400">Error</span>)
                                              : pingInfo ? (
                                                  <>
                                                      <span title="Players" className="inline-flex items-center gap-1"><Icon icon="pixel:users" className="w-3 h-3" />{pingInfo.players_online ?? '-'}/{pingInfo.players_max ?? '-'}</span>
                                                       <span title="Latency" className="inline-flex items-center gap-1"><Icon icon="pixel:signal" className="w-3 h-3" />{pingInfo.latency_ms ?? '-'} ms</span>
                                                        {pingInfo.version_name && (<span title="Version" className="inline-flex items-center gap-1"><Icon icon="pixel:tag" className="w-3 h-3" />{pingInfo.version_name}</span>)}
                                                  </>
                                              ) : (<span>Offline / Unknown</span>)}
            </div>
                                     </>
                                 )}
            </div>

                             {/* Actions */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                 <button
                                    onClick={() => handleLaunch(item)}
                                    // Check server address safely
                                    disabled={!isWorld && !item.address} 
                                    title={isWorld ? 'Play World' : (item.address ? 'Join Server' : 'Address missing')}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-4 py-1.5 text-base font-minecraft transition-colors w-full text-center"
                                >{isWorld ? 'Play' : 'Join'}</button>
                                {isWorld && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenCopyDialog(item)}
                                             title="Copy World"
                                             disabled={copyLoading} // Bind disabled state
                                             className="bg-black/20 hover:bg-black/30 border-2 border-white/30 px-2 py-1 text-white/80 hover:text-white text-xs font-minecraft transition-colors flex items-center justify-center"
                                         ><Icon icon="pixel:copy" className="w-3 h-3"/></button>
                                         <button
                                             onClick={() => handleDelete(item)}
                                             title="Delete World"
                                             // Access world-specific props safely
                                             disabled={deleteLoading[item.folder_name]} 
                                             className="bg-red-900/40 hover:bg-red-800/60 border-2 border-red-500/30 px-2 py-1 text-red-300 hover:text-red-200 text-xs font-minecraft transition-colors flex items-center justify-center"
                                         >{deleteLoading[item.folder_name] ? <Icon icon="pixel:spinner-solid" className="w-3 h-3 animate-spin" /> : <Icon icon="pixel:trash" className="w-3 h-3"/>}</button>
            </div>
                                )}
          </div>
                        </li>
                    );
                 })}
            </ul>
          )}
      </div>

       {/* TODO: Add CopyWorldDialog Component Render Here */}

    </div>
  );
}

// Add to global CSS or Tailwind config:
// .image-pixelated { image-rendering: pixelated; image-rendering: crisp-edges; }
// .motd-container span { line-height: 1.2; } /* Basic MOTD line height */
