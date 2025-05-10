"use client";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useState } from "react";

interface Version {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
  profileId?: string;
}

interface ProfileSelectionModalProps {
  versions: Version[];
  onVersionChange: (version: string) => void;
  title?: string;
}

export function ProfileSelectionModal({
  versions,
  onVersionChange,
  title = "select profile",
}: ProfileSelectionModalProps) {
  const { accentColor } = useThemeStore();
  const { selectedVersion, setSelectedVersion, isModalOpen, closeModal } =
    useVersionSelectionStore();
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null);

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    onVersionChange(version);
    closeModal();
  };

  const renderFooter = () => (
    <div className="flex justify-end">
      <Button
        variant="default"
        onClick={() => {
          if (selectedVersion) {
            handleVersionSelect(selectedVersion);
          }
        }}
        disabled={!selectedVersion}
        icon={<Icon icon="solar:check-circle-bold" className="w-5 h-5" />}
        size="md"
      >
        select profile
      </Button>
    </div>
  );

  if (!isModalOpen) return null;

  return (
    <Modal
      title="select profile"
      onClose={closeModal}
      width="lg"
      footer={renderFooter()}
    >
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-3xl font-minecraft text-white mb-5 lowercase select-none">
              choose a profile
            </h3>
            <p className="text-2xl text-white/70 mb-6 font-minecraft tracking-wide select-none">
              Select a profile to launch or manage. You can create new profiles
              in the Profiles tab.
            </p>
          </div>

          <div
            className="backdrop-blur-md border-2 border-b-4 p-5 rounded-md"
            style={{
              backgroundColor: `${accentColor.value}15`,
              borderColor: `${accentColor.value}60`,
              borderBottomColor: accentColor.value,
              boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
            }}
          >
            {versions.length === 0 ? (
              <div className="text-center p-4 text-white/60 font-minecraft text-2xl lowercase tracking-wide select-none">
                no profiles available
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="relative overflow-hidden transition-all duration-300 cursor-pointer py-1"
                    onClick={() => setSelectedVersion(version.id)}
                    onMouseEnter={() => setHoveredVersion(version.id)}
                    onMouseLeave={() => setHoveredVersion(null)}
                  >
                    <Button
                      variant={
                        version.id === selectedVersion ? "default" : "secondary"
                      }
                      size="md"
                      className="w-full justify-start"
                      onClick={() => setSelectedVersion(version.id)}
                      icon={
                        <div
                          className="w-8 h-8 flex items-center justify-center rounded-md mr-2"
                          style={{
                            backgroundColor:
                              version.id === selectedVersion
                                ? `${accentColor.value}30`
                                : "rgba(0,0,0,0.3)",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderColor:
                              version.id === selectedVersion
                                ? accentColor.value
                                : "rgba(255,255,255,0.1)",
                          }}
                        >
                          {version.isCustom ? (
                            <img
                              src="/logo.png"
                              alt="NoRisk"
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          ) : version.icon ? (
                            <img
                              src={`/icons/${version.icon}.png`}
                              alt={version.icon}
                              width={24}
                              height={24}
                              className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/icons/minecraft.png";
                              }}
                            />
                          ) : (
                            <Icon
                              icon="pixel:grid-solid"
                              className="w-6 h-6 text-white"
                            />
                          )}
                        </div>
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xl lowercase tracking-wide font-minecraft">
                          {version.label}
                        </span>
                        {version.id === selectedVersion && (
                          <Icon
                            icon="pixel:check-solid"
                            className="w-6 h-6 text-white ml-2"
                          />
                        )}
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
