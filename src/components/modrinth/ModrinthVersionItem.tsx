"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import type { ModrinthFile, ModrinthVersion } from "../../types/modrinth";

interface ModrinthVersionItemProps {
  version: ModrinthVersion;
  file: ModrinthFile;
  installState: "idle" | "adding" | "error" | "success";
  onInstall: () => void;
}

export const ModrinthVersionItem: React.FC<ModrinthVersionItemProps> = ({
  version,
  file,
  installState,
  onInstall,
}) => {
  return (
    <div className="version-list-item bg-black/10 p-3 border border-white/10 flex justify-between items-center flex-wrap gap-2">
      <div className="version-info">
        <div className="text-white font-minecraft text-xs">
          <strong>{version.version_number}</strong>{" "}
          <span className="text-white/60">({version.version_type})</span>
        </div>
        <div className="text-white/60 font-minecraft text-xs">
          <div className="flex items-center">
            <Icon icon="pixel:cube" className="mr-1 w-3 h-3" />
            MC: {version.game_versions.join(", ")}
          </div>
          <div className="flex items-center">
            <Icon icon="pixel:cog" className="mr-1 w-3 h-3" />
            Loaders: {version.loaders.join(", ")}
          </div>
        </div>
      </div>

      <div className="version-actions flex gap-2">
        <button
          className={`px-3 py-1 font-minecraft text-xs text-white ${
            installState === "adding"
              ? "bg-yellow-900/50"
              : installState === "success"
                ? "bg-green-900/50"
                : installState === "error"
                  ? "bg-red-900/50 hover:bg-red-800/50"
                  : "bg-black/30 hover:bg-black/40"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={onInstall}
          disabled={installState === "adding" || installState === "success"}
        >
          {installState === "adding" ? (
            <span className="flex items-center">
              <Icon
                icon="pixel:loading"
                className="animate-spin mr-1 w-3 h-3"
              />
              Adding...
            </span>
          ) : installState === "success" ? (
            <span className="flex items-center">
              <Icon icon="pixel:check" className="mr-1 w-3 h-3" />
              Added!
            </span>
          ) : installState === "error" ? (
            <span className="flex items-center">
              <Icon icon="pixel:refresh" className="mr-1 w-3 h-3" />
              Retry
            </span>
          ) : version.search_hit?.project_type === "modpack" ? (
            <span className="flex items-center">
              <Icon icon="pixel:download" className="mr-1 w-3 h-3" />
              Install Modpack
            </span>
          ) : (
            <span className="flex items-center">
              <Icon icon="pixel:plus" className="mr-1 w-3 h-3" />
              Install
            </span>
          )}
        </button>

        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 font-minecraft text-xs bg-black/30 text-white hover:bg-black/40 flex items-center"
          title={`Download ${file.filename}`}
        >
          <Icon icon="pixel:download" className="mr-1 w-3 h-3" />
          Download
        </a>
      </div>
    </div>
  );
};
