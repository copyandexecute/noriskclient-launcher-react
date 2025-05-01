"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";

interface ProfileItemProps {
  profile: Profile;
  isSelected: boolean;
  onSelect: () => void;
}

export function ProfileItem({
  profile,
  isSelected,
  onSelect,
}: ProfileItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center w-full p-3 text-left text-white font-minecraft text-sm border ${
        isSelected
          ? "bg-white/20 border-white/30"
          : "bg-black/30 border-white/10 hover:bg-black/40"
      }`}
    >
      <ProfileIcon profile={profile} />
      <div className="flex-1">
        <div className="font-bold text-2xl">{profile.name}</div>
        <div className="text-white/60 text-sm">
          MC {profile.game_version} • {profile.loader}
        </div>
      </div>
      <SelectionIndicator isSelected={isSelected} />
    </button>
  );
}

interface ProfileIconProps {
  profile: Profile;
}

function ProfileIcon({}: ProfileIconProps) {
  return <Icon icon="pixel:grid-solid" className="mr-3 w-12 h-12" />;
}

interface SelectionIndicatorProps {
  isSelected: boolean;
}

function SelectionIndicator({ isSelected }: SelectionIndicatorProps) {
  return (
    <div className="ml-2">
      <div
        className={`w-6 h-6 rounded-full border-2 ${
          isSelected
            ? "border-white bg-white/30"
            : "border-white/30 bg-transparent"
        } flex items-center justify-center`}
      >
        {isSelected && <div className="w-3 h-3 bg-white rounded-full"></div>}
      </div>
    </div>
  );
}
