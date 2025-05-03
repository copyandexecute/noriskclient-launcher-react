"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../../lib/utils";
import type { Mod } from "../../../types/profile";
import { ToggleSwitch } from "./common/ToggleSwitch";
import { invoke } from "@tauri-apps/api/core";
import type { ModrinthVersion } from "../../../types/modrinth";

interface ModRowProps {
  mod: Mod;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate?: (mod: Mod, version: ModrinthVersion) => void;
  updateVersion?: ModrinthVersion | null;
  checkingUpdates?: boolean;
}

export function ModRow({
  mod,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
  onUpdate,
  updateVersion,
}: ModRowProps) {
  const [, setIsHovered] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [localIcon, setLocalIcon] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchModIcon = async () => {
      try {
        if (mod.source?.type === "modrinth" && mod.source.project_id) {
          try {
            const projectDetails = await invoke<any[]>(
              "get_modrinth_project_details",
              {
                ids: [mod.source.project_id],
              },
            );

            if (projectDetails && projectDetails[0]?.icon_url) {
              setIconUrl(projectDetails[0].icon_url);
              return;
            }
          } catch (error) {
            console.error("Failed to fetch Modrinth icon:", error);
          }
        }

        try {
          if (mod.source?.type === "local" && mod.source.file_name) {
            const iconsResult = await invoke<Record<string, string | null>>(
              "get_icons_for_norisk_mods",
              {
                mods: [{ filePath: mod.source.file_name }],
                minecraftVersion: mod.game_versions,
                loader: mod.associated_loader,
              },
            );

            if (iconsResult && iconsResult[mod.source.file_name]) {
              setLocalIcon(iconsResult[mod.source.file_name]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch local mod icon:", error);
        }
      } catch (error) {
        console.error("Error in icon fetching process:", error);
      }
    };

    fetchModIcon();
  }, [mod]);

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDelete();
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
    }
  };

  const handleUpdate = async () => {
    if (!updateVersion || !onUpdate) return;

    setIsUpdating(true);
    try {
      await onUpdate(mod, updateVersion);
    } finally {
      setIsUpdating(false);
    }
  };

  const hasUpdate =
    !!updateVersion && updateVersion.version_number !== mod.version;

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
          {iconUrl ? (
            <img
              src={iconUrl || "/placeholder.svg"}
              alt={mod.display_name || "Mod icon"}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setIconUrl(null)}
            />
          ) : localIcon ? (
            <img
              src={`data:image/png;base64,${localIcon}`}
              alt={mod.display_name || "Mod icon"}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setLocalIcon(null)}
            />
          ) : (
            <Icon icon="pixel:cube" className="w-7 h-7 text-white/60" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-white font-minecraft text-lg lowercase tracking-wide truncate flex items-center gap-2">
            {mod.display_name || "unknown mod"}
            {hasUpdate && (
              <span
                onClick={handleUpdate}
                className=" cursor-pointer tbg-green-500/20 border border-green-500/30 text-green-400 text-xs px-1.5 py-0.5 rounded-sm "
              >
                update
              </span>
            )}
          </div>
          <div className="text-white/60 text-base lowercase truncate">
            {mod.source?.type === "modrinth"
              ? mod.source.project_id
              : mod.source?.type === "local"
                ? mod.source.file_name
                : mod.source?.type || "unknown"}
          </div>
        </div>
      </div>

      <div className="w-28 text-white/70 text-base font-minecraft tracking-wide flex items-center gap-1">
        {mod.version || "?"}
      </div>

      <div className="w-28 flex justify-center">
        <ToggleSwitch
          enabled={mod.enabled}
          onChange={onToggle}
          title={mod.enabled ? "Disable mod" : "Enable mod"}
        />
      </div>

      <div className="w-20 flex items-center justify-center gap-1">
        <button
          className={cn(
            "w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all",
            isConfirmingDelete && "bg-red-500/50 text-white",
          )}
          onClick={handleDelete}
          title={
            isConfirmingDelete
              ? "Click again to confirm deletion"
              : "Delete mod"
          }
        >
          <Icon icon="pixel:trash-solid" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
