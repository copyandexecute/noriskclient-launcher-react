"use client";

import { useEffect } from "react";
import { SkinViewer } from "../launcher/SkinViewer";
import { LaunchButton } from "../launcher/LaunchButton";
import { VersionInfo } from "../launcher/VersionInfo";
import { NewsSection } from "../news/NewsSection";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useProfileStore } from "../../store/profile-store";
import { Profile } from "../../types/profile";

export function PlayTab() {
  const {
    profiles,
    selectedProfile: storeSelectedProfile,
    loading: profilesLoading,
    error: profilesError,
    setSelectedProfile,
  } = useProfileStore();

  const { activeAccount } = useMinecraftAuthStore();

  useEffect(() => {
    if (!storeSelectedProfile && profiles.length > 0) {
      console.log(
        "[PlayTab] No profile selected in store, defaulting to first available profile.",
      );
      setSelectedProfile(profiles[0]);
    }
  }, [storeSelectedProfile, profiles, setSelectedProfile]);

  const handleVersionChange = (versionId: string) => {
    console.log(`[PlayTab] User selected version changed to ${versionId}`);
    const profileToSelect = profiles.find((p) => p.id === versionId) || null;
    setSelectedProfile(profileToSelect);
  };

  const currentDisplayProfile = storeSelectedProfile || (profiles.length > 0 ? profiles[0] : null);

  const versions = profiles.map((profile) => ({
    id: profile.id,
    label: `${profile.name} (${profile.game_version})`,
    icon: profile.loader === "vanilla" ? undefined : profile.loader,
    isCustom: profile.loader !== "vanilla",
    profileId: profile.id,
  }));

  const skinUrl = activeAccount?.id
    ? `https://crafatar.com/skins/${activeAccount.id}`
    : `https://crafatar.com/skins/606e2ff0-ed77-4842-9d6c-e1d3321c7838`;

  if (profilesLoading) {
    return <LoadingState message="Loading profiles and data..." />;
  }

  if (!profilesLoading && profiles.length === 0 && !profilesError) {
    console.log("[PlayTab] No profiles found after initialization.");
  }

  return (
    <div className="flex h-full">
      <div className="flex-grow flex flex-col items-center justify-center p-8 relative">
        {(profilesError) && <ErrorMessage message={profilesError || "An unknown error occurred"} />}

        {currentDisplayProfile && (
          <VersionInfo
            profileId={currentDisplayProfile.id}
            className="absolute top-6 left-6 z-10"
          />
        )}

        <div className="flex flex-col items-center z-10">
          <h2 className="font-minecraft text-6xl text-center text-white mb-2 lowercase font-normal">
            {activeAccount?.minecraft_username ||
              activeAccount?.username ||
              "no account"}
          </h2>

          <div className="relative">
            <SkinViewer
              skinUrl={skinUrl}
              width={500}
              height={450}
              className="bg-transparent"
              autoRotate={true}
            />

            <div className="absolute bottom-8 left-20 right-0 w-full flex flex-col gap-3">
              <div className="px-4 w-full">
                <LaunchButton
                  defaultVersion={storeSelectedProfile?.id || ""}
                  onVersionChange={handleVersionChange}
                  versions={versions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewsSection className="w-1/3 border-l-2 border-white/40 bg-black/10 backdrop-blur-lg p-5 overflow-hidden flex flex-col" />
    </div>
  );
}
