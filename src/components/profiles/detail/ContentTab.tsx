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
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="content-type-tabs flex bg-black/20 backdrop-blur-md border-2 border-white/30 rounded-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3 font-minecraft text-sm lowercase flex items-center gap-2 ${
                contentType === tab.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white"
              }`}
              onClick={() => handleTabChange(tab.id as any)}
            >
              <Icon icon={tab.icon} className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleBrowse}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-2 text-white font-minecraft text-sm flex items-center gap-2"
        >
          <Icon icon="pixel:search-solid" className="w-4 h-4" />
          <span>browse {contentType}</span>
        </button>
      </div>

      <div className="h-[calc(100%-56px)]">
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
