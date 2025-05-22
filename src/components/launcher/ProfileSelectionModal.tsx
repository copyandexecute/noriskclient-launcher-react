"use client";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useProfileStore } from "../../store/profile-store";
import type { Profile } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";
import { VirtuosoGrid } from "react-virtuoso";
import React from "react";

interface ProfileSelectionModalProps {
  onVersionChange: (versionId: string) => void;
  title?: string;
}

export function ProfileSelectionModal({
  onVersionChange,
  title = "select profile",
}: ProfileSelectionModalProps) {
  const { setSelectedVersion, isModalOpen, closeModal } =
    useVersionSelectionStore();
  const { profiles, loading: profilesLoading, error: profilesError } = useProfileStore();

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    onVersionChange(versionId);
    closeModal();
  };

  if (!isModalOpen) return null;

  // eslint-disable-next-line react/display-name
  const GridList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "1rem", // Adjust gap as needed
        paddingRight: "0.5rem", // For scrollbar spacing if needed by custom-scrollbar
      }}
    >
      {children}
    </div>
  ));

  // eslint-disable-next-line react/display-name
  const GridItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));

  return (
    <Modal
      title={title}
      onClose={closeModal}
      width="lg"
    >
      <div className="p-6">
        {profilesLoading ? (
          <div className="text-center p-4 text-white/60 font-minecraft text-2xl lowercase tracking-wide select-none">
            loading profiles...
          </div>
        ) : profilesError ? (
          <div className="text-center p-4 text-red-400 font-minecraft text-2xl lowercase tracking-wide select-none">
            error loading profiles
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center p-4 text-white/60 font-minecraft text-2xl lowercase tracking-wide select-none">
            no profiles available
          </div>
        ) : (
          <VirtuosoGrid
            totalCount={profiles.length}
            style={{ height: "60vh" }} // Max height is controlled by Virtuoso
            className="custom-scrollbar" // Apply custom scrollbar style
            components={{
              List: GridList,
              Item: GridItem,
            }}
            itemContent={(index) => {
              const profile = profiles[index];
              return (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onClick={() => handleVersionSelect(profile.id)}
                  onEdit={() => { console.log("Edit clicked in modal for", profile.name); }}
                  onProfileCloned={() => { console.log("Cloned in modal for", profile.name); }}
                  onDelete={() => { console.log("Delete in modal for", profile.name); }}
                  onShouldExport={() => { console.log("Export in modal for", profile.name); }}
                  interactionMode="settings"
                  onSettingsNavigation={closeModal}
                />
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
}
