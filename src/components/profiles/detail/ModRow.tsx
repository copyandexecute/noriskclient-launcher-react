"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../../lib/utils";
import type { Mod } from "../../../types/profile";
import { ToggleSwitch } from "./common/ToggleSwitch";

interface ModRowProps {
  mod: Mod;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function ModRow({
  mod,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
}: ModRowProps) {
  const [, setIsHovered] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    const fetchModIcon = async () => {
      if (mod.source?.type === "modrinth") {
        try {
          const projectId = mod.source.project_id;
          setIconUrl(
            `/placeholder.svg?height=64&width=64&query=${mod.display_name || projectId}`,
          );
        } catch (error) {
          console.error("Failed to fetch mod icon:", error);
        }
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

  return (
    <div
      className={cn(
        "flex items-center py-3 px-3 border-b border-white/10 hover:bg-white/5 transition-colors",
        isSelected && "bg-white/10",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-8 flex justify-center">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select ${mod.display_name || "mod"}`}
        />
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0 px-2">
        <div className="w-8 h-8 bg-black/20 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {iconUrl ? (
            <img
              src={iconUrl || "/placeholder.svg"}
              alt={mod.display_name || "Mod icon"}
              className="w-full h-full object-cover"
              onError={() => setIconUrl(null)}
            />
          ) : (
            <span className="text-white font-minecraft text-lg">
              {mod.display_name?.charAt(0).toUpperCase() || "M"}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-white font-minecraft text-base lowercase truncate">
            {mod.display_name || "Unknown Mod"}
          </div>
          <div className="text-white/60 text-xs lowercase truncate">
            {mod.source?.type === "modrinth"
              ? mod.source.project_id
              : mod.source?.type === "local"
                ? mod.source.file_name
                : mod.source?.type || "unknown"}
          </div>
        </div>
      </div>

      <div className="w-24 text-white/70 text-sm font-minecraft">
        {mod.version || "?"}
      </div>

      <div className="w-24 flex justify-center">
        <ToggleSwitch
          enabled={mod.enabled}
          onChange={onToggle}
          title={mod.enabled ? "Disable mod" : "Enable mod"}
        />
      </div>

      <div className="w-16 flex items-center justify-center">
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all",
            isConfirmingDelete && "bg-red-500/50 text-white",
          )}
          onClick={handleDelete}
          title={
            isConfirmingDelete
              ? "Click again to confirm deletion"
              : "Delete mod"
          }
        >
          <Icon icon="pixel:trash-solid" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
