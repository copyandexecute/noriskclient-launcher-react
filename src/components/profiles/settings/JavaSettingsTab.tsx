"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { StatusMessage } from "../../ui/StatusMessage";
import { Button } from "../../ui/buttons/Button";
import { useThemeStore } from "../../../store/useThemeStore";
import { RangeSlider } from "../../ui/RangeSlider";
import { Input } from "../../ui/Input";
import { TextArea } from "../../ui/TextArea";
import { Checkbox } from "../../ui/Checkbox";

interface JavaSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  systemRam: number;
}

export function JavaSettingsTab({
  editedProfile,
  updateProfile,
  systemRam,
}: JavaSettingsTabProps) {
  const [error] = useState<string | null>(null);
  const [useCustomJava, setUseCustomJava] = useState(
    !!editedProfile.settings?.java_path,
  );
  const [useCustomArgs, setUseCustomArgs] = useState(
    (editedProfile.settings?.custom_jvm_args?.length || 0) > 0,
  );
  const accentColor = useThemeStore((state) => state.accentColor);

  const recommendedMaxRam = Math.min(Math.floor(systemRam / 2), 16384);
  const memory = editedProfile.settings?.memory || {
    min: 1024,
    max: recommendedMaxRam,
  };

  const handleMemoryChange = (value: number) => {
    const newSettings = { ...editedProfile.settings };
    if (!newSettings.memory) {
      newSettings.memory = {
        min: 1024,
        max: value,
      };
    } else {
      newSettings.memory.max = value;
    }
    updateProfile({ settings: newSettings });
  };

  const handleJavaPathChange = (path: string) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.java_path = path;
    updateProfile({ settings: newSettings });
  };

  const handleJavaArgsChange = (args: string) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.custom_jvm_args = args;
    updateProfile({ settings: newSettings });
  };

  return (
    <div className="space-y-6 select-none">
      {error && <StatusMessage type="error" message={error} />}

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            java installation
          </h3>
          <div className="mb-3">
            <Checkbox
              checked={useCustomJava}
              onChange={(e) => {
                setUseCustomJava(e.target.checked);
                const newSettings = { ...editedProfile.settings };
                if (e.target.checked) {
                  newSettings.java_path = "";
                } else {
                  newSettings.java_path = null;
                }
                updateProfile({ settings: newSettings });
              }}
              label="custom java installation"
              className="text-2xl"
            />
          </div>

          {!useCustomJava && (
            <div
              className="p-4 rounded-lg border-2 border-b-4 mt-3"
              style={{
                backgroundColor: `${accentColor.value}10`,
                borderColor: `${accentColor.value}60`,
                borderBottomColor: accentColor.value,
                boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
              }}
            >
              <div className="text-2xl text-white font-minecraft mb-2 lowercase tracking-wide select-none">
                using default java 21 installation:
              </div>
              <div className="text-xl text-white/70 font-minecraft break-all lowercase tracking-wide select-none">
                c:\users\username\appdata\roaming\noriskclient\meta\java_versions\zulu21.38.21-ca-jre21.0.5-win_x64\bin\javaw.exe
              </div>
            </div>
          )}

          {useCustomJava && (
            <div className="flex gap-3 mt-3">
              <Input
                value={editedProfile.settings?.java_path || ""}
                onChange={(e) => handleJavaPathChange(e.target.value)}
                placeholder="path to java executable"
                className="flex-1 text-2xl py-3"
              />
              <Button
                variant="secondary"
                size="md"
                icon={
                  <Icon
                    icon="solar:folder-with-files-bold"
                    className="w-5 h-5 text-white"
                  />
                }
                className="text-2xl"
              >
                browse
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            memory allocated
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
            <RangeSlider
              value={memory.max}
              onChange={handleMemoryChange}
              min={512}
              max={systemRam}
              step={512}
              valueLabel={`${memory.max} MB (${(memory.max / 1024).toFixed(1)} GB)`}
              minLabel="512 MB"
              maxLabel={`${systemRam} MB`}
            />

            <div className="mt-3 text-xl text-white/70 tracking-wide select-none">
              recommended: {recommendedMaxRam} MB (
              {(recommendedMaxRam / 1024).toFixed(1)} GB)
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            java arguments
          </h3>
          <div className="mb-3">
            <Checkbox
              checked={useCustomArgs}
              onChange={(e) => {
                setUseCustomArgs(e.target.checked);
                const newSettings = { ...editedProfile.settings };
                if (e.target.checked) {
                  newSettings.custom_jvm_args = [
                    "-XX:+UseG1GC",
                    "-XX:+ParallelRefProcEnabled",
                    "-XX:MaxGCPauseMillis=200",
                  ].join(" ");
                } else {
                  newSettings.custom_jvm_args = null;
                }
                updateProfile({ settings: newSettings });
              }}
              label="custom java arguments"
              className="text-2xl"
            />
          </div>

          {useCustomArgs && (
            <TextArea
              value={editedProfile.settings?.custom_jvm_args || ""}
              onChange={(e) => handleJavaArgsChange(e.target.value)}
              placeholder="enter java arguments..."
              className="w-full min-h-[100px] text-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
}
