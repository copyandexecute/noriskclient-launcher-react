"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ToggleSwitch } from "./common/ToggleSwitch";
import { invoke } from "@tauri-apps/api/core";

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

interface ContentPackRowProps {
  contentPack: ContentPack;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  formatFileSize: (bytes?: number) => string;
  iconType?: string;
}

export function ContentPackRow({
  contentPack,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
  formatFileSize,
  iconType = "pixel:image-solid",
}: ContentPackRowProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [localIcon, setLocalIcon] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackIcon = async () => {
      // Skip if we already have an icon URL
      if (contentPack.icon_url) return;

      try {
        // Try to get icon from local archive
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

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete();
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  return (
    <div
      className={`flex items-center p-5 border-b border-white/20 hover:bg-white/5 transition-colors select-none ${
        isSelected ? "bg-white/10" : ""
      }`}
    >
      <div className="flex items-center mr-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-5 h-5 accent-white/70 cursor-pointer"
        />
      </div>

      <div className="flex-shrink-0 w-12 h-12 mr-4 bg-black/30 flex items-center justify-center overflow-hidden">
        {contentPack.icon_url ? (
          <img
            src={contentPack.icon_url || "/placeholder.svg"}
            alt={contentPack.display_name || contentPack.file_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="icon"><Icon icon="${iconType}" class="w-7 h-7 text-white/50" /></span>`;
              }
            }}
          />
        ) : localIcon ? (
          <img
            src={`data:image/png;base64,${localIcon}`}
            alt={contentPack.display_name || contentPack.file_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLocalIcon(null)}
          />
        ) : (
          <Icon icon={iconType} className="w-7 h-7 text-white/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-minecraft text-white text-lg truncate tracking-wide lowercase">
          {contentPack.display_name || contentPack.file_name}
        </div>
        <div className="text-base text-white/60 truncate">
          {contentPack.creator && (
            <span className="mr-2">by {contentPack.creator}</span>
          )}
          {contentPack.version && (
            <>
              <span className="opacity-50 mx-1">•</span>
              <span>v{contentPack.version}</span>
            </>
          )}
          {contentPack.file_size && (
            <>
              <span className="opacity-50 mx-1">•</span>
              <span>{formatFileSize(contentPack.file_size)}</span>
            </>
          )}
        </div>
        {contentPack.display_name && contentPack.file_name && (
          <div className="text-sm text-white/50 italic truncate mt-1">
            file: {contentPack.file_name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 ml-4">
        <ToggleSwitch enabled={contentPack.enabled} onChange={onToggle} />

        <button
          className={`p-2.5 text-white/60 hover:text-white transition-colors ${
            deleteConfirm ? "text-red-500 animate-pulse" : ""
          }`}
          onClick={handleDelete}
          title={deleteConfirm ? "Click again to confirm" : "Delete"}
        >
          <Icon icon="pixel:trash-solid" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
