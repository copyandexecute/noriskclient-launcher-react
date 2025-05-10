"use client";

import type React from "react";
import { useState } from "react";
import { ModsTab } from "./ModsTab";
import type { Profile } from "../../../types/profile";
import { Button } from "../../ui/buttons/Button";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { ShaderPacksTab } from "./ShaderPacksTab";
import { ResourcePacksTab } from "./ResourcePacksTab.tsx";
import { DataPacksTab } from "./DataPacksTab.tsx";
import { NoRiskModsTab } from "./NoRiskModsTab.tsx";

interface ContentTabProps {
  profile: Profile;
  onRefresh?: () => void;
  onBrowse?: (contentType: string) => void;
}

type ContentType =
  | "mods"
  | "resourcepacks"
  | "shaderpacks"
  | "datapacks"
  | "norisk";

export function ContentTab({ profile, onRefresh, onBrowse }: ContentTabProps) {
  const [contentType, setContentType] = useState<ContentType>("mods");
  const accentColor = useThemeStore((state) => state.accentColor);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTabChange = (tab: ContentType, e: React.MouseEvent) => {
    e.stopPropagation();
    setContentType(tab);
  };

  const handleBrowse = (tab: ContentType) => {
    if (onBrowse) {
      onBrowse(tab);
    }
  };

  const tabs = [
    {
      id: "mods" as ContentType,
      label: "Mods",
      icon: "solar:cube-bold",
    },
    {
      id: "resourcepacks" as ContentType,
      label: "Resource Packs",
      icon: "solar:gallery-bold",
    },
    {
      id: "shaderpacks" as ContentType,
      label: "Shaders",
      icon: "solar:sun-bold",
    },
    {
      id: "datapacks" as ContentType,
      label: "Data Packs",
      icon: "solar:database-bold",
    },
    {
      id: "norisk" as ContentType,
      label: "NoRisk Mods",
      icon: "solar:shield-check-bold",
    },
  ];

  return (
    <div className="h-full p-2 flex flex-col">
      <div
        className="flex-shrink-0 mb-5 p-2 rounded-lg border-2 border-b-4 shadow-md overflow-x-auto scrollbar-hide"
        style={{
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}40`,
          borderBottomColor: `${accentColor.value}60`,
        }}
      >
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={(e) => handleTabChange(tab.id, e)}
              variant={contentType === tab.id ? "default" : "ghost"}
              size="md"
              icon={<Icon icon={tab.icon} />}
              iconPosition="left"
              className={
                contentType === tab.id ? "text-white" : "text-white/70"
              }
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-hidden rounded-lg shadow-lg"
        style={{
          borderColor: `${accentColor.value}40`,
          borderBottomColor: `${accentColor.value}60`,
          backgroundColor: `${accentColor.value}10`,
        }}
      >
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
