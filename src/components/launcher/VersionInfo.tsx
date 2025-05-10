"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import * as ProfileService from "../../services/profile-service";
import { Button } from "../ui/buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";
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
  const { accentColor } = useThemeStore();

  const { initializeProfile, getProfileState } = useLaunchStateStore();
  const { launchState } = getProfileState(profileId || "");

  useEffect(() => {
    const loadProfile = async () => {
      if (!profileId) {
        setLoading(false);
        setProfile(null);
        return;
      }

      try {
        setLoading(true);
        const profileData = await ProfileService.getProfile(profileId);
        setProfile(profileData);
        setError(null);

        initializeProfile(profileId);
      } catch (err) {
        console.error(`Error loading profile ${profileId}:`, err);
        setError("Failed to load profile");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [profileId, initializeProfile]);

  if (!profileId) {
    return (
      <Button
        variant="default"
        size="md"
        disabled
        icon={
          <Icon icon="pixel:exclamation-triangle-solid" className="w-4 h-4" />
        }
        className={cn("font-minecraft", className)}
      >
        No profile selected
      </Button>
    );
  }

  if (loading) {
    return (
      <Button
        variant="default"
        size="md"
        disabled
        icon={
          <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
        }
        className={cn("font-minecraft", className)}
      >
        Loading...
      </Button>
    );
  }

  if (error || !profile) {
    return (
      <Button
        variant="destructive"
        size="md"
        disabled
        icon={
          <Icon icon="pixel:exclamation-triangle-solid" className="w-4 h-4" />
        }
        className={cn("font-minecraft", className)}
      >
        {error || "Profile not found"}
      </Button>
    );
  }

  const getModLoaderIcon = (loader: string) => {
    return `/icons/${loader.toLowerCase()}.png`;
  };

  const isLaunching = launchState === LaunchState.LAUNCHING;
  const variant = isLaunching ? "info" : "default";

  return (
    <Button
      variant={variant}
      size="md"
      disabled
      icon={
        <img
          src={getModLoaderIcon(profile.loader) || "/placeholder.svg"}
          alt={`${profile.loader} icon`}
          className="w-5 h-5"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/icons/minecraft.png";
          }}
        />
      }
      className={cn("font-minecraft", className)}
    >
      {profile.name} ({profile.game_version})
      {isLaunching && (
        <Icon
          icon="pixel:spinner-solid"
          className="w-4 h-4 ml-2 text-red-400 animate-spin"
        />
      )}
    </Button>
  );
}
