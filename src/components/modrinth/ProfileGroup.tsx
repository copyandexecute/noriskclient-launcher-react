"use client";
import type { Profile } from "../../types/profile";
import { ProfileItem } from "./ProfileItem";

interface ProfileGroupProps {
  loader: string;
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
}

export function ProfileGroup({
  loader,
  profiles,
  selectedProfileId,
  onSelectProfile,
}: ProfileGroupProps) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1 text-white/50 font-minecraft text-xs bg-white/5 mb-2">
        {loader}
      </div>

      <div className="space-y-2">
        {profiles.map((profile) => (
          <ProfileItem
            key={profile.id}
            profile={profile}
            isSelected={selectedProfileId === profile.id}
            onSelect={() => onSelectProfile(profile.id)}
          />
        ))}
      </div>
    </div>
  );
}
