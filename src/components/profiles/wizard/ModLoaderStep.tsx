"use client";

import { useEffect, useState } from "react";
import type { ModLoader, Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { SectionTitle } from "../../ui/SectionTitle";
import { FormField } from "../../ui/FormField";
import { ModLoaderButton } from "../../ui/ModLoaderButton";
import { SelectInput } from "../../ui/SelectInput";
import { LoadingIndicator } from "../../ui/LoadingIndicator";
import { StatusMessage } from "../../ui/StatusMessage";

interface ModLoaderStepProps {
  profile: Partial<Profile>;
  updateProfile: (data: Partial<Profile>) => void;
}

interface LoaderVersionInfo {
  loader: {
    version: string;
    stable: boolean;
  };
}

export function ModLoaderStep({ profile, updateProfile }: ModLoaderStepProps) {
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compatibility, setCompatibility] = useState<
    Record<ModLoader, boolean>
  >({
    vanilla: true,
    fabric: false,
    forge: false,
    quilt: false,
    neoforge: false,
  });

  const checkCompatibility = async () => {
    if (!profile.game_version) return;

    setLoading(true);
    setError(null);

    try {
      const newCompatibility: Record<ModLoader, boolean> = {
        vanilla: true,
        fabric: false,
        forge: false,
        quilt: false,
        neoforge: false,
      };

      try {
        const fabricVersions = await invoke<LoaderVersionInfo[]>(
          "get_fabric_loader_versions",
          {
            minecraftVersion: profile.game_version,
          },
        );
        newCompatibility.fabric = fabricVersions.length > 0;
      } catch (err) {
        console.error("Failed to check Fabric compatibility:", err);
      }

      try {
        const forgeVersions = await invoke<string[]>("get_forge_versions", {
          minecraftVersion: profile.game_version,
        });
        newCompatibility.forge = forgeVersions.length > 0;
      } catch (err) {
        console.error("Failed to check Forge compatibility:", err);
      }

      try {
        const neoforgeVersions = await invoke<string[]>(
          "get_neoforge_versions",
          {
            minecraftVersion: profile.game_version,
          },
        );
        newCompatibility.neoforge = neoforgeVersions.length > 0;
      } catch (err) {
        console.error("Failed to check NeoForge compatibility:", err);
      }

      try {
        const quiltVersions = await invoke<LoaderVersionInfo[]>(
          "get_quilt_loader_versions",
          {
            minecraftVersion: profile.game_version,
          },
        );
        newCompatibility.quilt = quiltVersions.length > 0;
      } catch (err) {
        console.error("Failed to check Quilt compatibility:", err);
      }

      setCompatibility(newCompatibility);

      if (
        profile.loader !== "vanilla" &&
        !newCompatibility[profile.loader as ModLoader]
      ) {
        updateProfile({ loader: "vanilla", loader_version: null });
      }
    } catch (err) {
      console.error("Error checking compatibility:", err);
      setError("failed to check mod loader compatibility");
    } finally {
      setLoading(false);
    }
  };

  const fetchLoaderVersions = async () => {
    if (!profile.game_version || profile.loader === "vanilla") {
      setLoaderVersions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let versions: string[] = [];

      switch (profile.loader) {
        case "fabric":
          const fabricVersions = await invoke<LoaderVersionInfo[]>(
            "get_fabric_loader_versions",
            {
              minecraftVersion: profile.game_version,
            },
          );
          versions = fabricVersions.map(
            (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
          );
          break;

        case "forge":
          versions = await invoke<string[]>("get_forge_versions", {
            minecraftVersion: profile.game_version,
          });
          break;

        case "neoforge":
          versions = await invoke<string[]>("get_neoforge_versions", {
            minecraftVersion: profile.game_version,
          });
          break;

        case "quilt":
          const quiltVersions = await invoke<LoaderVersionInfo[]>(
            "get_quilt_loader_versions",
            {
              minecraftVersion: profile.game_version,
            },
          );
          versions = quiltVersions.map(
            (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
          );
          break;
      }

      setLoaderVersions(versions);

      if (versions.length > 0 && !profile.loader_version) {
        updateProfile({ loader_version: versions[0] });
      }
    } catch (err) {
      console.error(`Failed to fetch ${profile.loader} versions:`, err);
      setError(`failed to fetch ${profile.loader} versions`);
      setLoaderVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCompatibility();
  }, [profile.game_version]);

  useEffect(() => {
    fetchLoaderVersions();
  }, [profile.loader, profile.game_version]);

  const handleSelectModLoader = (type: ModLoader) => {
    if (!compatibility[type]) return;
    updateProfile({ loader: type, loader_version: null });
  };

  return (
    <div className="space-y-8 select-none">
      <SectionTitle
        title="select mod loader"
        description="choose a mod loader for your minecraft profile. some loaders may not be compatible with the selected version."
      />

      {error && <StatusMessage type="error" message={error} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <ModLoaderButton
          name="vanilla"
          icon="/icons/minecraft.png"
          isSelected={profile.loader === "vanilla"}
          isCompatible={true}
          onClick={() => handleSelectModLoader("vanilla")}
        />

        <ModLoaderButton
          name="fabric"
          icon="/icons/fabric.png"
          isSelected={profile.loader === "fabric"}
          isCompatible={compatibility.fabric}
          onClick={() => handleSelectModLoader("fabric")}
        />

        <ModLoaderButton
          name="forge"
          icon="/icons/forge.png"
          isSelected={profile.loader === "forge"}
          isCompatible={compatibility.forge}
          onClick={() => handleSelectModLoader("forge")}
        />

        <ModLoaderButton
          name="quilt"
          icon="/icons/quilt.png"
          isSelected={profile.loader === "quilt"}
          isCompatible={compatibility.quilt}
          onClick={() => handleSelectModLoader("quilt")}
        />

        <ModLoaderButton
          name="neoforge"
          icon="/icons/neoforge.png"
          isSelected={profile.loader === "neoforge"}
          isCompatible={compatibility.neoforge}
          onClick={() => handleSelectModLoader("neoforge")}
        />
      </div>

      {profile.loader !== "vanilla" && (
        <FormField label={`${profile.loader} version`}>
          {loading ? (
            <LoadingIndicator
              message={`loading ${profile.loader} versions...`}
            />
          ) : error ? (
            <StatusMessage type="error" message={error} />
          ) : (
            <SelectInput
              value={profile.loader_version || ""}
              onChange={(value) => updateProfile({ loader_version: value })}
              options={
                loaderVersions.length === 0
                  ? [{ value: "", label: "no versions available" }]
                  : loaderVersions.map((version) => ({
                      value: version,
                      label: version,
                    }))
              }
              disabled={loaderVersions.length === 0}
              className="text-base tracking-wide"
            />
          )}
        </FormField>
      )}
    </div>
  );
}

export default ModLoaderStep;
