"use client";

import { useEffect, useRef } from "react";
import { ModsTab } from "./ModsTab";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { ShaderPacksTab } from "./ShaderPacksTab";
import { ResourcePacksTab } from "./ResourcePacksTab";
import { DataPacksTab } from "./DataPacksTab";
import { NoRiskModsTab } from "./NoRiskModsTab";
import { gsap } from "gsap";

interface ContentTabProps {
  profile: Profile;
  onRefresh?: () => void;
  onBrowse?: (contentType: string) => void;
  activeContentType:
    | "mods"
    | "resourcepacks"
    | "shaderpacks"
    | "datapacks"
    | "norisk";
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ContentTab({
  profile,
  onRefresh,
  onBrowse,
  activeContentType,
  searchQuery,
  onSearchChange,
}: ContentTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchBarRef.current) {
      gsap.fromTo(
        searchBarRef.current,
        { opacity: 0, y: -10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }

    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          delay: 0.1,
        },
      );
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.98 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        },
      );
    }
  }, [activeContentType]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <div
        ref={contentRef}
        className="flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${accentColor.value}08`,
          borderColor: `${accentColor.value}20`,
        }}
      >
        <div
          className={activeContentType === "mods" ? "block h-full" : "hidden"}
        >
          <ModsTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={activeContentType === "mods"}
            searchQuery={searchQuery}
            //
            onBrowse={onBrowse ? () => onBrowse("mods") : undefined}
          />
        </div>
        <div
          className={
            activeContentType === "resourcepacks" ? "block h-full" : "hidden"
          }
        >
          <ResourcePacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={activeContentType === "resourcepacks"}
            searchQuery={searchQuery}
            onBrowse={onBrowse ? () => onBrowse("resourcepacks") : undefined}
          />
        </div>
        <div
          className={
            activeContentType === "shaderpacks" ? "block h-full" : "hidden"
          }
        >
          <ShaderPacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={activeContentType === "shaderpacks"}
            searchQuery={searchQuery}
            onBrowse={onBrowse ? () => onBrowse("shaderpacks") : undefined}
          />
        </div>
        <div
          className={
            activeContentType === "datapacks" ? "block h-full" : "hidden"
          }
        >
          <DataPacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={activeContentType === "datapacks"}
            searchQuery={searchQuery}
            onBrowse={onBrowse ? () => onBrowse("datapacks") : undefined}
          />
        </div>
        <div
          className={activeContentType === "norisk" ? "block h-full" : "hidden"}
        >
          <NoRiskModsTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={activeContentType === "norisk"}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}
