"use client";

import { useState } from "react";
import { ModsTab } from "./ModsTab";
import { ResourcePacksTab } from "./ResourcePacksTab";
import { ShaderPacksTab } from "./ShaderPacksTab";
import { DataPacksTab } from "./DataPacksTab";
import { NoRiskModsTab } from "./NoRiskModsTab";
import type { Profile } from "../../../types/profile";

interface ContentTabProps {
  profile: Profile;
  onRefresh?: () => void;
  onBrowse?: (contentType: string) => void;
}

export function ContentTab({ profile, onRefresh }: ContentTabProps) {
  const [contentType, setContentType] = useState<
    "mods" | "resourcepacks" | "shaderpacks" | "datapacks" | "norisk"
  >("mods");

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTabChange = (
    tab: "mods" | "resourcepacks" | "shaderpacks" | "datapacks" | "norisk",
  ) => {
    setContentType(tab);
  };

  const tabs = [
    {
      id: "mods",
      label: "mods",
    },
    {
      id: "resourcepacks",
      label: "resource packs",
    },
    {
      id: "shaderpacks",
      label: "shaders",
    },
    {
      id: "datapacks",
      label: "data packs",
    },
    {
      id: "norisk",
      label: "norisk mods",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex-shrink-0 mb-5">
        <div className="project-type-tabs flex w-full bg-black/20 backdrop-blur-md border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 px-4 py-2 font-minecraft text-3xl lowercase select-none tracking-wide ${
                contentType === tab.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              onClick={() => handleTabChange(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flexible content area that takes remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={contentType === "mods" ? "block h-full" : "hidden"}>
          <ModsTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={contentType === "mods"}
          />
        </div>
        <div
          className={
            contentType === "resourcepacks" ? "block h-full" : "hidden"
          }
        >
          <ResourcePacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={contentType === "resourcepacks"}
          />
        </div>
        <div
          className={contentType === "shaderpacks" ? "block h-full" : "hidden"}
        >
          <ShaderPacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={contentType === "shaderpacks"}
          />
        </div>
        <div
          className={contentType === "datapacks" ? "block h-full" : "hidden"}
        >
          <DataPacksTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={contentType === "datapacks"}
          />
        </div>
        <div className={contentType === "norisk" ? "block h-full" : "hidden"}>
          <NoRiskModsTab
            profile={profile}
            onRefresh={handleRefresh}
            isActive={contentType === "norisk"}
          />
        </div>
      </div>
    </div>
  );
}
