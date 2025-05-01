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
        <div className="font-bold">{profile.name}</div>
        <div className="text-white/60 text-xs">
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

function ProfileIcon({ profile }: ProfileIconProps) {
  // @ts-ignore
  return profile.icon ? (
    <img
      // @ts-ignore
      src={profile.icon || "/placeholder.svg"}
      alt=""
      className="mr-3 w-8 h-8 object-cover"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
      }}
    />
  ) : (
    <Icon icon="pixel:cube" className="mr-3 w-8 h-8" />
  );
}

interface SelectionIndicatorProps {
  isSelected: boolean;
}

function SelectionIndicator({ isSelected }: SelectionIndicatorProps) {
  return (
    <div className="ml-2">
      <div
        className={`w-5 h-5 rounded-full border-2 ${
          isSelected
            ? "border-white bg-white/30"
            : "border-white/30 bg-transparent"
        } flex items-center justify-center`}
      >
        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
      </div>
    </div>
  );
}
