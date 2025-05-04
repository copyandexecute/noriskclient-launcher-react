"use client";

import { useEffect, useState } from "react";
import type { Profile, ProfileFilterType } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";
import { ProfileWizard } from "../profiles/ProfileWizard";
import { ProfileSettings } from "../profiles/ProfileSettings";
import { ProfileDetailView } from "../profiles/ProfileDetailView";
import { ProfileImport } from "../profiles/ProfileImport";
import { useProfileStore } from "../../store/profile-store";
import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
import { FilterButtonGroup } from "../ui/FilterButtonGroup";
import { SearchInput } from "../ui/SearchInput";
import { ActionButton } from "../ui/ActionButton";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "@iconify/react";
import * as ProfileService from "../../services/profile-service";

export function ProfilesTab() {
  const {
    profiles,
    loading,
    error,
    fetchProfiles,
    selectedProfile,
    setSelectedProfile,
  } = useProfileStore();

  const [filter, setFilter] = useState<ProfileFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "group">("none");
  const [standardProfiles, setStandardProfiles] = useState<Profile[]>([]);
  const [loadingStandard, setLoadingStandard] = useState(false);
  const [standardError, setStandardError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
    fetchStandardProfiles();
  }, [fetchProfiles]);

  const fetchStandardProfiles = async () => {
    try {
      setLoadingStandard(true);
      setStandardError(null);
      const result = await ProfileService.getStandardProfiles();

      // Ensure we have a valid array of profiles
      if (result && result.profiles && Array.isArray(result.profiles)) {
        setStandardProfiles(result.profiles);
      } else if (Array.isArray(result)) {
        setStandardProfiles(result);
      } else {
        console.warn("Unexpected format for standard profiles:", result);
        setStandardProfiles([]);
      }
    } catch (error) {
      console.error("Failed to fetch standard profiles:", error);
      setStandardError("Failed to load NoRisk versions");
      setStandardProfiles([]);
    } finally {
      setLoadingStandard(false);
    }
  };

  // Ensure standardProfiles is always an array before spreading
  const standardProfilesArray = Array.isArray(standardProfiles)
    ? standardProfiles
    : [];
  const allProfiles = [...profiles, ...standardProfilesArray];

  const filteredProfiles = allProfiles.filter((profile) => {
    if (
      searchQuery &&
      !profile.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filter === "custom" && profile.is_standard_version) {
      return false;
    }
    if (filter === "standard" && !profile.is_standard_version) {
      return false;
    }

    return true;
  });

  const groupedProfiles: Record<string, Profile[]> = {};

  if (groupBy === "group") {
    filteredProfiles.forEach((profile) => {
      const group = profile.group || "Ungrouped";
      if (!groupedProfiles[group]) {
        groupedProfiles[group] = [];
      }
      groupedProfiles[group].push(profile);
    });
  } else {
    groupedProfiles["All Profiles"] = filteredProfiles;
  }

  const handleCreateProfile = () => {
    setShowWizard(false);
    fetchProfiles();
  };

  const handleEditProfile = (profile: Profile) => {
    // Don't allow editing standard profiles
    if (profile.is_standard_version) return;

    setSelectedProfile(profile);
    setShowSettings(true);
  };

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowDetailView(true);
  };

  const handleImportComplete = () => {
    fetchProfiles();
    setShowImport(false);
  };

  const filterOptions = [
    { id: "all", label: "all", icon: "pixel:grid-solid" },
    { id: "custom", label: "custom", icon: "pixel:futurism" },
    { id: "standard", label: "norisk", icon: "pixel:crown-solid" },
  ];

  const groupOptions = [
    { id: "none", label: "no groups", icon: "pixel:list-solid" },
    { id: "group", label: "by group", icon: "pixel:folder-solid" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showDetailView && selectedProfile ? (
        <ProfileDetailView
          profile={selectedProfile}
          onClose={() => {
            setShowDetailView(false);
            setSelectedProfile(null);
          }}
          onEdit={() => {
            if (!selectedProfile.is_standard_version) {
              setShowDetailView(false);
              setShowSettings(true);
            }
          }}
        />
      ) : (
        <>
          <TabHeader title="Profiles" icon="pixel:grid-solid">
            <div className="flex items-center space-x-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-48"
              />
              <ActionButton
                label="import"
                icon="pixel:file-import-solid"
                onClick={() => setShowImport(true)}
              />
              <ActionButton
                label="new"
                icon="pixel:plus-solid"
                onClick={() => setShowWizard(true)}
              />
            </div>
          </TabHeader>

          <div className="flex items-center space-x-4 px-6 py-3 bg-black/20 border-b border-white/10">
            <FilterButtonGroup
              options={filterOptions}
              activeId={filter}
              onChange={(id) => setFilter(id as ProfileFilterType)}
            />
            <FilterButtonGroup
              options={groupOptions}
              activeId={groupBy}
              onChange={(id) => setGroupBy(id as "none" | "group")}
            />
          </div>

          <TabContent className="p-6 pt-4 overflow-y-auto scrollbar-hide">
            {(loading || loadingStandard) &&
            filter !== "standard" &&
            filter !== "custom" ? (
              <LoadingState message="loading profiles..." />
            ) : error || standardError ? (
              <EmptyState
                icon="pixel:exclamation-triangle-solid"
                message={error || standardError || ""}
              />
            ) : (
              Object.entries(groupedProfiles).map(([group, groupProfiles]) => (
                <div key={group} className="mb-8">
                  {groupBy === "group" && groupProfiles.length > 0 && (
                    <h3 className="text-xl font-minecraft text-white mb-4 lowercase font-normal">
                      <div className="flex items-center gap-2">
                        <Icon icon="pixel:folder-solid" className="w-5 h-5" />
                        <span>{group.toLowerCase()}</span>
                      </div>
                    </h3>
                  )}
                  {groupProfiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {groupProfiles.map((profile) => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          onEdit={() => handleEditProfile(profile)}
                          onClick={() => handleViewProfile(profile)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}

            {!loading &&
              !loadingStandard &&
              !error &&
              !standardError &&
              filteredProfiles.length === 0 && (
                <EmptyState
                  icon="pixel:grid-solid"
                  message="no profiles found"
                />
              )}
          </TabContent>
        </>
      )}

      {showWizard && (
        <ProfileWizard
          onClose={() => setShowWizard(false)}
          onSave={handleCreateProfile}
        />
      )}

      {showSettings &&
        selectedProfile &&
        !selectedProfile.is_standard_version && (
          <ProfileSettings
            profile={selectedProfile}
            onClose={() => {
              setShowSettings(false);
              setSelectedProfile(null);
              fetchProfiles();
            }}
          />
        )}

      {showImport && (
        <ProfileImport
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
