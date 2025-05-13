"use client";

import React from 'react';
import type {
  ModrinthSearchHit,
  ModrinthVersion,
} from '../../../types/modrinth';
import { Icon } from '@iconify/react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/buttons/Button';
import { useThemeStore } from '../../../store/useThemeStore';
import { cn } from '../../../lib/utils';
import { TagBadge } from '../../ui/TagBadge';
// Potentially import Profile type if available and not 'any'
// import type { Profile } from '../../../types/profile';

interface ModrinthInstallModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  project: ModrinthSearchHit | null;
  version: ModrinthVersion | null;
  profiles: any[]; // Replace 'any' with actual Profile type
  selectedProfileId?: string | null; // For highlighting
  isLoadingStatus: boolean;
  installStatus: Record<string, boolean>;
  installingProfiles: Record<string, boolean>;
  onInstallToProfile: (profileId: string) => void;
}

export const ModrinthInstallModalV2: React.FC<ModrinthInstallModalV2Props> = ({
  isOpen,
  onClose,
  project,
  version,
  profiles,
  selectedProfileId,
  isLoadingStatus,
  installStatus,
  installingProfiles,
  onInstallToProfile,
}) => {
  if (!isOpen || !project || !version) return null;
  const accentColor = useThemeStore((state) => state.accentColor);

  const modalContent = (
    <div className="px-6 py-4">
      <div className="mb-1 mt-1">
        <p className="text-gray-300 mb-2 text-base lowercase">Select Profile(s) to install to:</p>
        {isLoadingStatus ? (
          <div className="flex justify-center items-center py-6">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="ml-3 text-gray-300">Loading profiles...</span>
          </div>
        ) : (
          <div 
            className="max-h-60 overflow-y-auto border custom-scrollbar"
            style={{ borderColor: `${accentColor.value}80` }}
          >
            {profiles.length > 0 ? (
              [...profiles]
                .sort((a, b) => {
                  if (a.id === selectedProfileId) return -1;
                  if (b.id === selectedProfileId) return 1;
                  return 0;
                })
                .map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "p-3 border-b last:border-b-0 flex justify-between items-center hover:bg-white/10 transition-colors duration-150"
                    )}
                    style={{
                      backgroundColor: profile.id === selectedProfileId ? `${accentColor.value}50` : `${accentColor.value}30`,
                      borderBottomColor: `${accentColor.value}80`,
                    }}
                  >
                    <div className="flex-grow mr-3">
                      <span className="font-medium text-base font-minecraft-ten block mb-0.5">{profile.name}</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <TagBadge variant="info" className="text-xs">
                          {profile.game_version}
                        </TagBadge>
                        {profile.loader && (
                          <TagBadge variant="info" className="text-xs">
                            {profile.loader}
                          </TagBadge>
                        )}
                      </div>
                      {profile.id === selectedProfileId && (
                        <span className="block mt-1 text-xs text-green-400 font-minecraft-ten">
                          (Current Profile)
                        </span>
                      )}
                    </div>

                    {installStatus[profile.id] ? (
                      <Button
                        size="xs"
                        variant="default"
                        disabled
                        shadowDepth="short"
                        icon={<Icon icon="ph:check-bold" className="w-3.5 h-3.5" />}
                        style={{ backgroundColor: `${accentColor.value}99`, borderColor: `${accentColor.value}` }}
                        className="flex-shrink-0"
                      >
                        Installed
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onInstallToProfile(profile.id)}
                        disabled={installingProfiles[profile.id]}
                        size="xs"
                        variant={installingProfiles[profile.id] ? "secondary" : "success"}
                        shadowDepth="short"
                        icon={installingProfiles[profile.id] ? 
                            <svg
                                className="animate-spin h-3 w-3 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                                </svg> : <Icon icon="solar:download-minimalistic-bold" className="w-3.5 h-3.5" />}
                        iconPosition="left"
                        className="flex-shrink-0"
                      >
                        {installingProfiles[profile.id] ? "Installing..." : "Install"}
                      </Button>
                    )}
                  </div>
                ))
            ) : (
              <p className="p-4 text-center text-gray-400">No profiles available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      title={`Install: ${project.title}`}
      titleIcon={<Icon icon="solar:box-minimalistic-bold-duotone" className="w-5 h-5 mr-2" />}
      onClose={onClose}
      width="md"
      footer={(
        <div className="flex justify-end w-full">
          <Button onClick={onClose} variant="secondary" shadowDepth="short">
            Close
          </Button>
        </div>
      )}
    >
      {modalContent}
    </Modal>
  );
}; 