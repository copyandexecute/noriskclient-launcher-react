"use client";

import { ModrinthSearch } from "../../modrinth/ModrinthSearch";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { Icon } from "@iconify/react";

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
        <div
          className="rounded-lg border-2 border-b-4 p-4 flex items-center gap-2"
          style={{
            backgroundColor: `rgba(220, 38, 38, 0.1)`,
            borderColor: `rgba(220, 38, 38, 0.3)`,
            borderBottomColor: `rgba(220, 38, 38, 0.5)`,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(220, 38, 38, 0.1)`,
          }}
        >
          <Icon
            icon="solar:danger-triangle-bold"
            className="w-5 h-5 text-red-400"
          />
          <span className="text-white font-minecraft text-lg">
            No profile selected. Please select a profile first.
          </span>
        </div>
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
    <div className="h-full flex flex-col p-4 gap-6">
      <div className="flex-1 overflow-hidden">
        <ModrinthSearch
          profiles={[profile]}
          selectedProfileId={profile.id}
          initialProjectType={getProjectType()}
          onInstallSuccess={onRefresh}
          className="h-full"
          parentTransitionActive={parentTransitionActive}
        />
      </div>
    </div>
  );
}
