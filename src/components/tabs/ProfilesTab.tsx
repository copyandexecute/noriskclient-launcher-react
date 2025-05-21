"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";
import { useProfileStore } from "../../store/profile-store";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { ProfileImport } from "../profiles/ProfileImport";
import { ProfileSettings } from "../profiles/ProfileSettings";
import { ProfileWizard } from "../profiles/ProfileWizard";
import { Select } from "../ui/Select";
import { Button } from "../ui/buttons/Button";
import { toast } from "react-hot-toast";
import { ProfileDetailView } from "../profiles/ProfileDetailView";
import { ExportProfileModal } from "../profiles/ExportProfileModal";
import { TabLayout } from "../ui/TabLayout";
import { useNavigate, useParams, useLocation } from "react-router-dom";

export function ProfilesTab() {
  console.log("[ProfilesTab] Rendering or re-rendering.");
  const {
    profiles,
    loading,
    error,
    fetchProfiles,
    selectedProfile,
    setSelectedProfile,
  } = useProfileStore();

  const accentColor = useThemeStore((state) => state.accentColor);
  const profileGroupingCriterion = useThemeStore((state) => state.profileGroupingCriterion);
  const setProfileGroupingCriterionStore = useThemeStore((state) => state.setProfileGroupingCriterion);

  const tabRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [profileToExport, setProfileToExport] = useState<Profile | null>(null);

  const navigate = useNavigate();
  const params = useParams<{ profileId?: string }>();
  const location = useLocation();
  const routeProfileId = params.profileId;

  console.log("[ProfilesTab] Initial routeProfileId from params hook:", routeProfileId);
  console.log("[ProfilesTab] Initial location.pathname:", location.pathname);
  console.log("[ProfilesTab] Initial params object:", params);

  useEffect(() => {
    console.log("[ProfilesTab] Fetching profiles.");
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    console.log("[ProfilesTab] Route Effect Triggered. Current location.pathname:", location.pathname);
    console.log("[ProfilesTab] Route Effect Triggered. Current params object from hook:", params);
    console.log("[ProfilesTab] Route Effect Triggered. Recalculated routeProfileId:", params.profileId);
    console.log("[ProfilesTab] Route Effect: Profiles count:", profiles.length, "Loading:", loading);
    console.log("[ProfilesTab] Route Effect: current showDetailView:", showDetailView, "current selectedProfile:", selectedProfile?.id);

    const currentRouteProfileId = params.profileId;

    if (currentRouteProfileId && profiles.length > 0 && !loading) {
      console.log("[ProfilesTab] Route Effect: Condition met for finding profile with ID:", currentRouteProfileId);
      const profileFromRoute = profiles.find(p => p.id === currentRouteProfileId);
      console.log("[ProfilesTab] Route Effect: profileFromRoute:", profileFromRoute);

      if (profileFromRoute) {
        console.log("[ProfilesTab] Route Effect: Found profile. current showDetailView:", showDetailView, "selectedProfile?.id:", selectedProfile?.id);
        if (selectedProfile?.id !== currentRouteProfileId || !showDetailView) {
            console.log("[ProfilesTab] Route Effect: Setting selected profile and showing detail view for:", profileFromRoute.id);
            setSelectedProfile(profileFromRoute);
            setShowDetailView(true);
        } else {
            console.log("[ProfilesTab] Route Effect: Detail view already shown for this profile or selectedProfile matches and is already visible.");
        }
      } else if (!profileFromRoute && currentRouteProfileId) {
        console.warn(`[ProfilesTab] Route Effect: Profile with ID '${currentRouteProfileId}' not found. Navigating to /profiles.`);
        toast.error(`Profile with ID '${currentRouteProfileId}' not found.`);
        navigate("/profiles", { replace: true });
        setShowDetailView(false); 
        setSelectedProfile(null);
      }
    } else if (!currentRouteProfileId && showDetailView) {
      console.log("[ProfilesTab] Route Effect: No currentRouteProfileId, but showDetailView is true. Hiding detail view.");
      setShowDetailView(false);
      setSelectedProfile(null);
    }
  }, [params.profileId, profiles, loading, setSelectedProfile, navigate]);

  useEffect(() => {
    if (isBackgroundAnimationEnabled) {
      if (tabRef.current) {
        gsap.fromTo(tabRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
      }
      if (contentRef.current && !showDetailView) {
        gsap.fromTo(contentRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.2, ease: "power2.out" });
      }
    }
  }, [isBackgroundAnimationEnabled, showDetailView]);

  const allProfiles = profiles;
  const initiallyFilteredProfiles = allProfiles.filter((profile) => {
    if (searchQuery && !profile.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  initiallyFilteredProfiles.sort((a, b) => a.name.localeCompare(b.name));

  const groupedProfiles = (() => {
    if (profileGroupingCriterion === "none") return { "All Profiles": initiallyFilteredProfiles };
    return initiallyFilteredProfiles.reduce((acc, profile) => {
      let key = "Unknown";
      if (profileGroupingCriterion === "loader") key = profile.loader?.toString() || "Vanilla";
      else if (profileGroupingCriterion === "game_version") key = profile.game_version || "Unknown Version";
      else if (profileGroupingCriterion === "group") key = profile.group || "No Group";
      if (!acc[key]) acc[key] = [];
      acc[key].push(profile);
      acc[key].sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    }, {} as Record<string, Profile[]>);
  })();

  const compareMinecraftVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0, p2 = parts2[i] || 0;
      if (p1 > p2) return -1;
      if (p1 < p2) return 1;
    }
    return 0;
  };

  const sortedGroupKeys = Object.keys(groupedProfiles).sort((a, b) => {
    const specialKeys = ["All Profiles", "Unknown", "Vanilla", "Unknown Version", "No Group"];
    const isASpecial = specialKeys.includes(a), isBSpecial = specialKeys.includes(b);
    if (isASpecial && !isBSpecial) return 1;
    if (!isASpecial && isBSpecial) return -1;
    if (isASpecial && isBSpecial) return a.localeCompare(b);
    if (profileGroupingCriterion === "game_version") return compareMinecraftVersions(a, b);
    return a.localeCompare(b);
  });

  const handleCreateProfile = () => {
    console.log("[ProfilesTab] handleCreateProfile called.");
    setShowWizard(false);
    fetchProfiles();
    navigate("/profiles");
  };

  const handleEditProfile = (profile: Profile) => {
    console.log("[ProfilesTab] handleEditProfile called for:", profile);
    if (profile.is_standard_version) {
        console.log("[ProfilesTab] Attempted to edit standard profile, returning.");
        return;
    }
    setSelectedProfile(profile);
    setShowSettings(true);
    setShowDetailView(false);
    navigate(`/profiles/${profile.id}`, { replace: true });
    console.log("[ProfilesTab] Navigated to /profiles/" + profile.id + " for edit settings.");
  };

  const handleViewProfile = (profile: Profile) => {
    console.log("[ProfilesTab] handleViewProfile called for profile:", profile.id, profile.name);
    navigate(`/profiles/${profile.id}`);
    console.log("[ProfilesTab] Navigated to /profiles/" + profile.id + ". Detail view should open via useEffect.");
  };

  const handleImportComplete = () => {
    console.log("[ProfilesTab] handleImportComplete called.");
    fetchProfiles();
    setShowImport(false);
    navigate("/profiles");
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    console.log("[ProfilesTab] handleDeleteProfile called for:", profileId, profileName);
    const deletePromise = useProfileStore.getState().deleteProfile(profileId);
    toast.promise(deletePromise, {
      loading: `Deleting profile '${profileName}'...`,
      success: () => {
        fetchProfiles();
        if (params.profileId === profileId) {
            console.log("[ProfilesTab] Deleted currently viewed profile (from URL), navigating to /profiles.");
            navigate("/profiles");
        }
        return `Profile '${profileName}' deleted successfully!`;
      },
      error: (err) => `Failed to delete profile: ${err instanceof Error ? err.message : String(err.message)}`,
    });
  };

  const handleShouldExportProfile = (profile: Profile) => {
    console.log("[ProfilesTab] handleShouldExportProfile called for:", profile);
    setProfileToExport(profile);
    setIsExportModalOpen(true);
  };

  const handleGroupingChange = async (newCriterion: string) => {
    console.log("[ProfilesTab] handleGroupingChange called with:", newCriterion);
    try { await setProfileGroupingCriterionStore(newCriterion); }
    catch (error) { console.error("Failed to save grouping preference:", error); toast.error("Failed to save grouping preference."); }
  };

  const groupingOptions = [
    { value: "none", label: "No Grouping", icon: <Icon icon="solar:menu-dots-linear" className="w-4 h-4" /> },
    { value: "loader", label: "Loader", icon: <Icon icon="solar:box-bold" className="w-4 h-4" /> },
    { value: "game_version", label: "Game Version", icon: <Icon icon="solar:gamepad-bold" className="w-4 h-4" /> },
    { value: "group", label: "Group", icon: <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4" /> },
  ];

  const profileActions = (
    <div className="flex items-center gap-3">
      <Select value={profileGroupingCriterion} onChange={handleGroupingChange} options={groupingOptions} className="w-full md:w-52 h-[42px]" />
      <Button onClick={() => { setShowWizard(true); navigate("/profiles"); }} variant="default" size="md" className="h-[42px]" icon={<Icon icon="solar:widget-add-bold" className="w-5 h-5" />} iconPosition="left">CREATE</Button>
      <Button onClick={() => { setShowImport(true); navigate("/profiles"); }} variant="secondary" size="md" className="h-[42px]" icon={<Icon icon="solar:upload-bold" className="w-5 h-5" />} iconPosition="left">IMPORT</Button>
    </div>
  );

  console.log("[ProfilesTab] Current state before return: showDetailView:", showDetailView, "selectedProfile ID:", selectedProfile?.id, "routeProfileId:", routeProfileId);

  return (
    <div ref={tabRef} className="flex flex-col h-full overflow-hidden">
      {routeProfileId && loading ? (
        <LoadingState message="Loading profile details..." />
      ) : showDetailView && selectedProfile ? (
        <ProfileDetailView
          profile={selectedProfile}
          onClose={() => {
            console.log("[ProfilesTab] ProfileDetailView onClose called. Current routeProfileId:", params.profileId);
            setShowDetailView(false);
            setSelectedProfile(null);
            if (params.profileId) {
                navigate("/profiles");
                console.log("[ProfilesTab] Navigated to /profiles after closing detail view from /profiles/:id.");
            } else {
                console.log("[ProfilesTab] DetailView closed, but not on a specific profile URL. No navigation needed from onClose.");
            }
          }}
          onEdit={() => {
            console.log("[ProfilesTab] ProfileDetailView onEdit called for:", selectedProfile);
            if (selectedProfile && !selectedProfile.is_standard_version) {
                setShowDetailView(false); 
                handleEditProfile(selectedProfile); 
            }
          }}
        />
      ) : (
        <TabLayout
          title="Profiles"
          icon="solar:widget-bold"
          search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search profiles..." }}
          actions={profileActions}
        >
          <div ref={contentRef}>
            {loading ? (
              <LoadingState message="loading profiles..." />
            ) : error ? (
              <EmptyState icon="solar:danger-triangle-bold" message={error || ""} />
            ) : initiallyFilteredProfiles.length > 0 ? (
              <div className="space-y-6">
                {sortedGroupKeys.map((groupKey) => (
                  <div key={groupKey}>
                    {profileGroupingCriterion !== "none" && (
                      <h2 className="text-2xl font-minecraft text-white mb-3 pb-1 border-b-2" style={{ borderColor: `${accentColor.value}40` }}>{groupKey}</h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {groupedProfiles[groupKey].map((profile) => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          onEdit={() => handleEditProfile(profile)}
                          onClick={() => handleViewProfile(profile)}
                          onProfileCloned={fetchProfiles}
                          onDelete={handleDeleteProfile}
                          onShouldExport={handleShouldExportProfile}
                        />
                      ))}
                    </div>
                    {groupedProfiles[groupKey].length === 0 && profileGroupingCriterion !== "none" && (
                      <p className="text-neutral-500 italic text-center py-4">No profiles in this group.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="solar:widget-bold" message="no profiles found" />
            )}
          </div>
        </TabLayout>
      )}

      {showWizard && <ProfileWizard onClose={() => { setShowWizard(false); navigate("/profiles"); }} onSave={handleCreateProfile} />}
      {showSettings && selectedProfile && !selectedProfile.is_standard_version && (
        <ProfileSettings
          profile={selectedProfile}
          onClose={() => {
            console.log("[ProfilesTab] ProfileSettings onClose called. Current routeProfileId:", params.profileId);
            setShowSettings(false);
            setSelectedProfile(null);
            fetchProfiles();
            if (params.profileId) {
                navigate("/profiles");
                console.log("[ProfilesTab] Navigated to /profiles after closing settings from /profiles/:id.");
            } else {
                console.log("[ProfilesTab] Settings closed, but not on a specific profile URL. No navigation needed from onClose.");
            }
          }}
        />
      )}
      {showImport && <ProfileImport onClose={() => { setShowImport(false); navigate("/profiles"); }} onImportComplete={handleImportComplete} />}
      {profileToExport && (
        <ExportProfileModal profile={profileToExport} isOpen={isExportModalOpen} onClose={() => { setIsExportModalOpen(false); setProfileToExport(null); }} />
      )}
    </div>
  );
}
