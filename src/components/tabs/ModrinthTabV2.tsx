"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ModrinthSearchV2 } from "../modrinth/v2/ModrinthSearchV2";
import type { Profile } from "../../types/profile";
import { listProfiles } from "../../services/profile-service";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useThemeStore } from "../../store/useThemeStore";
import { useDisplayContextStore } from "../../store/useDisplayContextStore";
import { gsap } from "gsap";

interface ModrinthTabV2Props {
  profiles?: Profile[];
}

export function ModrinthTabV2({
  profiles: initialProfiles = [],
}: ModrinthTabV2Props) {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accentColor = useThemeStore((state) => state.accentColor);
  const setDisplayContext = useDisplayContextStore((state) => state.setContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayContext("standalone");
  }, [setDisplayContext]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

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
    listProfiles()
      .then(setProfiles)
      .catch((err) =>
        console.error("Failed to refresh profiles after install", err),
      );
  }, []);

  const handleRefresh = async () => {
    try {
      const fetchedProfiles = await listProfiles();
      setProfiles(fetchedProfiles);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to refresh profiles:", err);
      setError(
        `Failed to refresh profiles: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col p-4">
      {error && <ErrorMessage message={error} />}

      {!profilesLoaded ? (
        <LoadingState message="Loading profiles..." />
      ) : (
        <>
          <div
            className="flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm"
            style={{
              backgroundColor: `${accentColor.value}08`,
              borderColor: `${accentColor.value}20`,
            }}
          >
            <ModrinthSearchV2
              profiles={profiles}
              onInstallSuccess={handleInstallSuccess}
              className="h-full"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ModrinthTabV2;
