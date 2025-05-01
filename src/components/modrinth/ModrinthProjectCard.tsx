"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import type { ModrinthSearchHit } from "../../types/modrinth";

interface ModrinthProjectCardProps {
  project: ModrinthSearchHit;
  isExpanded: boolean;
  isLoading: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}

export const ModrinthProjectCard: React.FC<ModrinthProjectCardProps> = ({
  project,
  isExpanded,
  isLoading,
  onToggleExpand,
  children,
}) => {
  return (
    <div className="result-item bg-black/20 backdrop-blur-md border border-white/10 p-4 hover:bg-black/30 transition-colors">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-28 h-28 bg-black/30 overflow-hidden">
          {project.icon_url ? (
            <img
              src={project.icon_url || "/placeholder.svg"}
              alt={`${project.title} icon`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.textContent = "📦";
                  parent.className +=
                    " flex items-center justify-center text-2xl";
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              📦
            </div>
          )}
        </div>

        <div className="flex-grow overflow-hidden">
          <h3 className="text-white font-minecraft text-lg font-bold mb-1">
            {project.title}
          </h3>

          <p className="text-white/80 font-minecraft text-sm line-clamp-2 mb-2">
            {project.description}
          </p>

          <div className="flex items-center gap-4 text-white/60 font-minecraft text-xs">
            <div className="flex items-center">
              <Icon icon="pixel:download" className="mr-1 w-3 h-3" />
              {project.downloads.toLocaleString()}
            </div>

            <div className="flex items-center">
              <Icon icon="pixel:star" className="mr-1 w-3 h-3" />
              {project.follows.toLocaleString()}
            </div>

            {project.latest_version && (
              <div className="flex items-center">
                <Icon icon="pixel:tag" className="mr-1 w-3 h-3" />
                {project.latest_version}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={onToggleExpand}
              disabled={isLoading}
              className="bg-black/30 hover:bg-black/40 px-3 py-1 text-white font-minecraft text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExpanded ? (
                isLoading ? (
                  <span className="flex items-center">
                    <Icon
                      icon="pixel:loading"
                      className="animate-spin mr-1 w-3 h-3"
                    />
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Icon icon="pixel:chevron-up" className="mr-1 w-3 h-3" />
                    Hide Versions
                  </span>
                )
              ) : (
                <span className="flex items-center">
                  <Icon icon="pixel:chevron-down" className="mr-1 w-3 h-3" />
                  Show Versions
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};
