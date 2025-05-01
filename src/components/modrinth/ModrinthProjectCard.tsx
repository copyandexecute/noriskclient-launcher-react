"use client";

import type React from "react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import type { ModrinthSearchHit } from "../../types/modrinth";
import { Card, CardContent } from "../ui/Card";

interface ModrinthProjectCardProps {
  project: ModrinthSearchHit;
  isExpanded?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
}

export function ModrinthProjectCard({
  project,
  isExpanded = false,
  isLoading = false,
  onClick,
  onToggleExpand,
  children,
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
                  icon={
                    project.project_type === "mod"
                      ? "pixel:bolt-solid"
                      : project.project_type === "modpack"
                        ? "pixel:folder-open-solid"
                        : project.project_type === "resourcepack"
                          ? "pixel:image-solid"
                          : project.project_type === "shader"
                            ? "pixel:image-solid"
                            : "pixel:grid-solid"
                  }
                  className="w-8 h-8 text-white/70"
                />
              </div>
            )}
          </div>

          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <h3 className="text-white font-minecraft text-3xl mb-1 tracking-wide lowercase select-none">
                {project.title}
              </h3>
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
                  icon={
                    project.project_type === "mod"
                      ? "pixel:bolt-solid"
                      : project.project_type === "modpack"
                        ? "pixel:folder-open-solid"
                        : project.project_type === "resourcepack"
                          ? "pixel:image-solid"
                          : project.project_type === "shader"
                            ? "pixel:image-solid"
                            : "pixel:grid-solid"
                  }
                  className="w-4 h-4"
                />
                <span className="text-xs font-minecraft-ten tracking-wide lowercase select-none">
                  {project.project_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
