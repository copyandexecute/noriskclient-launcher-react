"use client";

import { useEffect, useState } from "react";
import { SkinViewer } from "../launcher/SkinViewer";
import { LaunchButton } from "../launcher/LaunchButton";
import { VersionInfo } from "../launcher/VersionInfo";
import { NewsSection } from "../news/NewsSection";
import * as ProfileService from "../../services/profile-service";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { toast } from "react-hot-toast";

export function PlayTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { activeAccount } = useMinecraftAuthStore();

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        const data = await ProfileService.listProfiles();
        setProfiles(data);

        if (data.length > 0) {
          const newSelectedVersion = data[0].id;
          console.log(
            `[PlayTab] Setting initial selected version to ${newSelectedVersion}`,
          );
          setSelectedVersion(newSelectedVersion);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to load profiles:", err);
        setLaunchError("Failed to load profiles");
        setIsInitialized(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleVersionChange = (version: string) => {
    console.log(`[PlayTab] Version changed to ${version}`);
    setSelectedVersion(version);
  };

  const selectedProfile =
    profiles.find((p) => p.id === selectedVersion) || profiles[0];

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

  if (loading) {
    return <LoadingState message="Loading profiles..." />;
  }

  return (
    <div className="flex h-full">
      <div className="flex-grow flex flex-col items-center justify-center p-8 relative">
        {launchError && <ErrorMessage message={launchError} />}

        {selectedProfile && (
          <VersionInfo
            profileId={selectedProfile.id}
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
              {isInitialized && (
                <div className="px-4 w-full">
                  <LaunchButton
                    defaultVersion={selectedVersion}
                    onVersionChange={handleVersionChange}
                    versions={versions}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewsSection className="w-1/3 border-l-2 border-white/40 bg-black/10 backdrop-blur-lg p-5 overflow-hidden flex flex-col" />
    </div>
  );
}
