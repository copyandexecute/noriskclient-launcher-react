"use client";

import type { VersionType } from "../../../data/versions-data";
import { TabButton } from "../../ui/TabButton";

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
  return (
    <div className="space-y-5 select-none">
      <div className="flex flex-wrap bg-black/30 backdrop-blur-md border-2 border-white/30 rounded-lg overflow-hidden">
        <TabButton
          label="release"
          isActive={selectedVersionType === "release"}
          onClick={() => onVersionTypeSelect("release")}
        />
        <TabButton
          label="snapshot"
          isActive={selectedVersionType === "snapshot"}
          onClick={() => onVersionTypeSelect("snapshot")}
        />
        <TabButton
          label="old-beta"
          isActive={selectedVersionType === "old-beta"}
          onClick={() => onVersionTypeSelect("old-beta")}
        />
        <TabButton
          label="old-alpha"
          isActive={selectedVersionType === "old-alpha"}
          onClick={() => onVersionTypeSelect("old-alpha")}
        />
      </div>

      <div className="h-[320px] overflow-y-auto custom-scrollbar border-2 border-white/30 bg-black/30 backdrop-blur-md rounded-lg p-5">
        {versions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/70 font-minecraft text-lg tracking-wide">
              no versions available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {versions.map((version) => (
              <button
                key={version}
                className={`py-3 px-4 font-minecraft text-center lowercase tracking-wide rounded-md transition-all duration-200 ${
                  selectedVersion === version
                    ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                    : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white hover:border-white/30"
                }`}
                onClick={() => onVersionSelect(version)}
              >
                {version}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionSelector;
