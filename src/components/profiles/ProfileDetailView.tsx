"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ContentTab } from "./detail/ContentTab";
import { WorldsTab } from "./detail/WorldsTab";
import { LogsTab } from "./detail/LogsTab";
import { BrowseTab } from "./detail/BrowseTab";
import * as ProfileService from "../../services/profile-service";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";

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

type MainTabType = "content" | "browse" | "worlds" | "logs";
type ContentSubType =
  | "mods"
  | "resourcepacks"
  | "shaderpacks"
  | "datapacks"
  | "norisk";

export function ProfileDetailView({
  profile,
  onClose,
  onEdit,
}: ProfileDetailViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>(
    profile.is_standard_version ? "logs" : "content",
  );
  const [activeContentType, setActiveContentType] =
    useState<ContentSubType>("mods");
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [browseContentType, setBrowseContentType] = useState<string>("mods");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isSidebarOnLeft = useThemeStore((state) => state.isDetailViewSidebarOnLeft);
  const toggleSidebarPosition = useThemeStore((state) => state.toggleDetailViewSidebarPosition);

  const [tabTransition, setTabTransition] = useState(false);
  const tabTransitionTimer = useRef<NodeJS.Timeout | null>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const subItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveMainTab = useRef<MainTabType | null>(null);

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
  }, [activeMainTab, activeContentType]);

  useEffect(() => {
    return () => {
      if (tabTransitionTimer.current) {
        clearTimeout(tabTransitionTimer.current);
      }
    };
  }, []);

  // Animation for submenu appearance/disappearance
  useEffect(() => {
    if (prevActiveMainTab.current !== activeMainTab) {
      if (activeMainTab === "content" && subMenuRef.current) {
        // Animate the vertical line first
        const verticalLine = subMenuRef.current.querySelector(
          ".vertical-line",
        ) as HTMLElement;
        if (verticalLine) {
          gsap.fromTo(
            verticalLine,
            { scaleY: 0, opacity: 0 },
            {
              scaleY: 1,
              opacity: 1,
              duration: 0.4,
              ease: "power2.out",
              transformOrigin: "top",
            },
          );
        }

        // Then animate each subitem with staggered delay
        if (subItemsRef.current.length > 0) {
          gsap.fromTo(
            subItemsRef.current.filter(Boolean),
            {
              x: -10,
              opacity: 0,
              scale: 0.95,
            },
            {
              x: 0,
              opacity: 1,
              scale: 1,
              duration: 0.4,
              stagger: 0.05,
              ease: "back.out(1.2)",
              delay: 0.15,
            },
          );
        }
      }

      prevActiveMainTab.current = activeMainTab;
    }
  }, [activeMainTab]);

  const handleBrowseContent = (contentType: string) => {
    setBrowseContentType(contentType);
    handleMainTabChange("browse");
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

  const handleMainTabChange = (tab: MainTabType) => {
    if (activeMainTab === tab) return;

    setTabTransition(true);

    if (tabTransitionTimer.current) {
      clearTimeout(tabTransitionTimer.current);
    }

    tabTransitionTimer.current = setTimeout(() => {
      setTabTransition(false);
    }, 600);

    setActiveMainTab(tab);
  };

  const handleContentTypeChange = (type: ContentSubType) => {
    if (activeContentType === type) return;

    // Animate the active indicator dot
    gsap.to(`#dot-${activeContentType}`, {
      scale: 0.8,
      opacity: 0.5,
      duration: 0.3,
      ease: "power2.out",
    });

    gsap.fromTo(
      `#dot-${type}`,
      { scale: 0.8, opacity: 0.5 },
      {
        scale: 1.2,
        opacity: 1,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
        onComplete: () => {
          gsap.to(`#dot-${type}`, {
            scale: 1,
            duration: 0.2,
            ease: "power2.out",
          });
        },
      },
    );

    setTabTransition(true);

    if (tabTransitionTimer.current) {
      clearTimeout(tabTransitionTimer.current);
    }

    tabTransitionTimer.current = setTimeout(() => {
      setTabTransition(false);
    }, 600);

    setActiveContentType(type);
  };

  const mainTabs = profile.is_standard_version
    ? [
        { id: "worlds", label: "Worlds", icon: "solar:planet-bold" },
        { id: "logs", label: "Logs", icon: "solar:file-text-bold" },
      ]
    : [
        { id: "content", label: "Content", icon: "solar:widget-bold" },
        { id: "browse", label: "Browse", icon: "solar:magnifer-bold" },
        { id: "worlds", label: "Worlds", icon: "solar:planet-bold" },
        { id: "logs", label: "Logs", icon: "solar:code-bold" },
      ];

  const contentSubTabs = [
    { id: "mods" as ContentSubType, label: "Mods", icon: "solar:bolt-bold" },
    {
      id: "resourcepacks" as ContentSubType,
      label: "Resource Packs",
      icon: "solar:gallery-bold",
    },
    {
      id: "shaderpacks" as ContentSubType,
      label: "Shaders",
      icon: "solar:sun-bold",
    },
    {
      id: "datapacks" as ContentSubType,
      label: "Data Packs",
      icon: "solar:database-bold",
    },
    {
      id: "norisk" as ContentSubType,
      label: "NoRisk Mods",
      icon: "solar:shield-check-bold",
    },
  ];

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full flex overflow-hidden",
        isSidebarOnLeft ? "flex-row" : "flex-row-reverse",
      )}
    >
      {/* Sidebar */}
      <div
        className={cn(
          "w-64 h-full flex-shrink-0 backdrop-blur-sm flex flex-col",
          isSidebarOnLeft ? "border-r" : "border-l",
        )}
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}30`,
        }}
      >
        {/* Profile header */}
        <div
          className="p-4 border-b"
          style={{ borderColor: `${accentColor.value}30` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center border-2 flex-shrink-0"
              style={{
                backgroundColor: `${accentColor.value}30`,
                borderColor: `${accentColor.value}50`,
              }}
            >
              <Icon icon="solar:cube-bold" className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-minecraft-ten text-base text-white truncate">
                {profile.name || profile.id}
              </div>
              <div className="text-white/60 text-xs font-minecraft-ten">
                {profile.game_version} {profile.loader && `(${profile.loader})`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              icon={<Icon icon="solar:arrow-left-bold" />}
              iconPosition="left"
              className="flex-1"
            >
              Back
            </Button>

            {!profile.is_standard_version && (
              <IconButton
                icon={<Icon icon="solar:settings-bold" />}
                onClick={onEdit}
                title="Edit profile"
                size="sm"
                variant="secondary"
              />
            )}

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
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-white/50 text-sm uppercase tracking-wider">
              Navigation
            </div>
            <IconButton
              icon={
                <Icon
                  icon={
                    isSidebarOnLeft
                      ? "solar:arrow-right-bold"
                      : "solar:arrow-left-bold"
                  }
                  className="w-5 h-5"
                />
              }
              onClick={toggleSidebarPosition}
              title="Toggle Sidebar Position"
              size="xs"
              variant="ghost"
              className="text-white hover:text-white/80"
            />
          </div>
          <div className="flex flex-col gap-1">
            {/* Main navigation buttons */}
            {mainTabs.map((tab) => (
              <div key={tab.id} className="flex flex-col">
                <Button
                  variant={activeMainTab === tab.id ? "default" : "ghost"}
                  size="md"
                  onClick={() => handleMainTabChange(tab.id as MainTabType)}
                  icon={<Icon icon={tab.icon} />}
                  iconPosition="left"
                  className={cn(
                    "justify-start",
                    activeMainTab === tab.id ? "text-white" : "text-white/70",
                  )}
                >
                  {tab.label}
                </Button>

                {/* Content sub-navigation - directly below Content button */}
                {tab.id === "content" &&
                  activeMainTab === "content" &&
                  !profile.is_standard_version && (
                    <div ref={subMenuRef} className="ml-3 pl-4 relative">
                      {/* Vertical line connecting subpoints */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 vertical-line"
                        style={{
                          backgroundColor: `${accentColor.value}50`,
                          transformOrigin: "top",
                        }}
                      ></div>

                      <div className="flex flex-col gap-2 py-2">
                        {contentSubTabs.map((subTab, index) => (
                          <div
                            key={subTab.id}
                            className="flex items-center gap-3"
                            ref={(el) => (subItemsRef.current[index] = el)}
                          >
                            {/* Indicator dot */}
                            <div
                              id={`dot-${subTab.id}`}
                              className={cn(
                                "w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300",
                                activeContentType === subTab.id
                                  ? "shadow-glow"
                                  : `bg-white/30`,
                              )}
                              style={
                                activeContentType === subTab.id
                                  ? {
                                      backgroundColor: accentColor.value,
                                      boxShadow: `0 0 8px ${accentColor.value}80`,
                                    }
                                  : {}
                              }
                            ></div>

                            {/* Button without standard styling */}
                            <button
                              onClick={() => handleContentTypeChange(subTab.id)}
                              className={cn(
                                "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md transition-all duration-200",
                                "text-base font-medium tracking-wide",
                                activeContentType === subTab.id
                                  ? "text-white"
                                  : "text-white/70 hover:text-white/90 hover:bg-white/5",
                              )}
                            >
                              <Icon
                                icon={subTab.icon}
                                className={cn(
                                  "w-5 h-5 transition-transform duration-300",
                                  activeContentType === subTab.id &&
                                    "scale-110",
                                )}
                              />
                              <span>{subTab.label}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 h-full relative">
        <div
          ref={contentRef}
          className="h-full overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: `${accentColor.value}08`,
          }}
        >
          {activeMainTab === "content" && !profile.is_standard_version && (
            <ContentTab
              profile={currentProfile}
              onRefresh={handleRefresh}
              onBrowse={handleBrowseContent}
              activeContentType={activeContentType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
          {activeMainTab === "browse" && !profile.is_standard_version && (
            <BrowseTab
              profile={currentProfile}
              initialContentType={browseContentType}
              onRefresh={handleRefresh}
              parentTransitionActive={tabTransition}
            />
          )}
          {activeMainTab === "worlds" && <WorldsTab profile={currentProfile} />}
          {activeMainTab === "logs" && <LogsTab profile={currentProfile} />}
        </div>
      </div>
    </div>
  );
}
