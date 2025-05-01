"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { Logo } from "../../ui/Logo";

interface DetailHeaderProps {
  profile: Profile;
  onClose: () => void;
  onEdit: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DetailHeader({
  profile,
  onClose,
  onEdit,
  onRefresh,
  isRefreshing = false,
}: DetailHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-black/30 backdrop-blur-md border-b-2 border-white/30 p-4">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center mr-4">
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
          <h2 className="text-white font-minecraft text-xl lowercase">
            {profile.name}
          </h2>
          <div className="flex items-center text-white/60 text-sm">
            <span className="mr-2">{profile.game_version}</span>
            {profile.loader && profile.loader !== "vanilla" && (
              <>
                <span className="w-1 h-1 bg-white/40 rounded-full mx-2"></span>
                <span className="capitalize">{profile.loader}</span>
                {profile.loader_version && (
                  <span className="ml-1">{profile.loader_version}</span>
                )}
              </>
            )}
            {profile.group && (
              <>
                <span className="w-1 h-1 bg-white/40 rounded-full mx-2"></span>
                <span className="flex items-center">
                  <Icon icon="pixel:folder-solid" className="w-3 h-3 mr-1" />
                  {profile.group}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/30 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh profile"
          >
            <Icon
              icon={
                isRefreshing ? "pixel:spinner-solid" : "pixel:refresh-solid"
              }
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
        <button
          onClick={onEdit}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/30 px-3 py-1 text-white/80 font-minecraft text-xs transition-colors flex items-center"
          title="Edit profile settings"
        >
          <Icon icon="pixel:cog-solid" className="mr-1 w-3 h-3" />
          Settings
        </button>
        <button
          onClick={onClose}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/30 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          title="Close detail view"
        >
          <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
