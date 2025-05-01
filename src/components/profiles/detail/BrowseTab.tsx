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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ModrinthSearch
          selectedProfileId={profile.id}
          // @ts-ignore
          gameVersion={profile.game_version}
          loader={profile.loader}
          initialProjectType={getProjectType()}
          onInstallSuccess={onRefresh}
          className="h-full"
        />
      </div>
    </div>
  );
}
