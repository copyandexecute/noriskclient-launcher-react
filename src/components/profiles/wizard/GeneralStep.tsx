"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "../../../store/useThemeStore";
import { Input } from "../../ui/Input";
import { TextArea } from "../../ui/TextArea";
import { Select } from "../../ui/Select";
import { RangeSlider } from "../../ui/RangeSlider";

interface GeneralStepProps {
  profile: Partial<Profile>;
  updateProfile: (updates: Partial<Profile>) => void;
  systemRamMb: number;
}

interface NoriskPack {
  displayName: string;
  description: string;
  isExperimental?: boolean;
}

export function GeneralStep({
  profile,
  updateProfile,
  systemRamMb,
}: GeneralStepProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [noriskPacks, setNoriskPacks] = useState<Record<string, NoriskPack>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [memoryMaxMb, setMemoryMaxMb] = useState<number>(
    profile.settings?.memory?.max || 4096,
  );
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const loadNoriskPacks = async () => {
      try {
        setLoading(true);
        const packsData = await invoke<{ packs: Record<string, NoriskPack> }>(
          "get_norisk_packs",
        ).catch(() => ({
          packs: {},
        }));
        setNoriskPacks(packsData.packs);
      } catch (err) {
        console.error("Failed to load NoRisk packs:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNoriskPacks();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    updateProfile({ name });

    if (!name) {
      setNameError("profile name is required");
    } else {
      setNameError(null);
    }
  };

  const handleMemoryChange = (value: number) => {
    setMemoryMaxMb(value);
    updateProfile({
      settings: {
        ...profile.settings!,
        memory: {
          min: 1024,
          max: value,
        },
      },
    });
  };

  const noriskPackOptions = Object.entries(noriskPacks).map(
    ([packId, packDef]) => ({
      value: packId,
      label: `${packDef.displayName} ${packDef.isExperimental ? "(experimental)" : ""}`,
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-minecraft text-white mb-3 lowercase">
          profile details
        </h2>
        <p className="text-xl text-white/70 font-minecraft tracking-wide">
          Enter basic information about your Minecraft profile.
        </p>
      </div>

      <div
        className="p-6 rounded-lg border-2 border-b-4 space-y-6"
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        }}
      >
        <div>
          <label className="block text-2xl font-minecraft text-white mb-2 lowercase">
            profile name <span className="text-red-400">*</span>
          </label>
          <Input
            value={profile.name || ""}
            onChange={handleNameChange}
            placeholder="My Awesome Profile"
            error={nameError}
            icon={<Icon icon="solar:user-bold" className="w-5 h-5" />}
          />
        </div>

        <div>
          <label className="block text-2xl font-minecraft text-white mb-2 lowercase">
            description
          </label>
          <TextArea
            value={profile.description || ""}
            onChange={(e) =>
              updateProfile({ description: e.target.value || null })
            }
            placeholder="A brief description of your profile"
          />
        </div>

        <div>
          <label className="block text-2xl font-minecraft text-white mb-2 lowercase">
            group
          </label>
          <Input
            value={profile.group || ""}
            onChange={(e) => updateProfile({ group: e.target.value || null })}
            placeholder="e.g. modpacks, vanilla+"
            icon={<Icon icon="solar:folder-bold" className="w-5 h-5" />}
          />
        </div>
      </div>

      <div
        className="p-6 rounded-lg border-2 border-b-4 space-y-6"
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        }}
      >
        <div>
          <label className="block text-2xl font-minecraft text-white mb-2 lowercase">
            maximum ram: {memoryMaxMb} mb ({(memoryMaxMb / 1024).toFixed(1)} gb)
          </label>
          <RangeSlider
            value={memoryMaxMb}
            onChange={handleMemoryChange}
            min={1024}
            max={systemRamMb}
            step={512}
            minLabel="1 GB"
            maxLabel={`${(systemRamMb / 1024).toFixed(1)} GB`}
          />
          <p className="text-lg text-white/60 mt-3 font-minecraft tracking-wide">
            Recommended:{" "}
            {Math.min(Math.max(Math.floor(systemRamMb / 4), 2048), 8192)} MB (
            {(
              Math.min(Math.max(Math.floor(systemRamMb / 4), 2048), 8192) / 1024
            ).toFixed(1)}{" "}
            GB)
          </p>
        </div>

        <div>
          <label className="block text-2xl font-minecraft text-white mb-2 lowercase">
            norisk client pack
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-white/70">
              <Icon
                icon="solar:refresh-bold"
                className="w-5 h-5 animate-spin"
              />
              <span className="font-minecraft text-xl">
                Loading NoRisk packs...
              </span>
            </div>
          ) : (
            <>
              <Select
                value={profile.selected_norisk_pack_id || ""}
                onChange={(value) =>
                  updateProfile({
                    selected_norisk_pack_id: value === "" ? null : value,
                  })
                }
                options={[
                  { value: "", label: "None (Optional)" },
                  ...noriskPackOptions,
                ]}
              />
              {profile.selected_norisk_pack_id &&
                noriskPacks[profile.selected_norisk_pack_id] && (
                  <div
                    className="mt-4 p-4 rounded-md border-2"
                    style={{
                      backgroundColor: `${accentColor.value}20`,
                      borderColor: `${accentColor.value}40`,
                    }}
                  >
                    <p className="text-xl text-white/80 font-minecraft tracking-wide">
                      {noriskPacks[profile.selected_norisk_pack_id].description}
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
