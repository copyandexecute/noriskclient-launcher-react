"use client";

import { useCallback, useEffect, useState } from "react";
import { ModrinthSearch } from "../modrinth/ModrinthSearch";
import { FeaturedContent } from "../modrinth/FeaturedContent";
import type { Profile } from "../../types/profile";
import { listProfiles } from "../../services/profile-service";
import { TabHeader } from "../ui/TabHeader";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { TabButton } from "../ui/TabButton";

interface ModrinthTabProps {
  profiles?: Profile[];
}

export function ModrinthTab({
  profiles: initialProfiles = [],
}: ModrinthTabProps) {
  const [activeView, setActiveView] = useState<"search" | "featured">("search");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        console.log("Loading profiles for ModrinthTab...");
        const fetchedProfiles = await listProfiles();
        console.log(`Loaded ${fetchedProfiles.length} profiles`);
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

  const handleViewChange = (view: "search" | "featured") => {
    setActiveView(view);
  };

  const handleInstallSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setError(null);
  }, [activeView]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader icon="pixel:bolt-solid" title="Modrinth Content">
        <div className="flex items-center gap-2">
          <TabButton
            label="Search"
            isActive={activeView === "search"}
            onClick={() => handleViewChange("search")}
          />
          <TabButton
            label="Featured"
            isActive={activeView === "featured"}
            onClick={() => handleViewChange("featured")}
          />
        </div>
      </TabHeader>

      {error && <ErrorMessage message={error} />}

      {!profilesLoaded ? (
        <LoadingState message="Loading profiles..." />
      ) : (
        <div className="flex-1 min-h-screen overflow-y-auto">
          {activeView === "search" ? (
            <ModrinthSearch
              key={`search-${refreshKey}`}
              profiles={profiles}
              onInstallSuccess={handleInstallSuccess}
              className="h-full"
            />
          ) : (
            <FeaturedContent
              key={`featured-${refreshKey}`}
              profiles={profiles}
              onInstallSuccess={handleInstallSuccess}
              className="h-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
export default ModrinthTab;
