"use client";

import React from 'react';
import type {
  ModrinthSearchHit,
  ModrinthVersion,
} from '../../../types/modrinth';
import { Icon } from '@iconify/react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/buttons/Button';
import { useThemeStore } from '../../../store/useThemeStore'; // For accent color on Installed button
import { cn } from '../../../lib/utils';
// Potentially import Profile type if available and not 'any'
// import type { Profile } from '../../../types/profile'; 

interface ModrinthQuickInstallModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  project: ModrinthSearchHit | null;
  versions: ModrinthVersion[] | null;
  isLoading: boolean;
  error: string | null;
  profiles: any[]; // Replace 'any' with actual Profile type
  selectedProfileId?: string | null; // For highlighting
  installStatus: Record<string, boolean>;
  installingProfiles: Record<string, boolean>;
  onInstallToProfile: (profileId: string) => void;
  findBestVersionForProfile: (
    profile: any, // Replace 'any' with Profile type
    versions: ModrinthVersion[],
  ) => ModrinthVersion | null;
}

export const ModrinthQuickInstallModalV2: React.FC<ModrinthQuickInstallModalV2Props> = ({
  isOpen,
  onClose,
  project,
  versions,
  isLoading,
  error,
  profiles,
  selectedProfileId,
  installStatus,
  installingProfiles,
  onInstallToProfile,
  findBestVersionForProfile,
}) => {
  if (!isOpen || !project) return null;
  const accentColor = useThemeStore((state) => state.accentColor); // Get accent color

  const modalContent = (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
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
          <span className="ml-3 text-gray-300">
            Finding compatible versions...
          </span>
        </div>
      ) : error ? (
        <div className="text-red-400 text-center py-6 px-6">{error}</div>
      ) : versions && versions.length > 0 ? (
        <div className="px-6 py-4">
          <p className="text-gray-300 mb-4">
            Quick Install will automatically select the most compatible version
            for each profile:
          </p>

          <div className="mb-1">
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
                  .map((profile) => {
                    const bestVersion = findBestVersionForProfile(
                      profile,
                      versions,
                    );
                    const isCompatible = !!bestVersion;

                    return (
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
                        <div className="text-white">
                          <span className="font-medium text-base font-minecraft-ten">{profile.name}</span>
                          {profile.id === selectedProfileId && (
                            <span className="ml-2 text-xs text-green-400">
                              (Current Profile)
                            </span>
                          )}
                          {isCompatible && bestVersion && (
                            <div className="text-base text-gray-400 mt-0.5 font-minecraft lowercase">
                              Best version: {bestVersion.version_number}
                            </div>
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
                          >
                            Installed
                          </Button>
                        ) : !isCompatible ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled
                            shadowDepth="short"
                            icon={<Icon icon="solar:danger-bold" className="w-3.5 h-3.5" />}
                          >
                            Not Compatible
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
                          >
                            {installingProfiles[profile.id] ? "Installing..." : "Install"}
                          </Button>
                        )}
                      </div>
                    );
                  })
              ) : (
                <p className="p-4 text-center text-gray-400">
                  No profiles available
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-300 text-center py-6 px-6">
          No versions found for this project.
        </div>
      )}
    </>
  );

  return (
    <Modal
      title={`Quick Install: ${project.title}`}
      titleIcon={<Icon icon="solar:bolt-bold-duotone" className="w-5 h-5" />}
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