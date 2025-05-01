"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { ModsTab } from "./ModsTab";
import { ResourcePacksTab } from "./ResourcePacksTab";
import { ShaderPacksTab } from "./ShaderPacksTab";
import type { Profile } from "../../../types/profile";

interface ContentTabProps {
  profile: Profile;
  onRefresh?: () => void;
  onBrowse?: (contentType: string) => void;
}

export function ContentTab({ profile, onRefresh, onBrowse }: ContentTabProps) {
  const [contentType, setContentType] = useState<
    "mods" | "resourcepacks" | "shaderpacks"
  >("mods");
  const [key, setKey] = useState<number>(0);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTabChange = (tab: "mods" | "resourcepacks" | "shaderpacks") => {
    setContentType(tab);
    setKey((prevKey) => prevKey + 1);
  };

  const handleBrowse = () => {
    if (onBrowse) {
      onBrowse(contentType);
    }
  };

  const tabs = [
    {
      id: "mods",
      label: "mods",
      icon: "pixel:puzzle-solid",
      count: profile.mods?.length || 0,
    },
    {
      id: "resourcepacks",
      label: "resource packs",
      icon: "pixel:image-solid",
      count: 0,
    },
    {
      id: "shaderpacks",
      label: "shader packs",
      icon: "pixel:sun-solid",
      count: 0,
    },
  ];

  return (
    <div className="h-full flex flex-col select-none">
      <div className="flex justify-between items-center mb-5">
        <div className="content-type-tabs flex bg-black/20 backdrop-blur-md border-2 border-white/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3.5 font-minecraft text-base lowercase flex items-center gap-3 transition-colors ${
                contentType === tab.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => handleTabChange(tab.id as any)}
            >
              <Icon icon={tab.icon} className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-white/20 text-white text-sm px-2.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleBrowse}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-5 py-3 text-white font-minecraft text-base flex items-center gap-3 transition-colors"
        >
          <Icon icon="pixel:search-solid" className="w-5 h-5" />
          <span>browse {contentType}</span>
        </button>
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
      </div>
    </div>
  );
}
