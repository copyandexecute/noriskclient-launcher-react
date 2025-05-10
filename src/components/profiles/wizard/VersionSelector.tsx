"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchInput } from "../../ui/SearchInput";
import { Label } from "../../ui/Label";

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";

interface VersionSelectorProps {
  selectedVersion: string;
  onVersionSelect: (version: string) => void;
  selectedVersionType: VersionType;
  onVersionTypeSelect: (type: VersionType) => void;
  versions: string[];
}

export function VersionSelector({
  selectedVersion,
  onVersionSelect,
  selectedVersionType,
  onVersionTypeSelect,
  versions,
}: VersionSelectorProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVersions = versions.filter((version) =>
    searchQuery
      ? version.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6 select-none">
      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            version type
          </h3>
          <div className="flex flex-wrap">
            {["release", "snapshot", "old-beta", "old-alpha"].map((type) => (
              <Label
                key={type}
                variant={selectedVersionType === type ? "default" : "ghost"}
                size="md"
                className="cursor-pointer mr-2 mb-2 text-xl"
                onClick={() => onVersionTypeSelect(type as VersionType)}
              >
                {type}
              </Label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            game version
          </h3>
          <div className="mb-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="search versions..."
              className="w-full text-2xl py-3"
            />
          </div>

          <div className="flex-1 relative">
            <div
              className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border-2 border-b-4"
              style={{
                backgroundColor: `${accentColor.value}10`,
                borderColor: `${accentColor.value}60`,
                borderBottomColor: accentColor.value,
              }}
            >
              {filteredVersions.length === 0 ? (
                <div className="p-4 text-2xl text-white/70 text-center select-none">
                  no versions found matching your search
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
                  {filteredVersions.map((version) => (
                    <Label
                      key={version}
                      variant={
                        selectedVersion === version ? "default" : "ghost"
                      }
                      size="md"
                      className="cursor-pointer text-center text-xl"
                      onClick={() => onVersionSelect(version)}
                    >
                      {version}
                    </Label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedVersion && (
        <div
          className="p-4 rounded-lg border-2 border-b-4 flex items-center gap-4"
          style={{
            backgroundColor: `${accentColor.value}10`,
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
              selected: minecraft {selectedVersion}
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
