"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";

interface WizardSummaryProps {
  profile: Partial<Profile>;
  error: string | null;
}

export function WizardSummary({ profile, error }: WizardSummaryProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-minecraft text-white mb-3 lowercase">
          profile summary
        </h2>
        <p className="text-xl text-white/70 font-minecraft tracking-wide">
          Review your profile settings before creating it.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg border-2 border-red-500 bg-red-500/20 text-red-400 font-minecraft text-xl">
          {error}
        </div>
      )}

      <div
        className="p-6 rounded-lg border-2 border-b-4 space-y-6"
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 flex items-center justify-center rounded-md"
            style={{
              backgroundColor: `${accentColor.value}30`,
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: `${accentColor.value}60`,
            }}
          >
            <Icon icon="solar:user-bold" className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-3xl text-white font-minecraft tracking-wide lowercase">
              {profile.name}
            </h3>
            {profile.description && (
              <p className="text-xl text-white/70 font-minecraft tracking-wide mt-1">
                {profile.description}
              </p>
            )}
            {profile.group && (
              <div className="mt-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-minecraft text-white/80">
                  {profile.group}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-lg border-2 border-b-4"
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <h3 className="text-2xl text-white font-minecraft tracking-wide lowercase mb-4">
            minecraft version
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-md"
              style={{
                backgroundColor: `${accentColor.value}30`,
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: `${accentColor.value}60`,
              }}
            >
              <Icon icon="solar:widget-bold" className="w-6 h-6 text-white" />
            </div>
            <div className="text-xl text-white font-minecraft tracking-wide lowercase">
              minecraft {profile.game_version}
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-lg border-2 border-b-4"
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <h3 className="text-2xl text-white font-minecraft tracking-wide lowercase mb-4">
            mod loader
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-md overflow-hidden"
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
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icons/minecraft.png";
                }}
              />
            </div>
            <div className="text-xl text-white font-minecraft tracking-wide lowercase">
              {profile.loader === "vanilla"
                ? "vanilla (no mods)"
                : `${profile.loader} ${profile.loader_version || ""}`}
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-lg border-2 border-b-4"
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <h3 className="text-2xl text-white font-minecraft tracking-wide lowercase mb-4">
            memory allocation
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-md"
              style={{
                backgroundColor: `${accentColor.value}30`,
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: `${accentColor.value}60`,
              }}
            >
              <Icon
                icon="solar:ssd-square-bold"
                className="w-6 h-6 text-white"
              />
            </div>
            <div className="text-xl text-white font-minecraft tracking-wide lowercase">
              {profile.settings?.memory?.max} MB (
              {(profile.settings?.memory?.max || 0) / 1024} GB)
            </div>
          </div>
        </div>

        {profile.selected_norisk_pack_id && (
          <div
            className="p-6 rounded-lg border-2 border-b-4"
            style={{
              backgroundColor: `${accentColor.value}15`,
              borderColor: `${accentColor.value}60`,
              borderBottomColor: accentColor.value,
              boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
            }}
          >
            <h3 className="text-2xl text-white font-minecraft tracking-wide lowercase mb-4">
              norisk client pack
            </h3>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center rounded-md"
                style={{
                  backgroundColor: `${accentColor.value}30`,
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: `${accentColor.value}60`,
                }}
              >
                <Icon icon="solar:shield-bold" className="w-6 h-6 text-white" />
              </div>
              <div className="text-xl text-white font-minecraft tracking-wide lowercase">
                {profile.selected_norisk_pack_id}
              </div>
            </div>
          </div>
        )}
      </div>

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
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{
            backgroundColor: `${accentColor.value}30`,
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: `${accentColor.value}60`,
          }}
        >
          <Icon icon="solar:info-circle-bold" className="w-7 h-7 text-white" />
        </div>
        <div className="text-xl text-white/80 font-minecraft tracking-wide">
          Click "Create Profile" to finish and create your new Minecraft
          profile.
        </div>
      </div>
    </div>
  );
}
