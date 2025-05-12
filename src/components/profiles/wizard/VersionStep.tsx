"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import type { MinecraftVersion } from "../../../types/minecraft";
import { useThemeStore } from "../../../store/useThemeStore";
import { VersionSelector } from "./VersionSelector";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";

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
  const accentColor = useThemeStore((state) => state.accentColor);
  const selectorCardRef = useRef<HTMLDivElement>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectorCardRef.current) {
      gsap.fromTo(
        selectorCardRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }

    if (summaryCardRef.current && profile.game_version) {
      gsap.fromTo(
        summaryCardRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          delay: 0.1,
        },
      );
    }
  }, [profile.game_version]);

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

      <Card ref={selectorCardRef} variant="default" className="p-6 space-y-6">
        <VersionSelector
          selectedVersion={profile.game_version || ""}
          onVersionSelect={handleVersionChange}
          selectedVersionType={selectedVersionType}
          onVersionTypeSelect={setSelectedVersionType}
          versions={filteredVersions.map((v) => v.id)}
        />
      </Card>

      {profile.game_version && (
        <Card
          ref={summaryCardRef}
          variant="default"
          className="p-6 flex items-center gap-4"
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
        </Card>
      )}
    </div>
  );
}
