"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { ModLoader, Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "../../../store/useThemeStore";
import { Select } from "../../ui/Select";

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
  const accentColor = useThemeStore((state) => state.accentColor);

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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-minecraft text-white mb-3 lowercase">
          mod loader
        </h2>
        <p className="text-xl text-white/70 font-minecraft tracking-wide">
          Choose a mod loader for your Minecraft profile. Some loaders may not
          be compatible with Minecraft {profile.game_version}.
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ModLoaderCard
            name="vanilla"
            icon="/icons/minecraft.png"
            isSelected={profile.loader === "vanilla"}
            isCompatible={true}
            onClick={() => handleSelectModLoader("vanilla")}
            description="Pure Minecraft without mods"
          />

          <ModLoaderCard
            name="fabric"
            icon="/icons/fabric.png"
            isSelected={profile.loader === "fabric"}
            isCompatible={compatibility.fabric}
            onClick={() => handleSelectModLoader("fabric")}
            description="Lightweight mod loader"
          />

          <ModLoaderCard
            name="forge"
            icon="/icons/forge.png"
            isSelected={profile.loader === "forge"}
            isCompatible={compatibility.forge}
            onClick={() => handleSelectModLoader("forge")}
            description="Classic mod loader"
          />

          <ModLoaderCard
            name="quilt"
            icon="/icons/quilt.png"
            isSelected={profile.loader === "quilt"}
            isCompatible={compatibility.quilt}
            onClick={() => handleSelectModLoader("quilt")}
            description="Fork of Fabric with more features"
          />

          <ModLoaderCard
            name="neoforge"
            icon="/icons/neoforge.png"
            isSelected={profile.loader === "neoforge"}
            isCompatible={compatibility.neoforge}
            onClick={() => handleSelectModLoader("neoforge")}
            description="Modern fork of Forge"
          />
        </div>
      </div>

      {profile.loader !== "vanilla" && (
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
            <label className="block text-2xl font-minecraft text-white mb-4 lowercase">{`${profile.loader} version`}</label>
            {loading ? (
              <div className="flex items-center gap-2 text-white/70">
                <Icon
                  icon="solar:refresh-bold"
                  className="w-5 h-5 animate-spin"
                />
                <span className="font-minecraft text-xl">
                  Loading {profile.loader} versions...
                </span>
              </div>
            ) : error ? (
              <div className="text-red-400 font-minecraft text-xl">{error}</div>
            ) : (
              <Select
                value={profile.loader_version || ""}
                onChange={(value) => updateProfile({ loader_version: value })}
                options={
                  loaderVersions.length === 0
                    ? [{ value: "", label: "No versions available" }]
                    : loaderVersions.map((version) => ({
                        value: version,
                        label: version,
                      }))
                }
                disabled={loaderVersions.length === 0}
              />
            )}
          </div>
        </div>
      )}

      {profile.loader !== "vanilla" && profile.loader_version && (
        <div
          className="p-6 rounded-lg border-2 border-b-4 flex items-center gap-4"
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <div
            className="w-12 h-12 flex items-center justify-center rounded-md overflow-hidden"
            style={{
              backgroundColor: `${accentColor.value}30`,
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: `${accentColor.value}60`,
            }}
          >
            <img
              src={`/icons/${profile.loader}.png`}
              alt={profile.loader}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icons/minecraft.png";
              }}
            />
          </div>
          <div>
            <div className="text-2xl text-white font-minecraft tracking-wide lowercase">
              {profile.loader} {profile.loader_version}
            </div>
            <div className="text-lg text-white/70 tracking-wide lowercase">
              for minecraft {profile.game_version}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModLoaderCardProps {
  name: ModLoader;
  icon: string;
  isSelected: boolean;
  isCompatible: boolean;
  onClick: () => void;
  description: string;
}

function ModLoaderCard({
  name,
  icon,
  isSelected,
  isCompatible,
  onClick,
  description,
}: ModLoaderCardProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <button
      className={`p-4 flex flex-col items-center justify-center rounded-lg border-2 border-b-4 transition-all duration-200 ${
        isSelected
          ? "bg-white/20 text-white border-white/50"
          : isCompatible
            ? "bg-black/20 text-white/70 border-white/20 hover:bg-black/30 hover:text-white"
            : "bg-black/10 text-white/30 border-white/10 cursor-not-allowed"
      }`}
      style={{
        borderBottomColor: isSelected ? accentColor.value : "transparent",
      }}
      onClick={isCompatible ? onClick : undefined}
      disabled={!isCompatible}
    >
      <img
        src={icon || "/placeholder.svg"}
        alt={name}
        className="w-12 h-12 mb-3 object-contain"
        style={{ opacity: isCompatible ? 1 : 0.5 }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/icons/minecraft.png";
        }}
      />
      <span className="font-minecraft text-xl lowercase mb-1">{name}</span>
      <span className="text-sm text-white/60 text-center">{description}</span>
      {!isCompatible && (
        <span className="text-sm text-red-400 mt-1">not compatible</span>
      )}
    </button>
  );
}
