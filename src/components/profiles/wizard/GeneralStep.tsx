"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { FormField } from "../../ui/FormField";
import { TextInput } from "../../ui/TextInput";
import { TextArea } from "../../ui/TextArea";
import { RangeSlider } from "../../ui/RangeSlider";
import { SelectInput } from "../../ui/SelectInput";
import { SectionTitle } from "../../ui/SectionTitle";
import { LoadingIndicator } from "../../ui/LoadingIndicator";

export interface GeneralStepProps {
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

  const handleNameChange = (name: string) => {
    updateProfile({ name });

    if (!name) {
      setNameError("Profile name is required");
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
      label: `${packDef.displayName} ${packDef.isExperimental ? "(Experimental)" : ""}`,
    }),
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="general information"
        description="Enter basic information about your profile. The profile name is required."
      />

      <div className="space-y-5">
        <FormField label="profile name" required error={nameError}>
          <TextInput
            value={profile.name || ""}
            onChange={handleNameChange}
            placeholder="My Awesome Profile"
          />
        </FormField>

        <FormField label="description">
          <TextArea
            value={profile.description || ""}
            onChange={(value) => updateProfile({ description: value || null })}
            placeholder="A brief description of your profile"
          />
        </FormField>

        <FormField label="group">
          <TextInput
            value={profile.group || ""}
            onChange={(value) => updateProfile({ group: value || null })}
            placeholder="e.g. Modpacks, Vanilla+"
          />
        </FormField>

        <FormField label={`maximum ram: ${memoryMaxMb} MB`}>
          <div className="flex items-center gap-4">
            <RangeSlider
              value={memoryMaxMb}
              onChange={handleMemoryChange}
              min={1024}
              max={systemRamMb}
              step={512}
            />
            <TextInput
              type="number"
              value={String(memoryMaxMb)}
              onChange={(value) => handleMemoryChange(Number.parseInt(value))}
              className="w-28"
            />
          </div>
          <p className="text-white/50 mt-1 font-minecraft text-xs">
            System RAM: {Math.round(systemRamMb / 1024)} GB
          </p>
        </FormField>

        <FormField label="norisk client pack (optional)">
          {loading ? (
            <LoadingIndicator message="Loading NoRisk packs..." />
          ) : (
            <>
              <SelectInput
                value={profile.selected_norisk_pack_id || ""}
                onChange={(value) =>
                  updateProfile({
                    selected_norisk_pack_id: value === "" ? null : value,
                  })
                }
                options={[{ value: "", label: "None" }, ...noriskPackOptions]}
              />
              {profile.selected_norisk_pack_id &&
                noriskPacks[profile.selected_norisk_pack_id] && (
                  <p className="text-white/50 mt-2 font-minecraft text-sm">
                    {noriskPacks[profile.selected_norisk_pack_id].description}
                  </p>
                )}
            </>
          )}
        </FormField>
      </div>
    </div>
  );
}
