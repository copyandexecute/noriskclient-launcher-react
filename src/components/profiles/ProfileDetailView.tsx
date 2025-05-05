"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ContentTab } from "./detail/ContentTab";
import { WorldsTab } from "./detail/WorldsTab";
import { LogsTab } from "./detail/LogsTab";
import { BrowseTab } from "./detail/BrowseTab";
import * as ProfileService from "../../services/profile-service";
import { TabContent } from "../ui/TabContent.tsx";

// Add this new component at the top of the file
function TabTransitionLoader() {
  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-white/80 rounded-full animate-spin"></div>
      </div>
      <div className="font-minecraft text-2xl text-white/80 tracking-wide lowercase">
        Loading content...
      </div>
    </div>
  );
}

interface ProfileDetailViewProps {
  profile: Profile;
  onClose: () => void;
  onEdit: () => void;
}

type TabType = "content" | "browse" | "worlds" | "logs";

export function ProfileDetailView({
  profile,
  onClose,
  onEdit,
}: ProfileDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    profile.is_standard_version ? "logs" : "content",
  );
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [browseContentType, setBrowseContentType] = useState<string>("mods");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Add state for tab transition
  const [tabTransition, setTabTransition] = useState(false);
  const tabTransitionTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Add cleanup for the timer
  useEffect(() => {
    return () => {
      if (tabTransitionTimer.current) {
        clearTimeout(tabTransitionTimer.current);
      }
    };
  }, []);

  const handleBrowseContent = (contentType: string) => {
    // Only set the content type without triggering a transition
    // since the tab change will already trigger the transition
    setBrowseContentType(contentType);

    // Change the tab which will trigger the transition
    handleTabChange("browse");
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const updatedProfile = await ProfileService.getProfile(profile.id);
      setCurrentProfile(updatedProfile);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (activeTab === tab) return;

    // Start tab transition
    setTabTransition(true);

    // Clear any existing timer
    if (tabTransitionTimer.current) {
      clearTimeout(tabTransitionTimer.current);
    }

    // Set a timer to hide the transition after a minimum duration
    tabTransitionTimer.current = setTimeout(() => {
      setTabTransition(false);
    }, 600);

    setActiveTab(tab);
  };

  const tabs = profile.is_standard_version
    ? [
        { id: "worlds", label: "worlds", icon: "pixel:globe" },
        { id: "logs", label: "logs", icon: "pixel:file-text" },
      ]
    : [
        { id: "content", label: "content", icon: "pixel:grid-solid" },
        { id: "browse", label: "browse", icon: "pixel:search-solid" },
        { id: "worlds", label: "worlds", icon: "pixel:globe" },
        { id: "logs", label: "logs", icon: "pixel:code-solid" },
      ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-black/30 backdrop-blur-md border-b-2 border-white/30">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-4 font-minecraft text-2xl lowercase flex items-center gap-3 transition-colors select-none ${
                activeTab === tab.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white"
              }`}
              onClick={() => handleTabChange(tab.id as TabType)}
            >
              <Icon icon={tab.icon} className="w-6 h-6" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pr-4">
          <button
            className="p-2 bg-black/20 hover:bg-black/30 rounded-md text-white/80 hover:text-white transition-colors"
            onClick={onClose}
            title="Back to profiles"
          >
            <Icon icon="pixel:arrow-left-solid" className="w-4 h-4" />
          </button>

          <button
            className="p-2 bg-black/20 hover:bg-black/30 rounded-md text-white/80 hover:text-white transition-colors"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh profile"
          >
            {isRefreshing ? (
              <Icon
                icon="pixel:spinner-solid"
                className="w-4 h-4 animate-spin"
              />
            ) : (
              <Icon icon="pixel:refresh" className="w-4 h-4" />
            )}
          </button>

          {!profile.is_standard_version && (
            <button
              className="p-2 bg-black/20 hover:bg-black/30 rounded-md text-white/80 hover:text-white transition-colors"
              onClick={onEdit}
              title="Edit profile"
            >
              <Icon icon="pixel:cog-solid" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <TabContent className="relative flex-1 min-h-0">
        {/* Add the tab transition loader */}
        {tabTransition && <TabTransitionLoader />}

        <div ref={contentRef} className="h-full overflow-y-auto scrollbar-hide">
          {activeTab === "content" && !profile.is_standard_version && (
            <ContentTab
              profile={currentProfile}
              onRefresh={handleRefresh}
              onBrowse={handleBrowseContent}
            />
          )}
          {activeTab === "browse" && !profile.is_standard_version && (
            <BrowseTab
              profile={currentProfile}
              initialContentType={browseContentType}
              onRefresh={handleRefresh}
              parentTransitionActive={tabTransition}
            />
          )}
          {activeTab === "worlds" && <WorldsTab profile={currentProfile} />}
          {activeTab === "logs" && <LogsTab profile={currentProfile} />}
        </div>
      </TabContent>
    </div>
  );
}
