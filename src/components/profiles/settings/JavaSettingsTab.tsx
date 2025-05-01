"use client";

import { useState } from "react";
import type { Profile } from "../../../types/profile";
import { FormSection } from "../../ui/FormSection";
import { FormField } from "../../ui/FormField";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { RangeSlider } from "../../ui/RangeSlider";
import { StatusMessage } from "../../ui/StatusMessage";

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
  const [isLoadingRam] = useState(false);
  const [error] = useState<string | null>(null);
  const [useCustomJava, setUseCustomJava] = useState(
    !!editedProfile.settings?.java_path,
  );
  const [useCustomArgs, setUseCustomArgs] = useState(
    (editedProfile.settings?.extra_args?.length || 0) > 0,
  );

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
    newSettings.extra_args = args.split(" ").filter((arg) => arg.trim() !== "");
    updateProfile({ settings: newSettings });
  };

  return (
    <div className="space-y-8 select-none">
      {error && <StatusMessage type="error" message={error} />}

      <FormSection>
        <FormField label="java installation">
          <ToggleSwitch
            id="customJava"
            checked={useCustomJava}
            onChange={(checked) => {
              setUseCustomJava(checked);
              const newSettings = { ...editedProfile.settings };
              if (checked) {
                newSettings.java_path = "";
              } else {
                newSettings.java_path = null;
              }
              updateProfile({ settings: newSettings });
            }}
            label="custom java installation"
          />

          {!useCustomJava && (
            <div className="bg-black/30 backdrop-blur-md border-2 border-white/30 p-5 rounded-lg mt-4">
              <div className="text-white font-minecraft mb-2 text-base lowercase tracking-wide">
                using default java 21 installation:
              </div>
              <div className="text-white/70 text-sm font-minecraft break-all lowercase tracking-wide">
                c:\users\username\appdata\roaming\noriskclient\meta\java_versions\zulu21.38.21-ca-jre21.0.5-win_x64\bin\javaw.exe
              </div>
            </div>
          )}

          {useCustomJava && (
            <div className="flex gap-4 mt-4">
              <TextInput
                value={editedProfile.settings?.java_path || ""}
                onChange={handleJavaPathChange}
                placeholder="path to java executable"
                className="flex-1 text-base tracking-wide"
              />
              <Button variant="secondary" className="text-base tracking-wide">
                browse
              </Button>
            </div>
          )}
        </FormField>
      </FormSection>

      <FormSection>
        <FormField label="memory allocated">
          <RangeSlider
            value={memory.max}
            onChange={handleMemoryChange}
            min={512}
            max={systemRam}
            step={512}
            valueLabel={`${memory.max} mb (${(memory.max / 1024).toFixed(1)} gb)`}
            minLabel="512 mb"
            maxLabel={`${systemRam} mb (${(systemRam / 1024).toFixed(1)} gb)`}
            disabled={isLoadingRam}
          />
          <div className="mt-3 text-white/70 text-sm tracking-wide">
            recommended: {recommendedMaxRam} mb (
            {(recommendedMaxRam / 1024).toFixed(1)} gb)
          </div>
        </FormField>
      </FormSection>

      <FormSection>
        <FormField label="java arguments">
          <ToggleSwitch
            id="customArgs"
            checked={useCustomArgs}
            onChange={(checked) => {
              setUseCustomArgs(checked);
              const newSettings = { ...editedProfile.settings };
              if (checked) {
                newSettings.extra_args = [
                  "-XX:+UseG1GC",
                  "-XX:+ParallelRefProcEnabled",
                  "-XX:MaxGCPauseMillis=200",
                ];
              } else {
                newSettings.extra_args = [];
              }
              updateProfile({ settings: newSettings });
            }}
            label="custom java arguments"
          />

          {useCustomArgs && (
            <TextInput
              value={editedProfile.settings?.extra_args?.join(" ") || ""}
              onChange={handleJavaArgsChange}
              placeholder="enter java arguments..."
              className="mt-4 text-base tracking-wide"
            />
          )}
        </FormField>
      </FormSection>
    </div>
  );
}
