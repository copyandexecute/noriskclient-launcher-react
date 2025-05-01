"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ProfileGroup } from "./ProfileGroup";

interface ProfileSelectionPopupProps {
  profiles: Profile[];
  onSelect: (profileId: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function ProfileSelectionPopup({
  profiles = [],
  onSelect,
  onCancel,
  title = "Select Profile",
  description = "Choose a profile to install this content to:",
}: ProfileSelectionPopupProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles && profiles.length > 0 ? profiles[0].id : null,
  );
  const popupRef = useRef<HTMLDivElement>(null);

  const profilesByLoader: Record<string, Profile[]> = {};
  if (profiles && profiles.length > 0) {
    profiles.forEach((profile) => {
      const loader = profile.loader || "Unknown";
      if (!profilesByLoader[loader]) {
        profilesByLoader[loader] = [];
      }
      profilesByLoader[loader].push(profile);
    });
  }

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-black/40 border-2 border-white/30 shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-4 border-b border-white/20 flex justify-between items-center">
          <h3 className="text-white font-minecraft text-lg">{title}</h3>
          <button onClick={onCancel} className="text-white/60 hover:text-white">
            <Icon icon="pixel:close" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-white/70 font-minecraft text-sm mb-4">
            {description}
          </p>

          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
            {Object.entries(profilesByLoader).map(
              ([loader, loaderProfiles]) => (
                <ProfileGroup
                  key={loader}
                  loader={loader}
                  profiles={loaderProfiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                />
              ),
            )}

            {Object.keys(profilesByLoader).length === 0 && (
              <EmptyProfilesMessage />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/20 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-black/30 border border-white/10 text-white/70 font-minecraft text-sm hover:bg-black/40 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedProfileId && onSelect(selectedProfileId)}
            disabled={!selectedProfileId}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-minecraft text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyProfilesMessage() {
  return (
    <div className="text-center py-8">
      <Icon
        icon="pixel:warning"
        className="w-12 h-12 text-white/30 mx-auto mb-4"
      />
      <p className="text-white/60 font-minecraft text-sm">
        No profiles available
      </p>
      <p className="text-white/40 font-minecraft text-xs mt-2">
        Create a profile first to install content
      </p>
    </div>
  );
}
