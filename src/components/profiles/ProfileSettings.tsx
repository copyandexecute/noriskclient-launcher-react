"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";
import type { Profile } from "../../types/profile";
import { GeneralSettingsTab } from "./settings/GeneralSettingsTab";
import { InstallationSettingsTab } from "./settings/InstallationSettingsTab";
import { JavaSettingsTab } from "./settings/JavaSettingsTab";
import { WindowSettingsTab } from "./settings/WindowSettingsTab";
import { useProfileStore } from "../../store/profile-store";
import * as ProfileService from "../../services/profile-service";
import { Modal } from ".././ui/Modal";
import { Button } from ".././ui/Button";
import { StatusMessage } from ".././ui/StatusMessage";

interface ProfileSettingsProps {
  profile: Profile;
  onClose: () => void;
}

type SettingsTab = "general" | "installation" | "java" | "window" | "export";

export function ProfileSettings({ profile, onClose }: ProfileSettingsProps) {
  const { updateProfile, deleteProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [editedProfile, setEditedProfile] = useState<Profile>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [exportFilename, setExportFilename] = useState(profile.name);
  const [exportIncludeFiles, setExportIncludeFiles] = useState(true);
  const [exportOpenFolder, setExportOpenFolder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemRam, setSystemRam] = useState<number>(8192);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ProfileService.getSystemRamMb()
      .then((ram) => setSystemRam(ram))
      .catch((err) => {
        console.error("Failed to get system RAM:", err);
      });
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab]);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [activeTab]);

  const updateProfileData = (updates: Partial<Profile>) => {
    setEditedProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

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

      setSuccessMessage("Profile saved successfully!");

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await deleteProfile(profile.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete profile:", err);
      setError("Failed to delete profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccessMessage(null);

      const exportParams = {
        profile_id: profile.id,
        file_name: exportFilename || profile.name,
        include_files: exportIncludeFiles ? undefined : [],
        open_folder: exportOpenFolder,
      };

      const exportPath = await ProfileService.exportProfile(exportParams);
      console.log("Profile exported to:", exportPath);

      setSuccessMessage(`Profile successfully exported to: ${exportPath}`);

      setExportFilename(profile.name);
      setExportIncludeFiles(true);
      setExportOpenFolder(true);
    } catch (err) {
      console.error("Failed to export profile:", err);
      setError("Failed to export profile. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloneProfile = async () => {
    try {
      setIsCloning(true);
      setError(null);
      setSuccessMessage(null);

      const copyParams = {
        source_profile_id: profile.id,
        new_profile_name: `${profile.name} (Copy)`,
        include_files: undefined,
      };

      const newProfileId = await ProfileService.copyProfile(copyParams);
      console.log("Profile cloned with ID:", newProfileId);

      setSuccessMessage(`Profile successfully cloned!`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to clone profile:", err);
      setError("Failed to clone profile. Please try again.");
    } finally {
      setIsCloning(false);
    }
  };

  const tabConfig = [
    { id: "general", label: "General", icon: "pixel:cog-solid" },
    { id: "installation", label: "Installation", icon: "pixel:download-solid" },
    { id: "java", label: "Java", icon: "pixel:code-solid" },
    { id: "window", label: "Window", icon: "pixel:window-maximize-solid" },
    { id: "export", label: "Export", icon: "pixel:file-export-solid" },
  ];

  const renderExportTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-minecraft text-white mb-4 lowercase tracking-wide">
          export profile
        </h3>
        <p className="text-white/70 mb-6 font-minecraft text-sm tracking-wide">
          Export your profile to share with others or back it up. You can
          include all files or just the profile configuration.
        </p>
      </div>

      <div className="space-y-4 bg-black/20 backdrop-blur-md border-2 border-white/20 p-5">
        <div className="space-y-2">
          <label
            htmlFor="exportFilename"
            className="block text-white font-minecraft text-base mb-2 lowercase"
          >
            export filename
          </label>
          <input
            type="text"
            id="exportFilename"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-3 text-white font-minecraft text-base"
            placeholder="Enter filename without extension"
          />
          <p className="mt-1 text-white/50 font-minecraft text-sm">
            The .noriskpack extension will be added automatically
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={exportIncludeFiles}
              onChange={(e) => setExportIncludeFiles(e.target.checked)}
              className="w-5 h-5 rounded bg-black/20 border-white/30"
            />
            <span className="text-white font-minecraft text-base lowercase">
              include profile files
            </span>
          </label>
          <p className="mt-1 text-white/50 font-minecraft text-sm ml-6">
            Include mods, resource packs, and other files in the export
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={exportOpenFolder}
              onChange={(e) => setExportOpenFolder(e.target.checked)}
              className="w-5 h-5 rounded bg-black/20 border-white/30"
            />
            <span className="text-white font-minecraft text-base lowercase">
              open folder after export
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isExporting || !exportFilename}
          icon={<Icon icon="pixel:file-export-solid" className="w-4 h-4" />}
        >
          {isExporting ? (
            <>
              <Icon
                icon="pixel:spinner-solid"
                className="w-4 h-4 animate-spin"
              />
              <span>exporting...</span>
            </>
          ) : (
            "export profile"
          )}
        </Button>

        <Button
          variant="primary"
          onClick={handleCloneProfile}
          disabled={isCloning}
          icon={<Icon icon="pixel:copy-solid" className="w-4 h-4" />}
        >
          {isCloning ? (
            <>
              <Icon
                icon="pixel:spinner-solid"
                className="w-4 h-4 animate-spin"
              />
              <span>cloning...</span>
            </>
          ) : (
            "clone profile"
          )}
        </Button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    if (successMessage) {
      return <StatusMessage type="success" message={successMessage} />;
    }

    switch (activeTab) {
      case "general":
        return (
          <GeneralSettingsTab
            profile={profile}
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            onDelete={handleDelete}
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
      case "export":
        return renderExportTab();
      default:
        return null;
    }
  };

  const renderFooter = () => (
    <div className="flex justify-between">
      <Button variant="secondary" onClick={onClose}>
        cancel
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <div className="flex items-center gap-2">
            <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
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
      width="5xl"
      height="650px"
      footer={renderFooter()}
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-white/20 bg-black/20 overflow-y-auto">
          <div className="p-4 space-y-2">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                className={`w-full text-left py-3 px-4 font-minecraft text-lg lowercase transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white border-l-4 border-l-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
              >
                <div className="flex items-center">
                  <Icon icon={tab.icon} className="w-5 h-5 mr-3" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div
            className="flex-1 p-6 overflow-y-auto custom-scrollbar"
            ref={contentRef}
          >
            {error && <StatusMessage type="error" message={error} />}
            {successMessage && (
              <StatusMessage type="success" message={successMessage} />
            )}
            {!error && !successMessage && renderTabContent()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
