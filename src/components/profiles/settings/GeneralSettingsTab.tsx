"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { StatusMessage } from "../../ui/StatusMessage";
import { Button } from "../../ui/buttons/Button";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";

interface GeneralSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onDelete: () => void;
  isDeleting?: boolean;
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
  isDeleting,
}: GeneralSettingsTabProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noriskPacks, setNoriskPacks] = useState<Record<string, NoriskPack>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

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
    <div className="space-y-6 select-none">
      {error && <StatusMessage type="error" message={error} />}
      {cloneSuccess && <StatusMessage type="success" message={cloneSuccess} />}

      <div className="space-y-6">
        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            profile name
          </label>
          <Input
            value={editedProfile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            placeholder="Enter profile name"
            className="text-2xl py-3"
          />
        </div>

        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            norisk client pack
          </label>
          {loading ? (
            <div className="flex items-center justify-center p-4 text-white">
              <Icon
                icon="solar:refresh-bold"
                className="w-6 h-6 mr-2 animate-spin"
              />
              <span className="font-minecraft text-2xl">
                loading norisk packs...
              </span>
            </div>
          ) : (
            <>
              <Select
                value={editedProfile.selected_norisk_pack_id || ""}
                onChange={(value) =>
                  updateProfile({
                    selected_norisk_pack_id: value === "" ? null : value,
                  })
                }
                options={[{ value: "", label: "none" }, ...noriskPackOptions]}
                className="text-2xl py-3"
              />
              {editedProfile.selected_norisk_pack_id &&
                noriskPacks[editedProfile.selected_norisk_pack_id] && (
                  <p className="text-xl text-white/70 mt-2 font-minecraft tracking-wide select-none">
                    {
                      noriskPacks[editedProfile.selected_norisk_pack_id]
                        .description
                    }
                  </p>
                )}
            </>
          )}
        </div>
      </div>

      <div
        className="mt-6 p-4 rounded-lg border-2 border-b-4"
        style={{
          backgroundColor: `${accentColor.value}10`,
          borderColor: `${accentColor.value}60`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        }}
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <h3 className="text-3xl font-minecraft text-white mb-2 lowercase">
              duplicate instance
            </h3>
            <p className="text-xl text-white/70 mb-3 font-minecraft tracking-wide select-none">
              creates a copy of this instance, including worlds, configs, mods,
              etc.
            </p>
            <Button
              onClick={handleDuplicate}
              disabled={loading}
              variant="secondary"
              icon={
                <Icon icon="solar:copy-bold" className="w-5 h-5 text-white" />
              }
              size="md"
              className="text-2xl"
            >
              {loading ? (
                <>
                  <Icon
                    icon="solar:refresh-bold"
                    className="w-5 h-5 animate-spin text-white"
                  />
                  <span>duplicating...</span>
                </>
              ) : (
                "duplicate"
              )}
            </Button>
          </div>

          <div className="flex-1 min-w-[250px]">
            <h3 className="text-3xl font-minecraft text-white mb-2 lowercase">
              delete instance
            </h3>
            <p className="text-xl text-white/70 mb-3 font-minecraft tracking-wide select-none">
              permanently deletes this instance from your device, including your
              worlds, configs, and all installed content.
            </p>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting || loading}
              icon={
                isDeleting ? (
                  <Icon
                    icon="solar:refresh-bold"
                    className="w-5 h-5 animate-spin text-white"
                  />
                ) : (
                  <Icon
                    icon="solar:trash-bin-trash-bold"
                    className="w-5 h-5 text-white"
                  />
                )
              }
              size="md"
              className="text-2xl"
            >
              {isDeleting
                ? "deleting..."
                : confirmDelete
                  ? "confirm delete"
                  : "delete instance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
