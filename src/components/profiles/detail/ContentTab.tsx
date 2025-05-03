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
  const [key, setKey] = useState<number>(0);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTabChange = (
    tab: "mods" | "resourcepacks" | "shaderpacks" | "datapacks" | "norisk",
  ) => {
    setContentType(tab);
    setKey((prevKey) => prevKey + 1);
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
    <div className="h-full flex flex-col select-none">
      <div className="mb-5">
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

      <div className="h-[calc(100%-64px)]">
        {contentType === "mods" && (
          <ModsTab
            key={`mods-${key}`}
            profile={profile}
            onRefresh={handleRefresh}
          />
        )}
        {contentType === "resourcepacks" && (
          <ResourcePacksTab
            key={`resourcepacks-${key}`}
            profile={profile}
            onRefresh={handleRefresh}
          />
        )}
        {contentType === "shaderpacks" && (
          <ShaderPacksTab
            key={`shaderpacks-${key}`}
            profile={profile}
            onRefresh={handleRefresh}
          />
        )}
        {contentType === "datapacks" && (
          <DataPacksTab
            key={`datapacks-${key}`}
            profile={profile}
            onRefresh={handleRefresh}
          />
        )}
        {contentType === "norisk" && (
          <NoRiskModsTab
            key={`norisk-${key}`}
            profile={profile}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
