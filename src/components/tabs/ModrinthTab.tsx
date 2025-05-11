"use client";

import { useCallback, useEffect, useState } from "react";
import { ModrinthSearch } from "../modrinth/ModrinthSearch";
import type { Profile } from "../../types/profile";
import { listProfiles } from "../../services/profile-service";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { Card } from "../ui/Card";
import { useThemeStore } from "../../store/useThemeStore";

interface ModrinthTabProps {
  profiles?: Profile[];
}

export function ModrinthTab({
  profiles: initialProfiles = [],
}: ModrinthTabProps) {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const fetchedProfiles = await listProfiles();
        setProfiles(fetchedProfiles);
        setProfilesLoaded(true);
      } catch (err) {
        console.error("Failed to load profiles:", err);
        setError(
          `Failed to load profiles: ${err instanceof Error ? err.message : String(err)}`,
        );
        setProfilesLoaded(true);
      }
    };

    if (initialProfiles.length === 0 && !profilesLoaded) {
      loadProfiles();
    } else {
      setProfilesLoaded(true);
    }
  }, [initialProfiles, profilesLoaded]);

  const handleInstallSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden p-4">
      {error && <ErrorMessage message={error} />}

      {!profilesLoaded ? (
        <LoadingState message="Loading profiles..." />
      ) : (
        <div className="flex-1 overflow-hidden">
          <ModrinthSearch
            key={`search-${refreshKey}`}
            profiles={profiles}
            onInstallSuccess={handleInstallSuccess}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}

export default ModrinthTab;
