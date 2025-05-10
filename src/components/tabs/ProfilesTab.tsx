"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile, ProfileFilterType } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";
import { ProfileDetailView } from "../profiles/ProfileDetailView";
import { useProfileStore } from "../../store/profile-store";
import { SearchInput } from "../ui/SearchInput";
import { IconButton } from "../ui/buttons/IconButton";
import { Label } from "../ui/Label";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "@iconify/react";
import * as ProfileService from "../../services/profile-service";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { ProfileImport } from "../profiles/ProfileImport";
import { ProfileSettings } from "../profiles/ProfileSettings.tsx";
import { ProfileWizard } from "../profiles/ProfileWizard.tsx";

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

  const [filter, setFilter] = useState<ProfileFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
            <div className="flex items-center gap-3 flex-wrap">
              <Label
                variant={filter === "all" ? "default" : "ghost"}
                size="sm"
                className="cursor-pointer"
                onClick={() => setFilter("all")}
                icon={
                  <Icon
                    icon="solar:widget-bold"
                    className="w-4 h-4 text-white"
                  />
                }
              >
                all profiles
              </Label>
              <Label
                variant={filter === "custom" ? "default" : "ghost"}
                size="sm"
                className="cursor-pointer"
                onClick={() => setFilter("custom")}
                icon={
                  <Icon icon="solar:user-bold" className="w-4 h-4 text-white" />
                }
              >
                custom profiles
              </Label>
              <Label
                variant={filter === "standard" ? "default" : "ghost"}
                size="sm"
                className="cursor-pointer"
                onClick={() => setFilter("standard")}
                icon={
                  <Icon
                    icon="solar:crown-bold"
                    className="w-4 h-4 text-white"
                  />
                }
              >
                norisk profiles
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search profiles..."
                className="w-full md:w-64"
              />
              <IconButton
                onClick={() => setShowImport(true)}
                variant="secondary"
                size="sm"
                icon={
                  <Icon
                    icon="solar:upload-bold"
                    className="w-4 h-4 text-white"
                  />
                }
                aria-label="Import Profile"
              />
              <IconButton
                onClick={() => setShowWizard(true)}
                variant="default"
                size="sm"
                icon={
                  <Icon
                    icon="solar:widget-add-bold"
                    className="w-4 h-4 text-white"
                  />
                }
                aria-label="New Profile"
              />
            </div>
          </div>

          <div className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar">
            {(loading || loadingStandard) &&
            filter !== "standard" &&
            filter !== "custom" ? (
              <LoadingState message="loading profiles..." />
            ) : error || standardError ? (
              <EmptyState
                icon="solar:danger-triangle-bold"
                message={error || standardError || ""}
              />
            ) : filteredProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {filteredProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={() => handleEditProfile(profile)}
                    onClick={() => handleViewProfile(profile)}
                  />
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
