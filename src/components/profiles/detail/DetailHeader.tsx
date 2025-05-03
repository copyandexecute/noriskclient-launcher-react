"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { Logo } from "../../ui/Logo";

interface DetailHeaderProps {
  profile: Profile;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DetailHeader({ profile, onClose, onEdit }: DetailHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-black/30 backdrop-blur-md border-b-2 border-white/30 p-5 select-none">
      <div className="flex items-center">
        <div className="w-14 h-14 bg-white/10 border border-white/20 flex items-center justify-center mr-5">
          {profile.banner?.source.type === "url" ? (
            <img
              src={profile.banner.source.url || "/placeholder.svg"}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Logo size="sm" />
          )}
        </div>
        <div>
          <h2 className="text-white font-minecraft text-2xl lowercase tracking-wide">
            {profile.name}
          </h2>
          <div className="flex items-center text-white/60 text-base">
            <span className="mr-2">{profile.game_version}</span>
            {profile.loader && profile.loader !== "vanilla" && (
              <>
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full mx-2"></span>
                <span className="capitalize">{profile.loader}</span>
                {profile.loader_version && (
                  <span className="ml-1">{profile.loader_version}</span>
                )}
              </>
            )}
            {profile.group && (
              <>
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full mx-2"></span>
                <span className="flex items-center">
                  <Icon icon="pixel:folder-solid" className="w-4 h-4 mr-1.5" />
                  {profile.group}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {onEdit && !profile.is_standard_version && (
          <button
            onClick={onEdit}
            className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-2 text-white/80 hover:text-white font-minecraft text-base transition-colors flex items-center gap-2"
            title="Edit profile settings"
          >
            <Icon icon="pixel:cog-solid" className="w-4 h-4" />
            settings
          </button>
        )}
        <button
          onClick={onClose}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          title="Close detail view"
        >
          <Icon icon="pixel:window-close-solid" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
