"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";
import type { Profile } from "../../types/profile";
import { GeneralSettingsTab } from "./settings/GeneralSettingsTab";
import { InstallationSettingsTab } from "./settings/InstallationSettingsTab";
import { JavaSettingsTab } from "./settings/JavaSettingsTab";
import { WindowSettingsTab } from "./settings/WindowSettingsTab";
import { ExportSettingsTab } from "./settings/ExportSettingsTab";
import { useProfileStore } from "../../store/profile-store";
import * as ProfileService from "../../services/profile-service";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";
import { Card } from "../ui/Card";

interface ProfileSettingsProps {
  profile: Profile;
  onClose: () => void;
}

type SettingsTab =
  | "general"
  | "installation"
  | "java"
  | "window"
  | "export_options";

export function ProfileSettings({ profile, onClose }: ProfileSettingsProps) {
  const { updateProfile, deleteProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [editedProfile, setEditedProfile] = useState<Profile>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [systemRam, setSystemRam] = useState<number>(8192);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );

  useEffect(() => {
    ProfileService.getSystemRamMb()
      .then((ram) => setSystemRam(ram))
      .catch((err) => {
        console.error("Failed to get system RAM:", err);
      });
  }, []);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab, isBackgroundAnimationEnabled]);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
      );
    }
  }, [isBackgroundAnimationEnabled]);

  const updateProfileData = (updates: Partial<Profile>) => {
    setEditedProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile(profile.id, {
        name: editedProfile.name,
        game_version: editedProfile.game_version,
        loader: editedProfile.loader,
        loader_version: editedProfile.loader_version || null || undefined,
        settings: editedProfile.settings,
        selected_norisk_pack_id:
          editedProfile.selected_norisk_pack_id || null || undefined,
        group: editedProfile.group,
        description: editedProfile.description,
      });

      toast.success("Profile saved successfully!");
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const deletePromise = deleteProfile(profile.id);

      toast
        .promise(deletePromise, {
          loading: `Deleting profile '${profile.name}'...`,
          success: () => {
            onClose();
            return `Profile '${profile.name}' deleted successfully!`;
          },
          error: (err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            return `Failed to delete profile: ${errorMessage}`;
          },
        })
        .finally(() => {
          setIsDeleting(false);
        });
    } catch (err) {
      console.error("Error during delete initiation:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to initiate profile deletion: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  const tabConfig = [
    { id: "general", label: "General", icon: "solar:settings-bold" },
    { id: "installation", label: "Installation", icon: "solar:download-bold" },
    { id: "java", label: "Java", icon: "solar:code-bold" },
    { id: "window", label: "Window", icon: "solar:widget-bold" },
    { id: "export_options", label: "Export", icon: "solar:export-bold" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettingsTab
            profile={profile}
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        );
      case "installation":
        return (
          <InstallationSettingsTab
            profile={profile}
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
          />
        );
      case "java":
        return (
          <JavaSettingsTab
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            systemRam={systemRam}
          />
        );
      case "window":
        return (
          <WindowSettingsTab
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
          />
        );
      case "export_options":
        return <ExportSettingsTab profile={profile} onClose={onClose} />;
      default:
        return null;
    }
  };

  const renderFooter = () => (
    <div className="flex justify-between">
      <Button
        variant="secondary"
        onClick={onClose}
        size="md"
        className="text-2xl"
      >
        cancel
      </Button>
      <Button
        variant="default"
        onClick={handleSave}
        disabled={isSaving}
        size="md"
        className="text-2xl"
      >
        {isSaving ? (
          <div className="flex items-center gap-3">
            <Icon
              icon="solar:refresh-bold"
              className="w-6 h-6 animate-spin text-white"
            />
            <span>saving...</span>
          </div>
        ) : (
          "save changes"
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      title={`profile settings: ${profile.name}`}
      onClose={onClose}
      width="xl"
      footer={renderFooter()}
    >
      <div className="flex flex-1 h-[500px] overflow-hidden">
        <div
          ref={sidebarRef}
          className="w-64 border-r-2 overflow-y-auto custom-scrollbar"
          style={{
            borderColor: `${accentColor.value}40`,
            backgroundColor: `${accentColor.value}20`,
            boxShadow: `inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <div className="p-4">
            <Card
              variant="flat"
              className="mb-6 p-3"
              withAnimation={isBackgroundAnimationEnabled}
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon="solar:settings-bold"
                  className="w-5 h-5 text-white"
                />
                <span className="text-xl font-minecraft text-white lowercase">
                  profile settings
                </span>
              </div>
            </Card>

            <div className="space-y-3">
              {tabConfig.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    className="w-full text-left p-3 rounded-md transition-all duration-200 flex items-center gap-3 border-2"
                    style={{
                      backgroundColor: isActive
                        ? `${accentColor.value}30`
                        : "rgba(0,0,0,0.2)",
                      borderColor: isActive
                        ? `${accentColor.value}60`
                        : "rgba(255,255,255,0.2)",
                      borderBottomColor: isActive
                        ? accentColor.value
                        : "rgba(255,255,255,0.15)",
                      borderBottomWidth: isActive ? "4px" : "2px",
                      boxShadow: isActive
                        ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`
                        : "none",
                    }}
                    onClick={() => {
                      if (activeTab !== tab.id) {
                        if (
                          isBackgroundAnimationEnabled &&
                          contentRef.current
                        ) {
                          gsap.to(contentRef.current, {
                            opacity: 0,
                            y: 20,
                            duration: 0.2,
                            ease: "power2.in",
                            onComplete: () =>
                              setActiveTab(tab.id as SettingsTab),
                          });
                        } else {
                          setActiveTab(tab.id as SettingsTab);
                        }
                      }
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-2"
                      style={{
                        backgroundColor: isActive
                          ? `${accentColor.value}40`
                          : "rgba(255,255,255,0.1)",
                        borderColor: isActive
                          ? `${accentColor.value}70`
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <Icon
                        icon={tab.icon}
                        className={`w-5 h-5 ${isActive ? "text-white" : "text-white/70"}`}
                      />
                    </div>
                    <span className="font-minecraft text-3xl lowercase">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="flex-1 p-5 overflow-y-auto custom-scrollbar"
            ref={contentRef}
          >
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
