"use client";

import { cn } from "../../lib/utils";
import { Icon } from "@iconify/react";

interface Version {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
  profileId?: string;
}

interface VersionSelectorProps {
  versions: Version[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
}

export function VersionSelector({
  versions,
  selectedVersion,
  onVersionChange,
}: VersionSelectorProps) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-3 bg-black/70 backdrop-blur-lg border-2 border-white/30 shadow-xl z-10 max-h-80 overflow-y-auto custom-scrollbar">
      {versions.length === 0 ? (
        <div className="text-center p-4 text-white/60 font-minecraft text-2xl lowercase tracking-wide select-none">
          no profiles available
        </div>
      ) : (
        versions.map((version) => (
          <button
            key={version.id}
            className={cn(
              "flex items-center w-full px-6 whitespace-nowrap py-4 text-left transition-all duration-200 font-minecraft tracking-wider select-none",
              version.id === selectedVersion
                ? "bg-white/25 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] inset-0 border-l-4 border-l-white"
                : "text-[#ABABAB] hover:bg-white/15 hover:text-white",
            )}
            onClick={() => onVersionChange(version.id)}
          >
            <VersionIcon version={version} />
            <SelectionIndicator isSelected={version.id === selectedVersion} />
            <span className="text-2xl lowercase tracking-wide">
              {version.label}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

interface VersionIconProps {
  version: Version;
}

function VersionIcon({ version }: VersionIconProps) {
  return (
    <div className="w-8 h-8 mr-4 relative flex items-center justify-center">
      {version.isCustom ? (
        <img
          src="/logo.png"
          alt="NoRisk"
          width={32}
          height={32}
          className="object-contain"
        />
      ) : version.icon ? (
        <Icon icon="pixel:grid-solid" className="w-7 h-7" />
      ) : (
        <div className="w-8 h-8" />
      )}
    </div>
  );
}

interface SelectionIndicatorProps {
  isSelected: boolean;
}

function SelectionIndicator({ isSelected }: SelectionIndicatorProps) {
  return isSelected ? (
    <div className="w-7 h-7 mr-3 flex items-center justify-center">
      <Icon icon="pixel:check-solid" className="w-6 h-6" />
    </div>
  ) : (
    <div className="w-7 h-7 mr-3" />
  );
}
