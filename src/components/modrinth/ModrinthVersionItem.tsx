"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import type { ModrinthFile, ModrinthVersion } from "../../types/modrinth";
import { formatFileSize } from "../../utils/format-file-size";
import { cn } from "../../lib/utils";

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

  // Add progress animation state
  const [progressWidth, setProgressWidth] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Handle progress animation during installation
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isInstalling) {
      setProgressWidth(0);
      // Simulate progress with a gradual increase
      interval = setInterval(() => {
        setProgressWidth((prev) => {
          // Slow down as we approach 90%
          const increment = prev < 30 ? 5 : prev < 60 ? 3 : prev < 80 ? 1 : 0.5;
          return Math.min(prev + increment, 90);
        });
      }, 100);
    } else if (isInstalled) {
      setProgressWidth(100);
      setShowSuccessAnimation(true);
      // Reset success animation after a delay
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setProgressWidth(0);
      setShowSuccessAnimation(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInstalling, isInstalled]);

  const formattedSize = formatFileSize(file.size);

  const gameVersions = version.game_versions?.join(", ") || "Unknown";
  const loaders = version.loaders?.join(", ") || "Any";

  return (
    <div className="version-item bg-black/20 backdrop-blur-md border border-white/10 p-2 flex flex-col relative overflow-hidden">
      {/* Progress bar for installation */}
      {(isInstalling || isInstalled) && (
        <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              isInstalled ? "bg-green-500" : "bg-blue-500",
              showSuccessAnimation && "animate-pulse",
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      )}

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
          disabled={isInstalling || isInstalled}
          className={cn(
            "px-4 py-2 font-minecraft text-lg tracking-wide lowercase select-none transition-colors relative",
            isInstalled
              ? "bg-green-700/80 text-white cursor-default border-2 border-green-500"
              : isInstalling
                ? "bg-blue-700/80 text-white cursor-wait border-2 border-blue-500"
                : hasError
                  ? "bg-red-700/80 text-white hover:bg-red-600 border-2 border-red-500"
                  : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/50 minecraft-button-hover",
            showSuccessAnimation && "animate-pulse",
          )}
        >
          {isInstalling ? (
            <div className="flex items-center">
              <Icon
                icon="pixel:circle-notch-solid"
                className="w-4 h-4 mr-2 inline-block animate-spin"
              />
              <span>{isModpack ? "Creating Profile..." : "Installing..."}</span>
            </div>
          ) : isInstalled ? (
            <div className="flex items-center">
              <Icon icon="pixel:check" className="w-4 h-4 mr-2 inline-block" />
              <span>{isModpack ? "Profile Created" : "Installed"}</span>
            </div>
          ) : hasError ? (
            <div className="flex items-center">
              <Icon
                icon="pixel:exclamation-triangle-solid"
                className="w-4 h-4 mr-2 inline-block"
              />
              <span>Retry</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Icon
                icon={
                  isModpack ? "pixel:folder-plus-solid" : "pixel:download-solid"
                }
                className="w-4 h-4 mr-2 inline-block"
              />
              <span>{isModpack ? "Create Profile" : "Install"}</span>
            </div>
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
