"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import * as ProfileService from "../../services/profile-service";
import { Card } from "../ui/Card";
import {
  LaunchState,
  useLaunchStateStore,
} from "../../store/launch-state-store";

interface VersionInfoProps {
  profileId: string;
  className?: string;
}

export function VersionInfo({ profileId, className }: VersionInfoProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { initializeProfile, getProfileState } = useLaunchStateStore();
  const { launchState } = getProfileState(profileId);

  useEffect(() => {
    if (profileId) {
      initializeProfile(profileId);
    }
  }, [profileId, initializeProfile]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profileData = await ProfileService.getProfile(profileId);
        setProfile(profileData);
        setError(null);
      } catch (err) {
        console.error(`Error loading profile ${profileId}:`, err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [profileId]);

  if (!profileId) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center text-white/70 font-minecraft",
          className,
        )}
      >
        <Icon
          icon="pixel:spinner-solid"
          className="w-5 h-5 animate-spin mr-2"
        />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={cn("text-red-400 font-minecraft", className)}>
        <Icon
          icon="pixel:exclamation-triangle-solid"
          className="w-5 h-5 inline-block mr-2"
        />
        <span>{error || "Profile not found"}</span>
      </div>
    );
  }

  const getModLoaderIcon = (loader: string) => {
    switch (loader.toLowerCase()) {
      case "fabric":
        return "pixel:fabric";
      case "forge":
        return "pixel:forge";
      case "quilt":
        return "pixel:quilt";
      case "neoforge":
        return "pixel:neoforge";
      default:
        return "pixel:minecraft";
    }
  };

  const isLaunching = launchState === LaunchState.LAUNCHING;

  return (
    <Card className={cn("inline-flex items-center px-3 py-1.5", className)}>
      <Icon
        icon={getModLoaderIcon(profile.loader)}
        className="w-5 h-5 mr-2 text-white/80"
      />
      <span className="font-minecraft text-white/90 text-sm">
        {profile.name} ({profile.game_version})
      </span>
      {isLaunching && (
        <Icon
          icon="pixel:spinner-solid"
          className="w-4 h-4 ml-2 text-red-400 animate-spin"
        />
      )}
    </Card>
  );
}
