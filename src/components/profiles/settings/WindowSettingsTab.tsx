"use client";

import type { Profile } from "../../../types/profile";
import { FormSection } from "../../ui/FormSection";
import { FormField } from "../../ui/FormField";
import { TextInput } from "../../ui/TextInput";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SectionTitle } from "../../ui/SectionTitle";

interface WindowSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function WindowSettingsTab({
  editedProfile,
  updateProfile,
}: WindowSettingsTabProps) {
  const resolutionPresets = [
    { width: 1280, height: 720, label: "720p" },
    { width: 1920, height: 1080, label: "1080p" },
    { width: 2560, height: 1440, label: "1440p" },
    { width: 3840, height: 2160, label: "4k" },
  ];

  const handleResolutionChange = (width: number, height: number) => {
    const newSettings = { ...editedProfile.settings };
    if (!newSettings.resolution) {
      newSettings.resolution = { width, height };
    } else {
      newSettings.resolution.width = width;
      newSettings.resolution.height = height;
    }
    updateProfile({ settings: newSettings });
  };

  const handleFullscreenChange = (fullscreen: boolean) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.fullscreen = fullscreen;
    updateProfile({ settings: newSettings });
  };

  return (
    <div className="space-y-8 select-none">
      <SectionTitle
        title="window settings"
        description="configure how minecraft's window appears on your screen."
      />

      <FormSection>
        <FormField label="resolution">
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-white/70 font-minecraft mb-2 text-sm lowercase tracking-wide">
                width
              </label>
              <TextInput
                type="number"
                value={String(
                  editedProfile.settings?.resolution?.width || 1280,
                )}
                onChange={(value) => {
                  const width = Number.parseInt(value) || 1280;
                  handleResolutionChange(
                    width,
                    editedProfile.settings?.resolution?.height || 720,
                  );
                }}
                className="text-base tracking-wide"
              />
            </div>
            <div>
              <label className="block text-white/70 font-minecraft mb-2 text-sm lowercase tracking-wide">
                height
              </label>
              <TextInput
                type="number"
                value={String(
                  editedProfile.settings?.resolution?.height || 720,
                )}
                onChange={(value) => {
                  const height = Number.parseInt(value) || 720;
                  handleResolutionChange(
                    editedProfile.settings?.resolution?.width || 1280,
                    height,
                  );
                }}
                className="text-base tracking-wide"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            {resolutionPresets.map((preset) => (
              <button
                key={preset.label}
                className={`px-4 py-2 text-sm font-minecraft tracking-wide rounded-md transition-all duration-200 ${
                  editedProfile.settings?.resolution?.width === preset.width &&
                  editedProfile.settings?.resolution?.height === preset.height
                    ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    : "bg-black/30 text-white/70 border-2 border-white/20 hover:bg-black/40 hover:text-white"
                }`}
                onClick={() =>
                  handleResolutionChange(preset.width, preset.height)
                }
              >
                {preset.label}
              </button>
            ))}
          </div>

          <ToggleSwitch
            id="fullscreen"
            checked={editedProfile.settings?.fullscreen || false}
            onChange={handleFullscreenChange}
            label="fullscreen"
          />
        </FormField>
      </FormSection>
    </div>
  );
}
