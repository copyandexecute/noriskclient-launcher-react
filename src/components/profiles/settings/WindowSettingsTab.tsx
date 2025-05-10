"use client";

import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { Checkbox } from "../../ui/Checkbox";
import { Label } from "../../ui/Label";
import { Input } from "../../ui/Input";

interface WindowSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function WindowSettingsTab({
  editedProfile,
  updateProfile,
}: WindowSettingsTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
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
    <div className="space-y-6 select-none">
      <div>
        <h3 className="text-3xl font-minecraft text-white mb-2 lowercase">
          window settings
        </h3>
        <p className="text-xl text-white/70 mb-4 font-minecraft tracking-wide select-none">
          configure how minecraft's window appears on your screen.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            resolution
          </h3>
          <div
            className="p-4 rounded-lg border-2 border-b-4"
            style={{
              backgroundColor: `${accentColor.value}10`,
              borderColor: `${accentColor.value}60`,
              borderBottomColor: accentColor.value,
              boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
            }}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xl text-white/70 font-minecraft mb-2 lowercase tracking-wide select-none">
                  width
                </label>
                <Input
                  type="number"
                  value={String(
                    editedProfile.settings?.resolution?.width || 1280,
                  )}
                  onChange={(e) => {
                    const width = Number.parseInt(e.target.value) || 1280;
                    handleResolutionChange(
                      width,
                      editedProfile.settings?.resolution?.height || 720,
                    );
                  }}
                  className="text-2xl py-3"
                />
              </div>
              <div>
                <label className="block text-xl text-white/70 font-minecraft mb-2 lowercase tracking-wide select-none">
                  height
                </label>
                <Input
                  type="number"
                  value={String(
                    editedProfile.settings?.resolution?.height || 720,
                  )}
                  onChange={(e) => {
                    const height = Number.parseInt(e.target.value) || 720;
                    handleResolutionChange(
                      editedProfile.settings?.resolution?.width || 1280,
                      height,
                    );
                  }}
                  className="text-2xl py-3"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {resolutionPresets.map((preset) => (
                <Label
                  key={preset.label}
                  variant={
                    editedProfile.settings?.resolution?.width ===
                      preset.width &&
                    editedProfile.settings?.resolution?.height === preset.height
                      ? "default"
                      : "ghost"
                  }
                  size="md"
                  className="cursor-pointer text-xl"
                  onClick={() =>
                    handleResolutionChange(preset.width, preset.height)
                  }
                >
                  {preset.label}
                </Label>
              ))}
            </div>

            <Checkbox
              checked={editedProfile.settings?.fullscreen || false}
              onChange={(e) => handleFullscreenChange(e.target.checked)}
              label="fullscreen"
              className="text-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
