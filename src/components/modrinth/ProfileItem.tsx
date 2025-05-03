"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";

interface ProfileItemProps {
  profile: Profile;
  isSelected: boolean;
  isCompatible: boolean;
  isInstalled: boolean;
  onClick: () => void;
}

export function ProfileItem({
  profile,
  isSelected,
  isCompatible,
  isInstalled,
  onClick,
}: ProfileItemProps) {
  return (
    <div
      onClick={isCompatible ? onClick : undefined}
      className={`p-3 border flex items-center gap-3 cursor-pointer transition-colors ${
        isSelected
          ? "bg-white/10 border-white/30"
          : isCompatible
            ? "bg-black/20 border-white/10 hover:bg-black/30"
            : "bg-black/20 border-white/10 opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-minecraft text-sm tracking-wide lowercase select-none">
            {profile.name}
          </span>
          {isInstalled && (
            <span className="px-2 py-0.5 bg-green-600/30 border border-green-500/30 text-white text-xs font-minecraft tracking-wide lowercase select-none">
              Installed
            </span>
          )}
          {!isCompatible && (
            <span className="px-2 py-0.5 bg-red-600/30 border border-red-500/30 text-white text-xs font-minecraft tracking-wide lowercase select-none">
              Incompatible
            </span>
          )}
        </div>
        <div className="text-white/60 font-minecraft-ten text-xs tracking-wide lowercase select-none">
          {profile.game_version} • {profile.loader}
        </div>
      </div>
      {isSelected && <Icon icon="pixel:check" className="w-5 h-5 text-white" />}
    </div>
  );
}
