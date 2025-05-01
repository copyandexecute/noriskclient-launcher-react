"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import type { MinecraftVersion } from "../../../types/minecraft";
import { invoke } from "@tauri-apps/api/core";
import { FormSection } from "../../ui/FormSection";
import { FormField } from "../../ui/FormField";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { TabButton } from "../../ui/TabButton";
import { ModLoaderButton } from "../../ui/ModLoaderButton";
import { SelectInput } from "../../ui/SelectInput";
import { LoadingIndicator } from "../../ui/LoadingIndicator";

interface InstallationSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";

export function InstallationSettingsTab({
  editedProfile,
  updateProfile,
}: InstallationSettingsTabProps) {
  const [selectedVersionType, setSelectedVersionType] =
    useState<VersionType>("release");
  const [minecraftVersions, setMinecraftVersions] = useState<
    MinecraftVersion[]
  >([]);
  const [filteredVersions, setFilteredVersions] = useState<string[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [isLoadingLoaderVersions, setIsLoadingLoaderVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchMinecraftVersions() {
      try {
        setIsLoadingVersions(true);
        setError(null);
        const result = await invoke<{ versions: MinecraftVersion[] }>(
          "get_minecraft_versions",
        );
        setMinecraftVersions(result.versions);
      } catch (err) {
        console.error("Failed to fetch Minecraft versions:", err);
        setError(
          `Failed to fetch Minecraft versions: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingVersions(false);
      }
    }

    fetchMinecraftVersions();
  }, []);

  useEffect(() => {
    if (minecraftVersions.length > 0) {
      const filtered = minecraftVersions
        .filter((version) => version.type === selectedVersionType)
        .filter((version) =>
          searchQuery
            ? version.id.toLowerCase().includes(searchQuery.toLowerCase())
            : true,
        )
        .map((version) => version.id);
      setFilteredVersions(filtered);
    }
  }, [minecraftVersions, selectedVersionType, searchQuery]);

  useEffect(() => {
    async function fetchLoaderVersions() {
      if (!editedProfile.game_version || editedProfile.loader === "vanilla") {
        setLoaderVersions([]);
        return;
      }

      try {
        setIsLoadingLoaderVersions(true);
        setError(null);
        let versions: string[] = [];

        switch (editedProfile.loader) {
          case "fabric":
            const fabricResult = await invoke<{ loader_version: string }[]>(
              "get_fabric_loader_versions",
              {
                minecraftVersion: editedProfile.game_version,
              },
            );
            versions = fabricResult.map((v) => v.loader_version);
            break;
          case "forge":
            versions = await invoke<string[]>("get_forge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
          case "quilt":
            const quiltResult = await invoke<{ loader_version: string }[]>(
              "get_quilt_loader_versions",
              {
                minecraftVersion: editedProfile.game_version,
              },
            );
            versions = quiltResult.map((v) => v.loader_version);
            break;
          case "neoforge":
            versions = await invoke<string[]>("get_neoforge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
        }

        setLoaderVersions(versions);
      } catch (err) {
        console.error(`Failed to fetch ${editedProfile.loader} versions:`, err);
        setError(
          `Failed to fetch ${editedProfile.loader} versions: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingLoaderVersions(false);
      }
    }

    fetchLoaderVersions();
  }, [editedProfile.game_version, editedProfile.loader]);

  function isModLoaderCompatible(
    loader: string,
    minecraftVersion: string,
  ): boolean {
    if (loader === "vanilla") return true;

    switch (loader) {
      case "fabric":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "forge":
        return true;
      case "quilt":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "neoforge":
        return isVersionNewerOrEqual(minecraftVersion, "1.20.1");
      default:
        return false;
    }
  }

  function isVersionNewerOrEqual(
    version: string,
    baseVersion: string,
  ): boolean {
    const parseVersion = (v: string) => {
      const parts = v.split(".");
      return {
        major: Number.parseInt(parts[0]) || 0,
        minor: Number.parseInt(parts[1]) || 0,
        patch: Number.parseInt(parts[2]) || 0,
      };
    };

    const v1 = parseVersion(version);
    const v2 = parseVersion(baseVersion);

    if (v1.major !== v2.major) return v1.major > v2.major;
    if (v1.minor !== v2.minor) return v1.minor > v2.minor;
    return v1.patch >= v2.patch;
  }

  return (
    <div className="space-y-6">
      <StatusMessage type="error" message={error} />

      <FormSection>
        <FormField label="currently installed">
          <div className="bg-black/30 backdrop-blur-md border-2 border-white/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/40 flex items-center justify-center">
                <Icon
                  icon="pixel:grid-solid"
                  className="w-6 h-6 text-white/70"
                />
              </div>
              <div>
                <div className="text-white font-minecraft text-lg lowercase">
                  minecraft {editedProfile.game_version}
                </div>
                <div className="text-white/70 text-base lowercase">
                  {editedProfile.loader === "vanilla"
                    ? "vanilla"
                    : `${editedProfile.loader} ${editedProfile.loader_version || ""}`}
                </div>
              </div>
            </div>
            <Button variant="secondary">repair</Button>
          </div>
        </FormField>
      </FormSection>

      <FormSection>
        <FormField label="version type">
          <div className="flex flex-wrap bg-black/30 backdrop-blur-md border-2 border-white/30 mb-4">
            <TabButton
              label="release"
              isActive={selectedVersionType === "release"}
              onClick={() => setSelectedVersionType("release")}
            />
            <TabButton
              label="snapshot"
              isActive={selectedVersionType === "snapshot"}
              onClick={() => setSelectedVersionType("snapshot")}
            />
            <TabButton
              label="old-beta"
              isActive={selectedVersionType === "old-beta"}
              onClick={() => setSelectedVersionType("old-beta")}
            />
            <TabButton
              label="old-alpha"
              isActive={selectedVersionType === "old-alpha"}
              onClick={() => setSelectedVersionType("old-alpha")}
            />
          </div>
        </FormField>

        <FormField label="game version">
          <div className="mb-3">
            <div className="relative">
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search versions..."
                className="pl-10"
              />
              <Icon
                icon="pixel:search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={() => setSearchQuery("")}
                >
                  <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            {isLoadingVersions ? (
              <div className="bg-black/30 backdrop-blur-md border-2 border-white/30 p-4 text-white/70 text-center">
                <LoadingIndicator message="Loading versions..." />
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto custom-scrollbar bg-black/30 backdrop-blur-md border-2 border-white/30">
                {filteredVersions.length === 0 ? (
                  <div className="p-4 text-white/70 text-center">
                    No versions found matching your search
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
                    {filteredVersions.map((version) => (
                      <button
                        key={version}
                        className={`py-2 px-3 font-minecraft text-center text-sm lowercase ${
                          editedProfile.game_version === version
                            ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                            : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white"
                        }`}
                        onClick={() => {
                          const newVersion = version;
                          const currentLoader = editedProfile.loader;

                          // Check if the current loader is compatible with the new version
                          const isCompatible = isModLoaderCompatible(
                            currentLoader,
                            newVersion,
                          );

                          updateProfile({
                            game_version: newVersion,
                            loader: isCompatible ? currentLoader : "vanilla",
                            loader_version: isCompatible
                              ? editedProfile.loader_version
                              : null,
                          });
                        }}
                      >
                        {version}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </FormField>
      </FormSection>

      <FormSection>
        <FormField label="platform">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <ModLoaderButton
              name="vanilla"
              icon="/icons/minecraft.png"
              isSelected={editedProfile.loader === "vanilla"}
              isCompatible={true}
              onClick={() =>
                updateProfile({ loader: "vanilla", loader_version: null })
              }
            />

            <ModLoaderButton
              name="fabric"
              icon="/icons/fabric.png"
              isSelected={editedProfile.loader === "fabric"}
              isCompatible={isModLoaderCompatible(
                "fabric",
                editedProfile.game_version,
              )}
              onClick={() => {
                if (
                  isModLoaderCompatible("fabric", editedProfile.game_version)
                ) {
                  updateProfile({
                    loader: "fabric",
                    loader_version: null,
                  });
                }
              }}
            />

            <ModLoaderButton
              name="forge"
              icon="/icons/forge.png"
              isSelected={editedProfile.loader === "forge"}
              isCompatible={isModLoaderCompatible(
                "forge",
                editedProfile.game_version,
              )}
              onClick={() => {
                if (
                  isModLoaderCompatible("forge", editedProfile.game_version)
                ) {
                  updateProfile({
                    loader: "forge",
                    loader_version: null,
                  });
                }
              }}
            />

            <ModLoaderButton
              name="quilt"
              icon="/icons/quilt.png"
              isSelected={editedProfile.loader === "quilt"}
              isCompatible={isModLoaderCompatible(
                "quilt",
                editedProfile.game_version,
              )}
              onClick={() => {
                if (
                  isModLoaderCompatible("quilt", editedProfile.game_version)
                ) {
                  updateProfile({
                    loader: "quilt",
                    loader_version: null,
                  });
                }
              }}
            />

            <ModLoaderButton
              name="neoforge"
              icon="/icons/neoforge.png"
              isSelected={editedProfile.loader === "neoforge"}
              isCompatible={isModLoaderCompatible(
                "neoforge",
                editedProfile.game_version,
              )}
              onClick={() => {
                if (
                  isModLoaderCompatible("neoforge", editedProfile.game_version)
                ) {
                  updateProfile({
                    loader: "neoforge",
                    loader_version: null,
                  });
                }
              }}
            />
          </div>
        </FormField>

        {editedProfile.loader !== "vanilla" && (
          <FormField label={`${editedProfile.loader} version`}>
            {isLoadingLoaderVersions ? (
              <LoadingIndicator
                message={`Loading ${editedProfile.loader} versions...`}
              />
            ) : loaderVersions.length > 0 ? (
              <SelectInput
                value={editedProfile.loader_version || ""}
                onChange={(value) => updateProfile({ loader_version: value })}
                options={[
                  { value: "", label: "Select a version" },
                  ...loaderVersions.map((version) => ({
                    value: version,
                    label: version,
                  })),
                ]}
              />
            ) : (
              <div className="bg-black/30 backdrop-blur-md border-2 border-white/30 p-4 text-white/70 text-center">
                No {editedProfile.loader} versions available for Minecraft{" "}
                {editedProfile.game_version}
              </div>
            )}
          </FormField>
        )}
      </FormSection>

      <div className="flex flex-wrap gap-4">
        <Button variant="primary">install</Button>
        <Button variant="secondary">reset to current</Button>
      </div>
    </div>
  );
}
