"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ToggleSwitch } from "./common/ToggleSwitch";
import type { ModrinthVersion } from "../../../types/modrinth";
import { cn } from "../../../lib/utils";
import { invoke } from "@tauri-apps/api/core";

interface ContentPack {
  id?: string;
  display_name?: string | null;
  file_name?: string;
  enabled?: boolean;
  icon_url?: string;
  version?: string;
  creator?: string;
  source?: string;
  path?: string;
  file_size?: number;
  is_disabled?: boolean;
  sha1_hash?: string;
  modrinth_info?: {
    project_id: string;
    version_id: string;
    name: string;
    version_number: string;
    download_url: string;
  } | null;
  filename?: string;
}

interface ContentPackRowProps {
  contentPack: ContentPack;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onOpenDirectory?: () => void;
  onUpdate?: (packId: string) => void;
  updateVersion?: ModrinthVersion | null;
  checkingUpdates?: boolean;
  iconType?: string;
  formatFileSize?: (size: number) => string;
  onCheckForUpdates?: () => void;
}

export function ContentPackRow({
  contentPack,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
  onOpenDirectory,
  onUpdate,
  updateVersion,
  iconType = "pixel:image-solid",
  formatFileSize,
  onCheckForUpdates,
}: ContentPackRowProps) {
  const [, setIsHovered] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [localIcon, setLocalIcon] = useState<string | null>(null);
  const [, setIsUpdating] = useState(false);

  const extractFileName = (path?: string): string => {
    if (!path) return "Unknown file";
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || "Unknown file";
  };

  const getDisplayName = (): string => {
    if (contentPack.file_name && contentPack.file_name !== "0")
      return contentPack.file_name;

    if (contentPack.path) return extractFileName(contentPack.path);

    if (contentPack.display_name) return contentPack.display_name;

    if (contentPack.modrinth_info?.name) return contentPack.modrinth_info.name;

    return "Unknown pack";
  };

  const getFormattedFileSize = (): string | null => {
    if (contentPack.file_size && contentPack.file_size > 0 && formatFileSize) {
      return formatFileSize(contentPack.file_size);
    }
    return null;
  };

  useEffect(() => {
    const fetchPackIcon = async () => {
      if (contentPack.icon_url) return;

      try {
        if (contentPack.path) {
          const iconsResult = await invoke<Record<string, string | null>>(
            "get_icons_for_archives",
            {
              archivePaths: [contentPack.path],
            },
          );

          if (iconsResult && iconsResult[contentPack.path]) {
            setLocalIcon(iconsResult[contentPack.path]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch content pack icon:", error);
      }
    };

    fetchPackIcon();
  }, [contentPack]);

  useEffect(() => {
    if (
      onCheckForUpdates &&
      contentPack.modrinth_info &&
      contentPack.sha1_hash
    ) {
      onCheckForUpdates();
    }
  }, []);

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete();
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  const handleUpdate = async () => {
    if (!updateVersion || !onUpdate) return;

    setIsUpdating(true);
    try {
      await onUpdate(contentPack.filename || contentPack.id || "");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasUpdate =
    !!updateVersion &&
    contentPack.modrinth_info &&
    updateVersion.id !== contentPack.modrinth_info.version_id;

  const packName = getDisplayName();
  const fileSize = getFormattedFileSize();

  return (
    <div
      className={cn(
        "flex items-center py-4 bg-black/40 px-5 border-b border-white/10 hover:bg-white/5 transition-colors",
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
          aria-label={`Select ${packName}`}
        />
      </div>

      <div className="flex items-center gap-4 flex-1 min-w-0 px-3">
        <div className="w-16 h-16 bg-black/20 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {contentPack.icon_url ? (
            <img
              src={contentPack.icon_url || "/placeholder.svg"}
              alt={packName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setLocalIcon(null)}
            />
          ) : localIcon ? (
            <img
              src={`data:image/png;base64,${localIcon}`}
              alt={packName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setLocalIcon(null)}
            />
          ) : (
            <Icon icon={iconType} className="w-7 h-7 text-white/60" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-white font-minecraft text-3xl lowercase tracking-wide truncate flex items-center gap-2">
            {packName}
            {hasUpdate && (
              <span
                onClick={handleUpdate}
                className=" cursor-pointer tbg-green-500/20 border border-green-500/30 text-green-400 text-xs px-1.5 py-0.5 rounded-sm "
              >
                update
              </span>
            )}
          </div>
          <div className="text-white/60 text-2xl lowercase truncate">
            {contentPack.creator && (
              <span className="mr-2">by {contentPack.creator}</span>
            )}
            {contentPack.version && (
              <>
                {contentPack.creator && (
                  <span className="opacity-50 mx-1">•</span>
                )}
                <span>v{contentPack.version}</span>
              </>
            )}
            {fileSize && (
              <>
                {(contentPack.creator || contentPack.version) && (
                  <span className="opacity-50 mx-1">•</span>
                )}
                <span className="text-white/50">{fileSize}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-28 flex justify-center">
        <ToggleSwitch
          enabled={
            contentPack.enabled !== false && contentPack.is_disabled !== true
          }
          onChange={onToggle}
          title={
            contentPack.enabled !== false && contentPack.is_disabled !== true
              ? "Disable pack"
              : "Enable pack"
          }
        />
      </div>

      <div className="w-20 flex items-center justify-center gap-1">
        {onOpenDirectory && (
          <button
            className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all rounded-sm"
            onClick={onOpenDirectory}
            title="Open containing folder"
          >
            <Icon icon="pixel:folder-open-solid" className="w-5 h-5" />
          </button>
        )}

        <button
          className={cn(
            "w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all",
            deleteConfirm && "bg-red-500/50 text-white",
          )}
          onClick={handleDelete}
          title={
            deleteConfirm ? "Click again to confirm deletion" : "Delete pack"
          }
        >
          <Icon icon="pixel:trash-solid" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
