"use client";
import { Icon } from "@iconify/react";
import type { ModrinthFile, ModrinthVersion } from "../../types/modrinth";

interface ModrinthVersionItemProps {
  version: ModrinthVersion;
  file: ModrinthFile;
  installState: "idle" | "installing" | "success" | "error";
  onInstall: () => void;
}

export function ModrinthVersionItem({
  version,
  file,
  installState,
  onInstall,
}: ModrinthVersionItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getGameVersions = () => {
    if (!version.game_versions || version.game_versions.length === 0)
      return "Unknown";
    return version.game_versions.join(", ");
  };

  const getLoaders = () => {
    if (!version.loaders || version.loaders.length === 0) return "Any";
    return version.loaders.join(", ");
  };

  const getButtonContent = () => {
    switch (installState) {
      case "installing":
        return (
          <>
            <Icon
              icon="pixel:circle-notch-solid"
              className="animate-spin w-4 h-4 mr-1"
            />
            <span>Installing...</span>
          </>
        );
      case "success":
        return (
          <>
            <Icon icon="pixel:check" className="w-4 h-4 mr-1" />
            <span>Installed</span>
          </>
        );
      case "error":
        return (
          <>
            <Icon
              icon="pixel:exclamation-triangle-solid"
              className="w-4 h-4 mr-1"
            />
            <span>Retry</span>
          </>
        );
      default:
        return (
          <>
            <Icon icon="pixel:download" className="w-4 h-4 mr-1" />
            <span>Install</span>
          </>
        );
    }
  };

  return (
    <div className="bg-black/30 border border-white/10 p-3 rounded">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h5 className="text-white font-minecraft text-3xl tracking-wide lowercase select-none">
            {version.name || `Version ${version.version_number}`}
          </h5>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="text-white/70 font-minecraft-ten text-xs tracking-wide lowercase select-none">
              {formatDate(version.date_published)}
            </span>
            <span className="text-white/70 font-minecraft-ten text-xs tracking-wide lowercase select-none">
              MC: {getGameVersions()}
            </span>
            <span className="text-white/70 font-minecraft-ten text-xs tracking-wide lowercase select-none">
              {getLoaders()}
            </span>
            <span className="text-white/70 font-minecraft-ten text-xs tracking-wide lowercase select-none">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
        <button
          onClick={onInstall}
          disabled={installState === "installing" || installState === "success"}
          className={`flex items-center px-3 py-1 font-minecraft text-base rounded transition-colors ${
            installState === "success"
              ? "bg-green-800/50 text-white/70 cursor-default"
              : installState === "installing"
                ? "bg-blue-800/50 text-white/70 cursor-wait"
                : "bg-black/40 hover:bg-black/60 text-white"
          }`}
        >
          {getButtonContent()}
        </button>
      </div>

      {version.changelog && (
        <div className="mt-2">
          <details className="group">
            <summary className="flex items-center cursor-pointer text-white/80 font-minecraft-ten text-xs tracking-wide lowercase select-none">
              <Icon
                icon="pixel:angle-right"
                className="w-3 h-3 mr-1 transition-transform group-open:rotate-90"
              />
              Changelog
            </summary>
            <div className="pl-4 mt-2 border-l-2 border-white/10">
              <p className="text-white/70 font-minecraft-ten text-xs whitespace-pre-line tracking-wide lowercase select-none">
                {version.changelog}
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
