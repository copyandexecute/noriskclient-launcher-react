"use client";

import { useEffect, useState } from "react";
import { VersionSelector } from "./VersionSelector";
import type { VersionType } from "../../../data/versions-data.ts";
import type { Profile } from "../../../types/profile";
import type { MinecraftVersion } from "../../../types/minecraft";
import { SectionTitle } from "../../ui/SectionTitle";

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

  useEffect(() => {
    const filtered = minecraftVersions.filter((v) => {
      if (selectedVersionType === "release") return v.type === "release";
      if (selectedVersionType === "snapshot") return v.type === "snapshot";
      if (selectedVersionType === "old-beta") return v.type === "old_beta";
      if (selectedVersionType === "old-alpha") return v.type === "old_alpha";
      return false;
    });

    setFilteredVersions(filtered);

    if (
      filtered.length > 0 &&
      (!profile.game_version ||
        !filtered.some((v) => v.id === profile.game_version))
    ) {
      updateProfile({ game_version: filtered[0].id });
    }
  }, [selectedVersionType, minecraftVersions, profile.game_version]);

  const handleVersionChange = (version: string) => {
    updateProfile({ game_version: version });
  };

  return (
    <div className="space-y-10 select-none">
      <SectionTitle
        title="select minecraft version"
        description="choose the minecraft version for your profile. this will determine which mod loaders are available."
      />

      <VersionSelector
        selectedVersion={profile.game_version || ""}
        onVersionSelect={handleVersionChange}
        selectedVersionType={selectedVersionType}
        onVersionTypeSelect={setSelectedVersionType}
        versions={filteredVersions.map((v) => v.id)}
        versionButton={(
          version: string,
          selectedVersion: string,
          onVersionSelect: (version: string) => void,
        ) => (
          <button
            key={version}
            className={`py-4 px-5 font-minecraft text-center text-2xl lowercase tracking-wide rounded-md transition-all duration-200 ${
              selectedVersion === version
                ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white hover:border-white/30"
            }`}
            onClick={() => onVersionSelect(version)}
          >
            {version}
          </button>
        )}
        emptyState={() => (
          <div className="flex items-center justify-center h-full">
            <p className="text-2xl text-white/70 font-minecraft tracking-wide select-none">
              no versions available
            </p>
          </div>
        )}
      />
    </div>
  );
}

export default VersionStep;
