"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useLaunchStateStore } from "../../store/launch-state-store";
import {
  getStandardProfiles,
  refreshStandardVersions,
} from "../../services/profile-service";
import type { Profile } from "../../types/profile";

interface StandardProfilesGridProps {
  onCopyProfile?: (profile: Profile) => void;
}

export function StandardProfilesGrid({
  onCopyProfile,
}: StandardProfilesGridProps) {
  const [standardProfiles, setStandardProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    launchingProfiles,
    initializeProfile,
    launchProfile,
    abortProfileLaunch,
    isProfileLaunching,
    addDebugLog,
    debugInfo,
    showDebugInfo,
    toggleDebugInfo,
    resolveImageSource,
    getLastEvent,
  } = useLaunchStateStore();

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        addDebugLog("Loading standard profiles...");

        // First load cached profiles
        try {
          const result = await getStandardProfiles();
          if (result && result.profiles && Array.isArray(result.profiles)) {
            setStandardProfiles(result.profiles);
            addDebugLog(`Loaded ${result.profiles.length} standard profiles`);

            // Initialize profile states
            result.profiles.forEach((profile) => {
              initializeProfile(profile.id);
            });
          } else {
            addDebugLog("No standard profiles found in initial load");
            setStandardProfiles([]);
          }
        } catch (initialError) {
          addDebugLog(`Error loading initial profiles: ${initialError}`);
          setError(`Failed to load standard profiles: ${initialError}`);
          setStandardProfiles([]);
        }

        // Then try to refresh from server
        try {
          addDebugLog("Refreshing standard versions from server...");
          await refreshStandardVersions();
          addDebugLog("Successfully refreshed standard versions");

          // Reload profiles after refresh
          const refreshedResult = await getStandardProfiles();
          if (
            refreshedResult &&
            refreshedResult.profiles &&
            Array.isArray(refreshedResult.profiles)
          ) {
            setStandardProfiles(refreshedResult.profiles);
            addDebugLog(
              `Reloaded ${refreshedResult.profiles.length} standard profiles after refresh`,
            );

            // Initialize profile states for any new profiles
            refreshedResult.profiles.forEach((profile) => {
              initializeProfile(profile.id);
            });
          }
        } catch (refreshError) {
          addDebugLog(`Failed to refresh standard versions: ${refreshError}`);
          // Continue with cached data, no need to set error
        }

        // Pre-resolve profile backgrounds
        if (standardProfiles.length > 0) {
          addDebugLog("Pre-resolving profile backgrounds...");
          for (const profile of standardProfiles) {
            if (profile.banner?.source) {
              await resolveImageSource(profile.id, profile.banner.source);
            }
          }
          addDebugLog("Background resolution complete");
        }
      } catch (error) {
        addDebugLog(`Error in loadProfiles: ${error}`);
        setError(`Failed to load standard profiles: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleProfileAction = async (profileId: string) => {
    const isLaunching = isProfileLaunching(profileId);

    if (isLaunching) {
      addDebugLog(`Aborting launch for profile ${profileId}`);
      await abortProfileLaunch(profileId);
    } else {
      addDebugLog(`Launching profile ${profileId}`);
      await launchProfile(profileId);
    }
  };

  const handleCopyProfile = (profile: Profile) => {
    if (onCopyProfile) {
      addDebugLog(`Copying profile ${profile.id}`);
      onCopyProfile(profile);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icon
          icon="pixel:spinner-solid"
          className="w-6 h-6 animate-spin mr-2 text-white/70"
        />
        <span className="text-white/70 font-minecraft">
          Loading NoRisk versions...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <Icon
          icon="pixel:exclamation-triangle-solid"
          className="w-8 h-8 text-red-400 mx-auto mb-4"
        />
        <p className="text-red-400 font-minecraft text-lg mb-2">{error}</p>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  if (!standardProfiles || standardProfiles.length === 0) {
    return (
      <div className="p-8 text-center">
        <Icon
          icon="pixel:info-solid"
          className="w-8 h-8 text-white/50 mx-auto mb-4"
        />
        <p className="text-white/70 font-minecraft text-lg">
          No NoRisk standard versions available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {standardProfiles.map((profile) => {
          const isLaunching = isProfileLaunching(profile.id);
          const lastEvent = getLastEvent(profile.id);

          return (
            <Card
              key={profile.id}
              className="overflow-hidden relative"
              style={{
                backgroundImage: `url("${profile.banner?.source}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />

              <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="mb-2">
                  <h3 className="text-white font-minecraft text-xl">
                    {profile.name}
                  </h3>
                  <div className="text-white/70 text-sm">
                    {profile.game_version} • {profile.loader}
                  </div>
                </div>

                <p className="text-white/80 text-sm mb-4 flex-grow">
                  {profile.description}
                </p>

                {lastEvent && (
                  <div className="bg-black/30 p-2 rounded mb-4">
                    <p
                      className="text-white/90 text-sm truncate"
                      title={lastEvent.message}
                    >
                      {lastEvent.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button
                    onClick={() => handleProfileAction(profile.id)}
                    variant={isLaunching ? "danger" : "success"}
                    className="flex-1"
                  >
                    {isLaunching ? "Cancel" : "Launch"}
                    {isLaunching && (
                      <Icon
                        icon="pixel:spinner-solid"
                        className="w-4 h-4 ml-2 animate-spin"
                      />
                    )}
                  </Button>

                  <Button
                    onClick={() => handleCopyProfile(profile)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Copy as Profile
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showDebugInfo && debugInfo.length > 0 && (
        <Card className="mt-4 p-4 bg-black/80">
          <details>
            <summary className="cursor-pointer font-minecraft text-white/80 mb-2">
              Debug Information ({debugInfo.length} logs)
            </summary>
            <div className="max-h-64 overflow-y-auto text-xs font-mono text-white/70">
              {debugInfo.map((log, index) => (
                <div key={index} className="mb-1 border-b border-white/10 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </details>
          <Button
            onClick={toggleDebugInfo}
            variant="secondary"
            size="sm"
            className="mt-2"
          >
            Hide Debug Info
          </Button>
        </Card>
      )}
    </div>
  );
}
