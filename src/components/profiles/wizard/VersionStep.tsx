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
    <div className="space-y-6">
      <SectionTitle
        title="select minecraft version"
        description="Choose the Minecraft version for your profile. This will determine which mod loaders are available."
      />

      <VersionSelector
        selectedVersion={profile.game_version || ""}
        onVersionSelect={handleVersionChange}
        selectedVersionType={selectedVersionType}
        onVersionTypeSelect={setSelectedVersionType}
        versions={filteredVersions.map((v) => v.id)}
      />
    </div>
  );
}

export default VersionStep;
