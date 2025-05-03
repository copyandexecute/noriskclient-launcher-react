"use client";

import { Icon } from "@iconify/react";
import { ProfileItem } from "./ProfileItem";
import type { Profile } from "../../types/profile";

interface ProfileGroupProps {
  loader: string;
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  compatibleProfiles: Record<string, boolean>;
  installedProfiles: Record<string, boolean>;
}

export function ProfileGroup({
  loader,
  profiles,
  selectedProfileId,
  onSelectProfile,
  compatibleProfiles,
  installedProfiles = {},
}: ProfileGroupProps) {
  const getLoaderIcon = (loaderName: string) => {
    const normalizedName = loaderName.toLowerCase();
    if (normalizedName.includes("fabric")) return "pixel:fabric";
    if (normalizedName.includes("forge")) return "pixel:forge";
    if (normalizedName.includes("quilt")) return "pixel:quilt";
    if (normalizedName.includes("neoforge")) return "pixel:neoforge";
    return "pixel:cube";
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={getLoaderIcon(loader)} className="w-5 h-5 text-white/70" />
        <h4 className="text-white/70 font-minecraft text-sm tracking-wide lowercase select-none">
          {loader}
        </h4>
      </div>
      <div className="space-y-2">
        {profiles.map((profile) => (
          <ProfileItem
            key={profile.id}
            profile={profile}
            isSelected={selectedProfileId === profile.id}
            isCompatible={compatibleProfiles[profile.id] ?? true}
            isInstalled={installedProfiles[profile.id] ?? false}
            onClick={() => onSelectProfile(profile.id)}
          />
        ))}
      </div>
    </div>
  );
}
