"use client";

import { useCallback, useEffect, useState } from "react";
import { ModrinthSearchV2 } from "../modrinth/v2/ModrinthSearchV2"; // Adjusted import path
import type { Profile } from "../../types/profile";
import { listProfiles } from "../../services/profile-service";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
// import { Card } from "../ui/Card"; // Card might not be directly needed here anymore
// import { useThemeStore } from "../../store/useThemeStore"; // Theme store might be used by sub-components
// import { ModrinthFilters } from "../modrinth/ModrinthFilters"; // Filters will be part of ModrinthSearchV2 or a new V2 component
// import type { ModrinthProjectType } from "../../types/modrinth"; // ProjectType will be managed within ModrinthSearchV2

interface ModrinthTabV2Props {
  profiles?: Profile[];
}

export function ModrinthTabV2({
  profiles: initialProfiles = [],
}: ModrinthTabV2Props) {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // May or may not be needed depending on V2 search interaction
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  // const accentColor = useThemeStore((state) => state.accentColor); // If needed, can be passed down or used by children

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
    // This might trigger a refresh of profile list or other UI elements
    setRefreshKey((prev) => prev + 1);
    // Potentially reload profiles if an installation changes them
    // listProfiles().then(setProfiles).catch(err => console.error("Failed to refresh profiles after install", err));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden p-4">
      {error && <ErrorMessage message={error} />}

      {!profilesLoaded ? (
        <LoadingState message="Loading profiles..." />
      ) : (
        <div className="flex-1 overflow-hidden flex space-x-4">
          <div className="flex-1 overflow-hidden">
            <ModrinthSearchV2
              key={`search-v2-${refreshKey}`}
              profiles={profiles}
              onInstallSuccess={handleInstallSuccess}
              className="h-full"
            />
          </div>
          {/* 
            Filters are now intended to be part of ModrinthSearchV2 or a new ModrinthFiltersV2.
            If ModrinthFiltersV2 is separate, it would be placed here or within ModrinthSearchV2 layout.
            For now, assuming filters are integrated or will be added to ModrinthSearchV2 itself.
          */}
          {/* 
          <div className="w-1/4 max-w-xs flex-shrink-0">
            <ModrinthFiltersV2 ... /> 
          </div>
          */}
        </div>
      )}
    </div>
  );
}

export default ModrinthTabV2; 