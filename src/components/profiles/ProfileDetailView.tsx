"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ContentTab } from "./detail/ContentTab";
import { WorldsTab } from "./detail/WorldsTab";
import { LogsTab } from "./detail/LogsTab";
import { BrowseTab } from "./detail/BrowseTab";
import * as ProfileService from "../../services/profile-service";
import { TabContent } from "../ui/TabContent";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { gsap } from "gsap";
import { Card } from "../ui/Card";

function TabTransitionLoader() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    if (loaderRef.current) {
      gsap.fromTo(
        loaderRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
      );
    }
  }, []);

  return (
    <div
      ref={loaderRef}
      className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center z-10"
    >
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
        <div
          className="absolute inset-0 border-4 border-t-white/80 rounded-full animate-spin"
          style={{ borderTopColor: accentColor.value }}
        ></div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const [tabTransition, setTabTransition] = useState(false);
  const tabTransitionTimer = useRef<NodeJS.Timeout | null>(null);

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
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (tabTransitionTimer.current) {
        clearTimeout(tabTransitionTimer.current);
      }
    };
  }, []);

  const handleBrowseContent = (contentType: string) => {
    setBrowseContentType(contentType);
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

    setTabTransition(true);

    if (tabTransitionTimer.current) {
      clearTimeout(tabTransitionTimer.current);
    }

    tabTransitionTimer.current = setTimeout(() => {
      setTabTransition(false);
    }, 600);

    setActiveTab(tab);
  };

  const tabs = profile.is_standard_version
    ? [
        { id: "worlds", label: "Worlds", icon: "solar:planet-bold" },
        { id: "logs", label: "Logs", icon: "solar:file-text-bold" },
      ]
    : [
        { id: "content", label: "Content", icon: "solar:widget-bold" },
        { id: "browse", label: "Browse", icon: "solar:search-bold" },
        { id: "worlds", label: "Worlds", icon: "solar:planet-bold" },
        { id: "logs", label: "Logs", icon: "solar:code-bold" },
      ];

  return (
    <Card
      ref={containerRef}
      className="h-full flex flex-col overflow-hidden"
      variant="elevated"
    >
      <div
        className="flex items-center px-4 py-2 border-b-2"
        style={{
          backgroundColor: `${accentColor.value}40`,
          borderColor: `${accentColor.value}60`,
        }}
      >
        <div className="flex items-center">
          <div
            className="w-8 h-8 rounded flex items-center justify-center border-2 mr-2 flex-shrink-0"
            style={{
              backgroundColor: `${accentColor.value}50`,
              borderColor: `${accentColor.value}80`,
            }}
          >
            <Icon icon="solar:cube-bold" className="w-5 h-5 text-white" />
          </div>
          <div className="font-minecraft text-xl text-white truncate">
            {profile.name || profile.id}
            <span className="text-white/60 text-sm ml-2">
              {profile.game_version} {profile.loader && `(${profile.loader})`}
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-4 border-b-2"
        style={{
          backgroundColor: `${accentColor.value}30`,
          borderColor: `${accentColor.value}60`,
        }}
      >
        <div className="py-1 flex items-center justify-start flex-1 overflow-x-auto scrollbar-hide gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="md"
              onClick={() => handleTabChange(tab.id as TabType)}
              icon={<Icon icon={tab.icon} />}
              iconPosition="left"
              className={activeTab === tab.id ? "text-white" : "text-white/70"}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-4 min-w-[170px] justify-end">
          <IconButton
            icon={
              isRefreshing ? (
                <Icon icon="solar:refresh-bold" className="animate-spin" />
              ) : (
                <Icon icon="solar:refresh-bold" />
              )
            }
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh profile"
            size="sm"
            variant="secondary"
          />

          {!profile.is_standard_version && (
            <IconButton
              icon={<Icon icon="solar:settings-bold" />}
              onClick={onEdit}
              title="Edit profile"
              size="sm"
              variant="secondary"
            />
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            icon={<Icon icon="solar:arrow-left-bold" />}
            iconPosition="left"
          >
            Back
          </Button>
        </div>
      </div>

      <TabContent className="relative flex-1 min-h-0">
        {tabTransition && <TabTransitionLoader />}

        <div
          ref={contentRef}
          className="h-full overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: `${accentColor.value}10`,
          }}
        >
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
    </Card>
  );
}
