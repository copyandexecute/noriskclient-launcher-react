"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { cn } from "../../lib/utils";
import { useProfileStore } from "../../store/profile-store";
import {
  LaunchState,
  useLaunchStateStore,
} from "../../store/launch-state-store";
import { IconButton } from ".././ui/IconButton";

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onClick: () => void;
}

export function ProfileCard({ profile, onEdit, onClick }: ProfileCardProps) {
  const {
    launchProfile,
    installProfile,
    isProfileLaunching,
    abortProfileLaunch,
  } = useProfileStore();

  const { initializeProfile, getProfileState } = useLaunchStateStore();

  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    initializeProfile(profile.id);
  }, [profile.id, initializeProfile]);

  const { launchState, currentStep, launchProgress } = getProfileState(
    profile.id,
  );
  const isProfileCurrentlyLaunching = launchState === LaunchState.LAUNCHING;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (profile.state === "installing") {
          setIsInstalling(true);
        }

        const launching = await isProfileLaunching(profile.id);
        setIsLaunching(launching);
      } catch (err) {
        console.error("Error checking profile status:", err);
      }
    };

    checkStatus();
  }, [profile.id, profile.state, isProfileLaunching]);

  const getModLoaderIcon = () => {
    switch (profile.loader) {
      case "fabric":
        return "/icons/fabric.png";
      case "forge":
        return "/icons/forge.png";
      case "quilt":
        return "/icons/quilt.png";
      case "neoforge":
        return "/icons/neoforge.png";
      default:
        return "/icons/minecraft.png";
    }
  };

  const getProfileIcon = () => {
    if (profile.banner?.source.type === "url") {
      return profile.banner.source.url;
    }
    return null;
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLaunchError(null);

    if (profile.state === "not_installed") {
      await handleInstall(e);
      return;
    }

    try {
      setIsLaunching(true);
      await launchProfile(profile.id);

      const interval = setInterval(async () => {
        try {
          const isStillLaunching = await isProfileLaunching(profile.id);
          if (!isStillLaunching) {
            setIsLaunching(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error checking launch status:", err);
          setIsLaunching(false);
          clearInterval(interval);
        }
      }, 2000);

      setTimeout(() => {
        setIsLaunching(false);
        clearInterval(interval);
      }, 60000);
    } catch (err) {
      console.error("Error launching profile:", err);
      setIsLaunching(false);
      setLaunchError(
        err instanceof Error ? err.message : "Failed to launch profile",
      );
    }
  };

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLaunchError(null);

    try {
      setIsInstalling(true);
      await installProfile(profile.id);

      const interval = setInterval(async () => {
        try {
          const updatedProfile = await useProfileStore
            .getState()
            .getProfile(profile.id);
          if (updatedProfile.state !== "installing") {
            setIsInstalling(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error checking installation status:", err);
          setIsInstalling(false);
          clearInterval(interval);
        }
      }, 2000);

      setTimeout(() => {
        setIsInstalling(false);
        clearInterval(interval);
      }, 300000);
    } catch (err) {
      console.error("Error installing profile:", err);
      setIsInstalling(false);
      setLaunchError(
        err instanceof Error ? err.message : "Failed to install profile",
      );
    }
  };

  const handleAbort = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await abortProfileLaunch(profile.id);
      setIsLaunching(false);
    } catch (err) {
      console.error("Error aborting launch:", err);
      setLaunchError(
        err instanceof Error ? err.message : "Failed to abort launch",
      );
    }
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLaunchError(null);

    try {
      setIsCloning(true);
      await useProfileStore
        .getState()
        .copyProfile(profile.id, `${profile.name} (Copy)`);
    } catch (error) {
      console.error("Failed to clone profile:", error);
      setLaunchError("Failed to clone profile");
    } finally {
      setIsCloning(false);
    }
  };

  const getButtonContent = () => {
    if (isLaunching || isProfileCurrentlyLaunching) {
      return (
        <>
          <Icon
            icon="pixel:spinner-solid"
            className="w-4 h-4 animate-spin text-red-400"
          />
          <span>STARTING</span>
        </>
      );
    } else if (isInstalling) {
      return (
        <>
          <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
          <span>INSTALLING</span>
        </>
      );
    } else if (profile.state === "not_installed") {
      return (
        <>
          <Icon icon="pixel:download-solid" className="w-4 h-4" />
          <span>INSTALL</span>
        </>
      );
    } else {
      return (
        <>
          <Icon icon="pixel:play-solid" className="w-4 h-4" />
          <span>LAUNCH GAME</span>
        </>
      );
    }
  };

  const isButtonDisabled =
    isLaunching || isInstalling || isProfileCurrentlyLaunching;

  return (
    <div
      className={cn(
        "bg-black/10 backdrop-blur-lg border-2 border-white/30 overflow-hidden transition-all duration-300 cursor-pointer h-[280px] flex flex-col select-none",
        isHovered && "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
        isLaunching && "border-red-400/50",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-black/20">
        <div className="flex items-center flex-1 min-w-0">
          <div className="w-12 h-12 mr-3 relative flex-shrink-0 border-2 border-white/30 bg-black/30 flex items-center justify-center">
            {getProfileIcon() ? (
              <img
                src={getProfileIcon() || "/placeholder.svg"}
                alt={profile.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Icon icon="pixel:grid-solid" className="w-6 h-6 text-white/70" />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-2xl font-minecraft text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] lowercase font-normal">
              {profile.name}
            </h3>
            <div className="flex items-center mt-1">
              <img
                src={getModLoaderIcon() || "/placeholder.svg"}
                alt={profile.loader || "vanilla"}
                className="w-5 h-5 mr-2"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="text-base text-white/70 font-minecraft whitespace-nowrap lowercase">
                {profile.game_version}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {profile.selected_norisk_pack_id && (
            <div
              className="w-8 h-8 flex items-center justify-center text-blue-300"
              title="NoRisk Pack"
            >
              <Icon icon="pixel:shield-solid" className="w-5 h-5" />
            </div>
          )}
          <IconButton
            icon={
              isCloning ? (
                <Icon
                  icon="pixel:spinner-solid"
                  className="w-4 h-4 animate-spin"
                />
              ) : (
                <Icon icon="pixel:copy-solid" className="w-4 h-4" />
              )
            }
            // @ts-ignore
            onClick={(e) => handleClone(e)}
            disabled={isCloning}
            title="Clone Profile"
          />
          <IconButton
            icon={<Icon icon="pixel:cog-solid" className="w-4 h-4" />}
            // @ts-ignore
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Settings"
          />
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        {profile.description && (
          <p className="text-xl text-white/70 font-minecraft mb-3 line-clamp-3 select-none">
            {profile.description}
          </p>
        )}

        {profile.group && (
          <div className="flex items-center mt-auto mb-3">
            <Icon
              icon="pixel:folder-solid"
              className="w-5 h-5 mr-2 text-white/60"
            />
            <span className="text-base text-white/60 font-minecraft lowercase">
              {profile.group}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/20 bg-black/20">
        {launchError && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-minecraft">
            {launchError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isLaunching || isProfileCurrentlyLaunching ? (
            <div className="flex flex-col gap-2">
              <button
                className="backdrop-blur-sm border-2 border-red-400/50 bg-red-900/30 py-4 px-6 text-2xl text-white font-minecraft flex items-center justify-center gap-3 transition-all uppercase whitespace-nowrap hover:bg-red-900/40 select-none"
                onClick={handleAbort}
              >
                <Icon icon="pixel:x-solid" className="w-5 h-5" />
                <span>ABORT</span>
              </button>
              <div className="w-full h-[3px] bg-black/40">
                <div
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${Math.max(1, launchProgress * 100)}%` }}
                />
              </div>
              <div className="text-base text-white/80 font-minecraft text-center">
                {currentStep}
              </div>
            </div>
          ) : (
            <button
              className={cn(
                "backdrop-blur-sm border-2 border-white/30 py-4 px-6 text-2xl text-white font-minecraft flex items-center justify-center gap-3 transition-all uppercase whitespace-nowrap select-none",
                isButtonDisabled
                  ? "bg-black/60 cursor-wait"
                  : "bg-black/40 hover:bg-black/60 active:bg-black/70 active:scale-[0.99]",
              )}
              onClick={
                profile.state === "not_installed" ? handleInstall : handlePlay
              }
              disabled={isButtonDisabled}
            >
              {getButtonContent()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
