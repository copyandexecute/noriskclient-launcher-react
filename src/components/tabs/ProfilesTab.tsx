"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";
import { ProfileDetailView } from "../profiles/ProfileDetailView";
import { useProfileStore } from "../../store/profile-store";
import { SearchInput } from "../ui/SearchInput";
import { IconButton } from "../ui/buttons/IconButton";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "@iconify/react";
import * as ProfileService from "../../services/profile-service";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { ProfileImport } from "../profiles/ProfileImport";
import { ProfileSettings } from "../profiles/ProfileSettings.tsx";
import { ProfileWizard } from "../profiles/ProfileWizard.tsx";
import { Select } from "../ui/Select";
import { Button } from "../ui/buttons/Button";

// Define grouping options
const groupingOptions = [
  { value: "none", label: "No Grouping", icon: <Icon icon="solar:menu-dots-linear" className="w-4 h-4" /> },
  { value: "loader", label: "Loader", icon: <Icon icon="solar:box-bold" className="w-4 h-4" /> },
  { value: "game_version", label: "Game Version", icon: <Icon icon="solar:gamepad-bold" className="w-4 h-4" /> },
  { value: "group", label: "Group", icon: <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4" /> },
];

export function ProfilesTab() {
  const {
    profiles,
    loading,
    error,
    fetchProfiles,
    selectedProfile,
    setSelectedProfile,
  } = useProfileStore();

  const accentColor = useThemeStore((state) => state.accentColor);
  const tabRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [groupingCriterion, setGroupingCriterion] = useState<string>("none");
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [standardProfiles, setStandardProfiles] = useState<Profile[]>([]);
  const [loadingStandard, setLoadingStandard] = useState(false);
  const [standardError, setStandardError] = useState<string | null>(null);

  useEffect(() => {
    if (tabRef.current) {
      gsap.fromTo(
        tabRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchStandardProfiles();
  }, [fetchProfiles]);

  const fetchStandardProfiles = async () => {
    try {
      setLoadingStandard(true);
      setStandardError(null);
      const result = await ProfileService.getStandardProfiles();

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

  const standardProfilesArray = Array.isArray(standardProfiles)
    ? standardProfiles
    : [];
  const allProfiles = [...profiles, ...standardProfilesArray];

  const initiallyFilteredProfiles = allProfiles.filter((profile) => {
    if (
      searchQuery &&
      !profile.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Grouping logic
  const groupedProfiles = (() => {
    if (groupingCriterion === 'none') {
      return { 'All Profiles': initiallyFilteredProfiles };
    }

    return initiallyFilteredProfiles.reduce((acc, profile) => {
      let key = 'Unknown';
      if (groupingCriterion === 'loader') {
        key = profile.loader?.toString() || 'Vanilla';
      } else if (groupingCriterion === 'game_version') {
        key = profile.game_version || 'Unknown Version';
      } else if (groupingCriterion === 'group') {
        key = profile.group || 'No Group';
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(profile);
      return acc;
    }, {} as Record<string, Profile[]>);
  })();

  const sortedGroupKeys = Object.keys(groupedProfiles).sort((a, b) => {
    const specialKeys = ['All Profiles', 'Unknown', 'Vanilla', 'Unknown Version', 'No Group'];
    if (specialKeys.includes(a)) return 1;
    if (specialKeys.includes(b)) return -1;
    return a.localeCompare(b);
  });

  const handleCreateProfile = () => {
    setShowWizard(false);
    fetchProfiles();
  };

  const handleEditProfile = (profile: Profile) => {
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

  return (
    <div ref={tabRef} className="flex flex-col h-full overflow-hidden">
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
          <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b-2 sticky top-0 z-10"
            style={{
              backgroundColor: `${accentColor.value}15`,
              borderColor: `${accentColor.value}60`,
              boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
            }}
          >
            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search profiles..."
                className="w-full md:w-auto flex-grow md:flex-grow-0 h-[54px]"
              />
              <Select
                value={groupingCriterion}
                onChange={setGroupingCriterion}
                options={groupingOptions}
                className="w-full md:w-52"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowWizard(true)}
                variant="default"
                size="md"
                className="h-[54px]"
                icon={<Icon icon="solar:widget-add-bold" className="w-5 h-5" />}
                iconPosition="left"
              >
                CREATE
              </Button>
              <Button 
                onClick={() => setShowImport(true)}
                variant="secondary"
                size="md"
                className="h-[54px]"
                icon={<Icon icon="solar:upload-bold" className="w-5 h-5" />}
                iconPosition="left"
              >
                IMPORT
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar">
            {(loading || loadingStandard) ? (
              <LoadingState message="loading profiles..." />
            ) : error || standardError ? (
              <EmptyState
                icon="solar:danger-triangle-bold"
                message={error || standardError || ""}
              />
            ) : initiallyFilteredProfiles.length > 0 ? (
              <div className="space-y-6">
                {sortedGroupKeys.map((groupKey) => (
                  <div key={groupKey}>
                    {groupingCriterion !== 'none' && (
                      <h2 
                        className="text-2xl font-minecraft lowercase text-white mb-3 pb-1 border-b-2"
                        style={{ borderColor: `${accentColor.value}40` }}
                      >
                        {groupKey}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {groupedProfiles[groupKey].map((profile) => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          onEdit={() => handleEditProfile(profile)}
                          onClick={() => handleViewProfile(profile)}
                        />
                      ))}
                    </div>
                    {groupedProfiles[groupKey].length === 0 && groupingCriterion !== 'none' && (
                       <p className="text-neutral-500 italic text-center py-4">No profiles in this group.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="solar:widget-bold"
                message="no profiles found"
              />
            )}
          </div>
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
