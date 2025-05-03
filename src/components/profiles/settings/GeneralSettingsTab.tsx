"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { FormSection } from "../../ui/FormSection";
import { FormField } from "../../ui/FormField";
import { TextInput } from "../../ui/TextInput";
import { SelectInput } from "../../ui/SelectInput";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { LoadingIndicator } from "../../ui/LoadingIndicator";
import { Icon } from "@iconify/react";

interface GeneralSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onDelete: () => void;
}

interface NoriskPack {
  displayName: string;
  description: string;
  isExperimental?: boolean;
}

export function GeneralSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  onDelete,
}: GeneralSettingsTabProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noriskPacks, setNoriskPacks] = useState<Record<string, NoriskPack>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadNoriskPacks = async () => {
      try {
        setLoading(true);
        setError(null);
        const packsData = await invoke<{ packs: Record<string, NoriskPack> }>(
          "get_norisk_packs",
        );
        setNoriskPacks(packsData.packs);
      } catch (err) {
        console.error("Failed to load NoRisk packs:", err);
        setError(
          `failed to load norisk packs: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadNoriskPacks();
  }, []);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 10000);
    }
  };

  const handleDuplicate = async () => {
    try {
      setLoading(true);
      setError(null);
      setCloneSuccess(null);

      await invoke("copy_profile", {
        params: {
          source_profile_id: profile.id,
          new_profile_name: `${profile.name} (copy)`,
          include_files: undefined,
        },
      });

      setCloneSuccess("profile duplicated successfully!");
      setTimeout(() => setCloneSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to duplicate profile:", err);
      setError(
        `failed to duplicate profile: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const noriskPackOptions = Object.entries(noriskPacks).map(
    ([packId, packDef]) => ({
      value: packId,
      label: `${packDef.displayName} ${packDef.isExperimental ? "(experimental)" : ""}`,
    }),
  );

  return (
    <div className="space-y-8 select-none">
      {error && <StatusMessage type="error" message={error} />}
      {cloneSuccess && <StatusMessage type="success" message={cloneSuccess} />}

      <FormSection>
        <FormField label="profile name">
          <TextInput
            value={editedProfile.name}
            onChange={(value) => updateProfile({ name: value })}
            className="text-2xl tracking-wide"
          />
        </FormField>

        <FormField label="norisk client pack">
          {loading ? (
            <LoadingIndicator message="loading norisk packs..." />
          ) : (
            <>
              <SelectInput
                value={editedProfile.selected_norisk_pack_id || ""}
                onChange={(value) =>
                  updateProfile({
                    selected_norisk_pack_id: value === "" ? null : value,
                  })
                }
                options={[{ value: "", label: "none" }, ...noriskPackOptions]}
                className="text-2xl tracking-wide"
              />
              {editedProfile.selected_norisk_pack_id &&
                noriskPacks[editedProfile.selected_norisk_pack_id] && (
                  <p className="text-xl text-white/70 mt-4 font-minecraft tracking-wide select-none">
                    {
                      noriskPacks[editedProfile.selected_norisk_pack_id]
                        .description
                    }
                  </p>
                )}
            </>
          )}
        </FormField>
      </FormSection>

      <div className="flex flex-wrap gap-6">
        <FormSection className="flex-1 min-w-[300px]">
          <FormField
            label="duplicate instance"
            description="creates a copy of this instance, including worlds, configs, mods, etc."
          >
            <Button
              onClick={handleDuplicate}
              disabled={loading}
              variant="secondary"
              className="text-2xl py-3 px-6 tracking-wide"
            >
              <Icon icon={"pixel:copy-solid"} />
              duplicate
            </Button>
          </FormField>
        </FormSection>

        <FormSection className="flex-1 min-w-[300px]">
          <FormField
            label="delete instance"
            description="permanently deletes this instance from your device, including your worlds, configs, and all installed content."
          >
            <Button
              onClick={handleDelete}
              variant="danger"
              className="text-2xl py-3 px-6 tracking-wide"
            >
              <Icon icon={"pixel:trash-alt-solid"} />
              {confirmDelete ? "confirm delete" : "delete instance"}
            </Button>
          </FormField>
        </FormSection>
      </div>
    </div>
  );
}
