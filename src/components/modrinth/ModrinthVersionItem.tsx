"use client";

import { Icon } from "@iconify/react";
import type { ModrinthFile, ModrinthVersion } from "../../types/modrinth";
import { formatFileSize } from "../../utils/format-file-size";

interface ModrinthVersionItemProps {
  version: ModrinthVersion;
  file: ModrinthFile;
  installState: "idle" | "installing" | "adding" | "success" | "error";
  onInstall: () => void;
  isModpack?: boolean;
}

export function ModrinthVersionItem({
  version,
  file,
  installState,
  onInstall,
  isModpack = false,
}: ModrinthVersionItemProps) {
  const isInstalling =
    installState === "installing" || installState === "adding";
  const isInstalled = installState === "success";
  const hasError = installState === "error";

  const formattedSize = formatFileSize(file.size);

  const gameVersions = version.game_versions?.join(", ") || "Unknown";
  const loaders = version.loaders?.join(", ") || "Any";

  // @ts-ignore
  let buttonText = isModpack ? "Create Profile" : "Install";
  if (isInstalling) {
    buttonText = isModpack ? "Creating..." : "Installing...";
  } else if (isInstalled) {
    buttonText = isModpack ? "Profile Created" : "Installed";
  } else if (hasError) {
    buttonText = "Error";
  }

  return (
    <div className="version-item bg-black/20 backdrop-blur-md border border-white/10 p-2 flex flex-col">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-white font-minecraft text-xl tracking-wide lowercase select-none">
            {version.name || version.version_number}
          </h4>
          <div className="text-white/70 text-xs font-minecraft-ten tracking-wide lowercase select-none">
            <span className="mr-2">
              <Icon
                icon="pixel:calendar-alt-solid"
                className="inline-block mr-1 w-3 h-3"
              />
              {new Date(version.date_published).toLocaleDateString()}
            </span>
            <span className="mr-2">
              <Icon
                icon="pixel:cube-solid"
                className="inline-block mr-1 w-3 h-3"
              />
              {gameVersions}
            </span>
            {version.loaders && version.loaders.length > 0 && (
              <span>
                <Icon
                  icon="pixel:cogs-solid"
                  className="inline-block mr-1 w-3 h-3"
                />
                {loaders}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onInstall}
          disabled={installState === "adding" || installState === "success"}
          className={`px-4 py-2 font-minecraft text-lg tracking-wide lowercase select-none transition-colors ${
            installState === "success"
              ? "bg-green-700 text-white cursor-default border-2 border-green-500"
              : installState === "adding"
                ? "bg-blue-700 text-white cursor-wait border-2 border-blue-500"
                : installState === "error"
                  ? "bg-red-700 text-white hover:bg-red-600 border-2 border-red-500"
                  : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/50 minecraft-button-hover"
          }`}
        >
          {installState === "adding" ? (
            <>
              <Icon
                icon="pixel:circle-notch-solid"
                className="w-4 h-4 mr-2 inline-block animate-spin"
              />
              {isModpack ? "Creating Profile..." : "Installing..."}
            </>
          ) : installState === "success" ? (
            <>
              <Icon icon="pixel:check" className="w-4 h-4 mr-2 inline-block" />
              {isModpack ? "Profile Created" : "Installed"}
            </>
          ) : installState === "error" ? (
            <>
              <Icon
                icon="pixel:exclamation-triangle-solid"
                className="w-4 h-4 mr-2 inline-block"
              />
              Retry
            </>
          ) : (
            <>
              <Icon
                icon={
                  isModpack ? "pixel:folder-plus-solid" : "pixel:download-solid"
                }
                className="w-4 h-4 mr-2 inline-block"
              />
              {isModpack ? "Create Profile" : "Install"}
            </>
          )}
        </button>
      </div>
      <div className="text-white/50 text-xs font-minecraft-ten mt-1 tracking-wide lowercase select-none">
        <span className="mr-2">
          <Icon
            icon="pixel:file-alt-solid"
            className="inline-block mr-1 w-3 h-3"
          />
          {file.filename}
        </span>
        <span>
          <Icon icon="pixel:hdd-solid" className="inline-block mr-1 w-3 h-3" />
          {formattedSize}
        </span>
      </div>
    </div>
  );
}
