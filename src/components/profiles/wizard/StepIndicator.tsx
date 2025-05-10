"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import type { MinecraftVersion } from "../../../types/minecraft";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchInput } from "../../ui/SearchInput";

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";

interface VersionStepProps {
  profile: Partial<Profile>;
  updateProfile: (data: Partial<Profile>) => void;
  minecraftVersions: MinecraftVersion[];
}

export function VersionStep({
  profile,
  updateProfile,
  minecraftVersions,
}: VersionStepProps) {
  const [selectedVersionType, setSelectedVersionType] =
    useState<VersionType>("release");
  const [filteredVersions, setFilteredVersions] = useState<MinecraftVersion[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const filtered = minecraftVersions
      .filter((v) => {
        if (selectedVersionType === "release") return v.type === "release";
        if (selectedVersionType === "snapshot") return v.type === "snapshot";
        if (selectedVersionType === "old-beta") return v.type === "old_beta";
        if (selectedVersionType === "old-alpha") return v.type === "old_alpha";
        return false;
      })
      .filter((v) =>
        searchQuery
          ? v.id.toLowerCase().includes(searchQuery.toLowerCase())
          : true,
      );

    setFilteredVersions(filtered);

    if (
      filtered.length > 0 &&
      (!profile.game_version ||
        !filtered.some((v) => v.id === profile.game_version))
    ) {
      updateProfile({ game_version: filtered[0].id });
    }
  }, [
    selectedVersionType,
    minecraftVersions,
    searchQuery,
    profile.game_version,
  ]);

  const handleVersionChange = (version: string) => {
    updateProfile({ game_version: version });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-minecraft text-white mb-3 lowercase">
          minecraft version
        </h2>
        <p className="text-xl text-white/70 font-minecraft tracking-wide">
          Select the Minecraft version for your profile. This will determine
          which mod loaders are available.
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
        <div className="flex flex-wrap gap-2">
          <VersionTypeButton
            type="release"
            isSelected={selectedVersionType === "release"}
            onClick={() => setSelectedVersionType("release")}
            icon="solar:star-bold"
          />
          <VersionTypeButton
            type="snapshot"
            isSelected={selectedVersionType === "snapshot"}
            onClick={() => setSelectedVersionType("snapshot")}
            icon="solar:test-tube-bold"
          />
          <VersionTypeButton
            type="old-beta"
            isSelected={selectedVersionType === "old-beta"}
            onClick={() => setSelectedVersionType("old-beta")}
            icon="solar:history-bold"
          />
          <VersionTypeButton
            type="old-alpha"
            isSelected={selectedVersionType === "old-alpha"}
            onClick={() => setSelectedVersionType("old-alpha")}
            icon="solar:clock-circle-bold"
          />
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search versions..."
              className="w-full"
            />
          </div>

          <div
            className="max-h-[320px] overflow-y-auto custom-scrollbar rounded-lg border-2"
            style={{
              backgroundColor: `${accentColor.value}10`,
              borderColor: `${accentColor.value}40`,
            }}
          >
            {filteredVersions.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-2xl text-white/70 font-minecraft tracking-wide">
                  No versions found
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {filteredVersions.map((version) => (
                  <VersionButton
                    key={version.id}
                    version={version.id}
                    isSelected={profile.game_version === version.id}
                    onClick={() => handleVersionChange(version.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {profile.game_version && (
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
            className="w-12 h-12 flex items-center justify-center rounded-md"
            style={{
              backgroundColor: `${accentColor.value}30`,
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: `${accentColor.value}60`,
            }}
          >
            <Icon icon="solar:widget-bold" className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-2xl text-white font-minecraft tracking-wide lowercase">
              selected: minecraft {profile.game_version}
            </div>
            <div className="text-lg text-white/70 tracking-wide lowercase">
              {selectedVersionType === "release"
                ? "stable release"
                : selectedVersionType === "snapshot"
                  ? "experimental snapshot"
                  : selectedVersionType === "old-beta"
                    ? "legacy beta version"
                    : "legacy alpha version"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VersionTypeButtonProps {
  type: VersionType;
  isSelected: boolean;
  onClick: () => void;
  icon: string;
}

function VersionTypeButton({
  type,
  isSelected,
  onClick,
  icon,
}: VersionTypeButtonProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <button
      className={`px-4 py-3 rounded-md font-minecraft text-xl lowercase flex items-center gap-2 transition-all duration-200 ${
        isSelected
          ? "bg-white/20 text-white border-2 border-white/50"
          : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white hover:border-white/30"
      }`}
      onClick={onClick}
      style={{
        borderBottomWidth: "4px",
        borderBottomColor: isSelected ? accentColor.value : "transparent",
      }}
    >
      <Icon icon={icon} className="w-5 h-5" />
      {type}
    </button>
  );
}

interface VersionButtonProps {
  version: string;
  isSelected: boolean;
  onClick: () => void;
}

function VersionButton({ version, isSelected, onClick }: VersionButtonProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <button
      className={`py-3 px-4 font-minecraft text-xl text-center lowercase tracking-wide rounded-md transition-all duration-200 ${
        isSelected
          ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white hover:border-white/30"
      }`}
      onClick={onClick}
      style={{
        borderBottomWidth: "4px",
        borderBottomColor: isSelected ? accentColor.value : "transparent",
      }}
    >
      {version}
    </button>
  );
}
