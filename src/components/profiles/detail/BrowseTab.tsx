"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { useDisplayContextStore } from "../../../store/useDisplayContextStore";
import { Icon } from "@iconify/react";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";
import { ModrinthSearchV2 } from "../../modrinth/v2/ModrinthSearchV2";

interface BrowseTabProps {
  profile: Profile;
  initialContentType?: string;
  onRefresh?: () => void;
  parentTransitionActive?: boolean;
}

export function BrowseTab({
  profile,
  initialContentType = "mods",
  onRefresh,
  parentTransitionActive,
}: BrowseTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const setDisplayContext = useDisplayContextStore((state) => state.setContext);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set display context to 'detail' when component mounts
  useEffect(() => {
    setDisplayContext("detail");

    // Optional: Reset to default when component unmounts
    return () => {
      setDisplayContext("standalone");
    };
  }, [setDisplayContext]);

  useEffect(() => {
    if (containerRef.current && !parentTransitionActive) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, [parentTransitionActive]);

  const getProjectType = () => {
    switch (initialContentType) {
      case "mods":
        return "mod";
      case "resourcepacks":
        return "resourcepack";
      case "shaderpacks":
        return "shader";
      case "datapacks":
        return "datapack";
      default:
        return "mod";
    }
  };

  const getContentTypeIcon = () => {
    switch (initialContentType) {
      case "mods":
        return "solar:cube-bold";
      case "resourcepacks":
        return "solar:image-gallery-bold";
      case "shaderpacks":
        return "solar:sun-bold";
      case "datapacks":
        return "solar:database-bold";
      default:
        return "solar:cube-bold";
    }
  };

  const getContentTypeTitle = () => {
    switch (initialContentType) {
      case "mods":
        return "Browse Mods";
      case "resourcepacks":
        return "Browse Resource Packs";
      case "shaderpacks":
        return "Browse Shader Packs";
      case "datapacks":
        return "Browse Data Packs";
      default:
        return "Browse Content";
    }
  };

  if (!profile || !profile.id) {
    return (
      <div className="h-full flex flex-col p-4 gap-6">
        <Card variant="flat" className="p-4 border-red-500">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:danger-triangle-bold"
              className="w-5 h-5 text-red-400"
            />
            <span className="text-white font-minecraft text-lg">
              No profile selected. Please select a profile first.
            </span>
          </div>
        </Card>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon
              icon="solar:user-broken"
              className="w-16 h-16 text-white/30 mx-auto mb-4"
            />
            <p className="text-white/60 font-minecraft text-xl tracking-wide lowercase select-none">
              no profile selected
            </p>
            <p className="text-white/40 font-minecraft text-sm mt-2 tracking-wide lowercase select-none">
              please select a profile to browse content
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col p-4 gap-6">
      <div className="flex-1 overflow-hidden">
        <ModrinthSearchV2
          profiles={[profile]}
          selectedProfileId={profile.id}
          className="h-full"
        />
      </div>
    </div>
  );
}
