"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ContentTab } from "./detail/ContentTab";
import { WorldsTab } from "./detail/WorldsTab";
import { LogsTab } from "./detail/LogsTab";
import { BrowseTab } from "./detail/BrowseTab";
import { DetailHeader } from "./detail/DetailHeader.tsx";
import * as ProfileService from "../../services/profile-service";

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
  const [activeTab, setActiveTab] = useState<TabType>("content");
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [browseContentType, setBrowseContentType] = useState<string>("mods");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
      );
    }

    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.98, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab]);

  const handleClose = () => {
    if (containerRef.current && modalRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
      });

      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.98,
        y: 10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      handleClose();
    }
  };

  const handleBrowseContent = (contentType: string) => {
    setBrowseContentType(contentType);
    setActiveTab("browse");
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

  const tabs = [
    { id: "content", label: "content", icon: "pixel:grid-solid" },
    { id: "browse", label: "browse", icon: "pixel:search-solid" },
    { id: "worlds", label: "worlds", icon: "pixel:globe" },
    { id: "logs", label: "logs", icon: "pixel:file-text" },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-black/20 backdrop-blur-lg border-2 border-white/30 w-full max-w-6xl h-[90vh] flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <DetailHeader
          profile={currentProfile}
          onClose={handleClose}
          onEdit={onEdit}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <div className="flex bg-black/30 backdrop-blur-md border-b-2 border-white/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3 font-minecraft text-base lowercase flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              <Icon icon={tab.icon} className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div ref={contentRef} className="flex-1 p-5 overflow-hidden">
          {activeTab === "content" && (
            <ContentTab
              profile={currentProfile}
              onRefresh={handleRefresh}
              onBrowse={handleBrowseContent}
            />
          )}
          {activeTab === "browse" && (
            <BrowseTab
              profile={currentProfile}
              initialContentType={browseContentType}
              onRefresh={handleRefresh}
            />
          )}
          {activeTab === "worlds" && <WorldsTab />}
          {activeTab === "logs" && <LogsTab profile={currentProfile} />}
        </div>
      </div>
    </div>
  );
}
