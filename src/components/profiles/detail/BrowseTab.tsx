"use client";

import { ModrinthSearch } from "../../modrinth/ModrinthSearch";
import type { Profile } from "../../../types/profile";

interface BrowseTabProps {
  profile: Profile;
  initialContentType?: string;
  onRefresh?: () => void;
}

export function BrowseTab({
  profile,
  initialContentType = "mods",
  onRefresh,
}: BrowseTabProps) {
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

  if (!profile || !profile.id) {
    console.error("BrowseTab: No valid profile provided");
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white font-minecraft text-2xl">
          No profile selected
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ModrinthSearch
          profiles={[profile]}
          selectedProfileId={profile.id}
          initialProjectType={getProjectType()}
          onInstallSuccess={onRefresh}
          className="h-full"
        />
      </div>
    </div>
  );
}
