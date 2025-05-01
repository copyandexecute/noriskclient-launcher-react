"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
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
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-4">
      <button
        onClick={toggleExpand}
        className="flex items-center justify-between w-full bg-black/30 border border-white/10 p-2 text-white font-minecraft text-2xl mb-1"
      >
        <div className="flex items-center">
          <LoaderIcon loader={loader} />
          <span className="ml-2 tracking-wide lowercase select-none">
            {loader}
          </span>
        </div>
        <Icon
          icon={isExpanded ? "pixel:chevron-up" : "pixel:chevron-down"}
          className="w-5 h-5 text-white/70"
        />
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {profiles.map((profile) => (
            <ProfileItem
              key={profile.id}
              profile={profile}
              isSelected={selectedProfileId === profile.id}
              onSelect={() => onSelectProfile(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LoaderIconProps {
  loader: string;
}

function LoaderIcon({}: LoaderIconProps) {
  return <Icon icon="pixel:grid-solid" className="w-5 h-5 text-blue-400" />;
}
