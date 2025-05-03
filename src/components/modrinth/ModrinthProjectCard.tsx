"use client";

import type React from "react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import type { ModrinthSearchHit } from "../../types/modrinth";
import { Card, CardContent } from "../ui/Card";
import type { ContentInstallStatus } from "../../types/profile";

interface ModrinthProjectCardProps {
  project: ModrinthSearchHit;
  isExpanded?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
  installStatus?: ContentInstallStatus | "loading" | "error" | null;
  onInstall?: (project: ModrinthSearchHit) => void;
  onInstallModpack?: (project: ModrinthSearchHit) => void;
}

export function ModrinthProjectCard({
  project,
  isExpanded = false,
  isLoading = false,
  onClick,
  onToggleExpand,
  children,
  installStatus,
  onInstall,
  onInstallModpack,
}: ModrinthProjectCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  const handleInstall = () => {
    if (project.project_type === "modpack") {
      // Call the modpack installation function directly
      onInstallModpack?.(project);
    } else {
      // Call the regular installation function
      onInstall?.(project);
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case "mod":
        return "pixel:bolt-solid";
      case "modpack":
        return "pixel:folder-open-solid";
      case "resourcepack":
        return "pixel:image-solid";
      case "shader":
        return "pixel:sun-solid";
      case "datapack":
        return "pixel:cube-solid";
      default:
        return "pixel:grid-solid";
    }
  };

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 hover:bg-white/5 cursor-pointer border border-white/10 ${
        isExpanded ? "bg-white/5" : ""
      }`}
      // @ts-ignore
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {!imageError && project.icon_url ? (
              <img
                src={project.icon_url || "/placeholder.svg"}
                alt={project.title}
                className="w-28 h-28 object-cover rounded"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center">
                <Icon
                  icon={getProjectTypeIcon(project.project_type)}
                  className="w-8 h-8 text-white/70"
                />
              </div>
            )}
          </div>

          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-minecraft text-3xl mb-1 tracking-wide lowercase select-none">
                  {project.title}
                </h3>

                {/* Installation Status Badge */}
                {installStatus === "loading" && (
                  <span className="bg-black/40 rounded-full p-1 inline-flex items-center">
                    <Icon
                      icon="pixel:circle-notch-solid"
                      className="w-3 h-3 text-white/70 animate-spin"
                    />
                  </span>
                )}

                {installStatus === "error" && (
                  <span
                    className="bg-red-900/40 rounded-full p-1 inline-flex items-center"
                    title="Error checking installation status"
                  >
                    <Icon
                      icon="pixel:exclamation-triangle-solid"
                      className="w-3 h-3 text-red-400"
                    />
                  </span>
                )}

                {typeof installStatus === "object" &&
                  installStatus?.is_included_in_norisk_pack && (
                    <span className="bg-blue-800/50 text-white px-2 py-0.5 rounded-sm  text-base tracking-wide lowercase select-none">
                      <Icon
                        icon="pixel:cube-solid"
                        className="w-3 h-3 mr-1 inline-block"
                      />
                      NORISK PACK
                    </span>
                  )}

                {typeof installStatus === "object" &&
                  installStatus?.is_installed && (
                    <span className="bg-green-800/50 text-white px-2 py-0.5 rounded-sm  text-base tracking-wide lowercase select-none">
                      <Icon
                        icon="pixel:check"
                        className="w-3 h-3 mr-1 inline-block"
                      />
                      Installed
                    </span>
                  )}
              </div>

              <button
                onClick={handleExpandClick}
                className="text-white/60 hover:text-white p-1 transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <Icon
                  icon={isExpanded ? "pixel:chevron-up" : "pixel:chevron-down"}
                  className={`w-5 h-5 transition-transform duration-200 ${isLoading ? "animate-pulse" : ""}`}
                />
              </button>
            </div>

            <p className="text-white/70 font-minecraft-ten text-xs mb-2 line-clamp-2 tracking-wide lowercase select-none">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {/* @ts-ignore */}
              {project.categories?.slice(0, 3).map((category) => (
                <span
                  key={category}
                  className="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs font-minecraft-ten tracking-wide lowercase select-none"
                >
                  {category}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-white/70">
              <div className="flex items-center gap-1">
                <Icon icon="pixel:download-solid" className="w-4 h-4" />
                <span className="text-xs font-minecraft-ten tracking-wide lowercase select-none">
                  {project.downloads.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Icon
                  icon={getProjectTypeIcon(project.project_type)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-minecraft-ten tracking-wide lowercase select-none">
                  {project.project_type}
                </span>
              </div>
            </div>
            {onInstall && (
              <div className="mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 rounded font-minecraft text-lg tracking-wide lowercase select-none transition-colors bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/50 minecraft-button-hover"
                >
                  <Icon
                    icon={
                      project.project_type === "modpack"
                        ? "pixel:folder-plus-solid"
                        : "pixel:download-solid"
                    }
                    className="w-4 h-4 mr-2 inline-block"
                  />
                  {project.project_type === "modpack"
                    ? "Create Profile"
                    : "Install"}
                </button>
              </div>
            )}
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
