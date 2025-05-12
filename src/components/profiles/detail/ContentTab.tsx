"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ModsTab } from "./ModsTab";
import type { Profile } from "../../../types/profile";
import { Button } from "../../ui/buttons/Button";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { ShaderPacksTab } from "./ShaderPacksTab";
import { ResourcePacksTab } from "./ResourcePacksTab";
import { DataPacksTab } from "./DataPacksTab";
import { NoRiskModsTab } from "./NoRiskModsTab";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";

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
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      gsap.fromTo(
        tabsRef.current,
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
  }, [contentType]);

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
    <div className="h-full p-4 flex flex-col gap-4">
      <Card
        ref={tabsRef}
        variant="flat"
        className="flex-shrink-0 p-2 overflow-x-auto scrollbar-hide"
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
      </Card>

      <Card
        ref={contentRef}
        variant="default"
        className="flex-1 min-h-0 overflow-hidden"
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
      </Card>
    </div>
  );
}
