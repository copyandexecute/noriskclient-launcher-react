"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Profile } from "../../types/profile";
import { listProfiles } from "../../services/profile-service";
import { ErrorMessage } from "../ui/ErrorMessage";
import { LoadingOverlay } from "../ui/LoadingOverlay";
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + Math.random() * 15;
        return next > 90 ? 90 : next;
      });
    }, 300);

    // Only load profiles if they haven't been loaded yet
    if (initialProfiles.length === 0 && !profilesLoaded) {
      const loadProfiles = async () => {
        try {
          const fetchedProfiles = await listProfiles();
          setProfiles(fetchedProfiles);
          setProfilesLoaded(true);

          // Complete loading after profiles are loaded
          setLoadingProgress(100);
          setTimeout(() => setIsLoading(false), 500); // Small delay to show 100% before hiding
        } catch (err) {
          console.error("Failed to load profiles:", err);
          setError(
            `Failed to load profiles: ${err instanceof Error ? err.message : String(err)}`,
          );
          setProfilesLoaded(true);
          setIsLoading(false);
        }
      };

      // Use requestIdleCallback for non-critical loading if available
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          loadProfiles();
        });
      } else {
        // Fallback to setTimeout with a small delay
        setTimeout(loadProfiles, 10);
      }
    } else if (!profilesLoaded) {
      // If profiles were provided as props, just mark as loaded
      setProfilesLoaded(true);

      // Simulate loading completion
      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => setIsLoading(false), 500);
      }, 800);
    }

    return () => clearInterval(progressInterval);
  }, [initialProfiles, profilesLoaded]);

  const handleInstallSuccess = useCallback(() => {
    // This might trigger a refresh of profile list or other UI elements
    // setRefreshKey((prev) => prev + 1);
    // Potentially reload profiles if an installation changes them
    // listProfiles().then(setProfiles).catch(err => console.error("Failed to refresh profiles after install", err));
  }, []);

  const loadingMessage = useMemo(() => {
    const messages = [
      "Loading mods...",
      "Preparing content...",
      "Fetching profiles...",
      "Almost ready...",
    ];
    const index = Math.min(
      Math.floor(loadingProgress / 25),
      messages.length - 1,
    );
    return messages[index];
  }, [loadingProgress]);

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 relative">
      <LoadingOverlay
        isLoading={isLoading}
        message={loadingMessage}
        progress={loadingProgress}
        variant="default"
        shadowDepth="default"
      />

      {error && <ErrorMessage message={error} />}
    </div>
  );
}

export default ModrinthTabV2;
