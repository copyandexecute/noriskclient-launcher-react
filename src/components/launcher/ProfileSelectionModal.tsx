"use client";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useProfileStore } from "../../store/profile-store";
import type { Profile } from "../../types/profile";
import { ProfileCard } from "../profiles/ProfileCard";

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
          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onClick={() => handleVersionSelect(profile.id)}
                onEdit={() => { console.log("Edit clicked in modal for", profile.name); }}
                onProfileCloned={() => { console.log("Cloned in modal for", profile.name); }}
                onDelete={() => { console.log("Delete in modal for", profile.name); }}
                onShouldExport={() => { console.log("Export in modal for", profile.name); }}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
