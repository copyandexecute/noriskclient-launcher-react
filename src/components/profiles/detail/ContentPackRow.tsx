"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { ToggleSwitch } from "./common/ToggleSwitch";

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
      className={`flex items-center p-3 border-b border-white/20 hover:bg-white/5 transition-colors ${
        isSelected ? "bg-white/10" : ""
      }`}
    >
      <div className="flex items-center mr-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 accent-white/70 cursor-pointer"
        />
      </div>

      <div className="flex-shrink-0 w-10 h-10 mr-4 bg-black/30 flex items-center justify-center">
        {contentPack.icon_url ? (
          <img
            src={contentPack.icon_url || "/placeholder.svg"}
            alt={contentPack.display_name || contentPack.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon icon={iconType} className="w-6 h-6 text-white/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-minecraft text-white truncate">
          {contentPack.display_name || contentPack.file_name}
        </div>
        <div className="text-xs text-white/60 truncate">
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
          <div className="text-xs text-white/50 italic truncate mt-1">
            File: {contentPack.file_name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <ToggleSwitch enabled={contentPack.enabled} onChange={onToggle} />

        <button
          className={`p-2 text-white/60 hover:text-white transition-colors ${
            deleteConfirm ? "text-red-500 animate-pulse" : ""
          }`}
          onClick={handleDelete}
          title={deleteConfirm ? "Click again to confirm" : "Delete"}
        >
          <Icon icon="pixel:trash-solid" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
