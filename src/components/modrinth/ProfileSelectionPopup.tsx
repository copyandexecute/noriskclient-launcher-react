"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { CheckContentParams, Profile } from "../../types/profile";
import { ProfileGroup } from "./ProfileGroup";
import type { ModrinthVersion } from "../../types/modrinth";
import { isContentInstalled } from "../../services/profile-service";

interface ProfileSelectionPopupProps {
  profiles: Profile[];
  onSelect: (profileId: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  contentVersion?: ModrinthVersion;
}

export function ProfileSelectionPopup({
  profiles = [],
  onSelect,
  onCancel,
  title = "Select Profile",
  description = "Choose a profile to install this content to:",
  contentVersion,
}: ProfileSelectionPopupProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles && profiles.length > 0 ? profiles[0].id : null,
  );
  const [installedProfiles, setInstalledProfiles] = useState<
    Record<string, boolean>
  >({});
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCheckingInstalled, setIsCheckingInstalled] = useState(true);
  const popupRef = useRef<HTMLDivElement>(null);

  // Group profiles by loader and check compatibility
  const profilesByLoader: Record<string, Profile[]> = {};
  const compatibleProfiles: Record<string, boolean> = {};

  // Add debug logging to the ProfileSelectionPopup component
  console.log(
    "ProfileSelectionPopup - Profiles:",
    profiles.length,
    "Content version:",
    contentVersion?.name || contentVersion?.version_number,
  );

  if (profiles && profiles.length > 0) {
    profiles.forEach((profile) => {
      const loader = profile.loader || "Unknown";
      if (!profilesByLoader[loader]) {
        profilesByLoader[loader] = [];
      }
      profilesByLoader[loader].push(profile);

      if (contentVersion) {
        let isCompatible = true;

        if (
          contentVersion.game_versions &&
          contentVersion.game_versions.length > 0
        ) {
          isCompatible =
            isCompatible &&
            contentVersion.game_versions.includes(profile.game_version);
        }

        if (
          contentVersion.search_hit?.project_type === "mod" ||
          contentVersion.search_hit?.project_type === "modpack"
        ) {
          if (contentVersion.loaders && contentVersion.loaders.length > 0) {
            isCompatible =
              isCompatible && contentVersion.loaders.includes(profile.loader);
          }
        } else {
          isCompatible = true;
        }

        compatibleProfiles[profile.id] = isCompatible;
      } else {
        compatibleProfiles[profile.id] = true;
      }
    });
  }

  useEffect(() => {
    async function checkInstalledStatus() {
      if (!contentVersion || !contentVersion.project_id || !contentVersion.id) {
        setIsCheckingInstalled(false);
        return;
      }

      setIsCheckingInstalled(true);
      const installedStatus: Record<string, boolean> = {};

      try {
        console.log(
          `Checking installation status for ${contentVersion.project_id} (${contentVersion.id})`,
        );

        const batchSize = 5;
        for (let i = 0; i < profiles.length; i += batchSize) {
          const batch = profiles.slice(i, i + batchSize);
          const batchPromises = batch.map(async (profile) => {
            try {
              const params: CheckContentParams = {
                project_id: contentVersion.project_id,
                version_id: contentVersion.id,
                project_type: contentVersion.search_hit?.project_type || "mod",
                profile_id: profile.id,
              };

              const status = await isContentInstalled(params);
              installedStatus[profile.id] = status.is_installed;
            } catch (error) {
              console.error(
                `Error checking installation status for profile ${profile.id}:`,
                error,
              );
              installedStatus[profile.id] = false;
            }
          });

          await Promise.all(batchPromises);
        }

        setInstalledProfiles(installedStatus);
        console.log("Installation status check complete:", installedStatus);
      } catch (error) {
        console.error("Error checking installation status:", error);
      } finally {
        setIsCheckingInstalled(false);
      }
    }

    checkInstalledStatus();
  }, [contentVersion, profiles]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onCancel();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onCancel]);

  useEffect(() => {
    if (selectedProfileId && !compatibleProfiles[selectedProfileId]) {
      const firstCompatibleProfile = profiles.find(
        (p) => compatibleProfiles[p.id],
      );
      if (firstCompatibleProfile) {
        console.log(
          "Selected profile not compatible, switching to:",
          firstCompatibleProfile.name,
        );
        setSelectedProfileId(firstCompatibleProfile.id);
      }
    }

    if (!selectedProfileId && profiles.length > 0) {
      const firstCompatibleProfile = profiles.find(
        (p) => compatibleProfiles[p.id],
      );
      if (firstCompatibleProfile) {
        console.log(
          "No profile selected, selecting first compatible:",
          firstCompatibleProfile.name,
        );
        setSelectedProfileId(firstCompatibleProfile.id);
      } else {
        console.log("No compatible profiles found, selecting first profile");
        setSelectedProfileId(profiles[0].id);
      }
    }
  }, [compatibleProfiles, selectedProfileId, profiles]);
  // @ts-ignore
  const handleInstall = async (event) => {
    // Prevent default action that might cause page reload
    event?.preventDefault?.();

    if (!selectedProfileId) return;

    setIsInstalling(true);

    try {
      await onSelect(selectedProfileId);
      setIsInstalled(true);

      setInstalledProfiles((prev) => ({
        ...prev,
        [selectedProfileId]: true,
      }));

      // Don't close the popup automatically
      // The parent component will handle closing after successful installation
    } catch (error) {
      console.error("Installation failed:", error);
      setIsInstalling(false);
      // Keep popup open on error so user can try again
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-black/40 border-2 border-white/30 shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-4 border-b border-white/20 flex justify-between items-center">
          <h3 className="text-white font-minecraft text-3xl tracking-wide lowercase select-none">
            {title}
          </h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
            className="text-white/60 hover:text-white"
          >
            <Icon icon="pixel:close" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-white/70 font-minecraft text-sm mb-4 tracking-wide lowercase select-none">
            {description}
          </p>

          {contentVersion && (
            <div className="mb-4 p-3 bg-black/30 border border-white/10">
              <h4 className="text-white font-minecraft text-base mb-1 tracking-wide lowercase select-none">
                Content Details:
              </h4>
              <div className="text-white/70 font-minecraft-ten text-xs tracking-wide lowercase select-none">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="pixel:cube" className="w-4 h-4" />
                  <span>
                    Type: {contentVersion.search_hit?.project_type || "Unknown"}
                  </span>
                </div>
                {contentVersion.game_versions &&
                  contentVersion.game_versions.length > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      <Icon icon="pixel:gamepad-solid" className="w-4 h-4" />
                      <span>
                        Game Versions: {contentVersion.game_versions.join(", ")}
                      </span>
                    </div>
                  )}
                {(contentVersion.search_hit?.project_type === "mod" ||
                  contentVersion.search_hit?.project_type === "modpack") &&
                  contentVersion.loaders &&
                  contentVersion.loaders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Icon icon="pixel:cog-solid" className="w-4 h-4" />
                      <span>Loaders: {contentVersion.loaders.join(", ")}</span>
                    </div>
                  )}
              </div>
            </div>
          )}

          {isCheckingInstalled ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin mr-2">
                <Icon icon="pixel:loading" className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/70 font-minecraft text-sm tracking-wide lowercase select-none">
                Checking installation status...
              </span>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              {Object.entries(profilesByLoader).map(
                ([loader, loaderProfiles]) => (
                  <ProfileGroup
                    key={loader}
                    loader={loader}
                    profiles={loaderProfiles}
                    selectedProfileId={selectedProfileId}
                    onSelectProfile={setSelectedProfileId}
                    compatibleProfiles={compatibleProfiles}
                    installedProfiles={installedProfiles}
                  />
                ),
              )}

              {Object.keys(profilesByLoader).length === 0 && (
                <EmptyProfilesMessage />
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/20 flex justify-end gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
            className="px-4 py-2 bg-black/30 border border-white/10 text-white/70 font-minecraft text-sm tracking-wide lowercase select-none hover:bg-black/40 hover:text-white"
          >
            {isInstalled ? "Close" : "Cancel"}
          </button>

          {selectedProfileId && installedProfiles[selectedProfileId] ? (
            <button
              disabled
              className="px-4 py-2 bg-green-600/30 border border-green-500/30 text-white font-minecraft text-sm tracking-wide lowercase select-none"
            >
              Installed
            </button>
          ) : (
            <button
              onClick={(e) => handleInstall(e)}
              disabled={
                !selectedProfileId ||
                (selectedProfileId && !compatibleProfiles[selectedProfileId]) ||
                isInstalling ||
                isInstalled ||
                isCheckingInstalled
              }
              className={`px-4 py-2 border font-minecraft text-sm tracking-wide lowercase select-none ${
                isInstalling
                  ? "bg-blue-600/30 border-blue-500/30 text-white"
                  : isInstalled
                    ? "bg-green-600/30 border-green-500/30 text-white"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isInstalling
                ? "Installing..."
                : isInstalled
                  ? "Installed"
                  : "Install"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyProfilesMessage() {
  return (
    <div className="text-center py-8">
      <Icon
        icon="pixel:exclamation-triangle-solid"
        className="w-14 h-14 text-white/30 mx-auto mb-4"
      />
      <p className="text-white/60 font-minecraft text-sm tracking-wide lowercase select-none">
        No profiles available
      </p>
      <p className="text-white/40 font-minecraft text-xs mt-2 tracking-wide lowercase select-none">
        Create a profile first to install content
      </p>
    </div>
  );
}
