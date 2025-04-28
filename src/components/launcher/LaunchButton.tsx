"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import Image from "../ui/Image";

interface Version {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
}

interface LaunchButtonProps {
  versions: Version[];
  defaultVersion?: string;
  className?: string;
  onLaunch?: (version: string) => void;
  onVersionChange?: (version: string) => void;
}

export function LaunchButton({
  versions,
  defaultVersion,
  className,
  onLaunch,
  onVersionChange,
}: LaunchButtonProps) {
  const [selectedVersion, setSelectedVersion] = useState(
    defaultVersion || versions[0]?.id,
  );
  const [isLaunching, setIsLaunching] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const handleLaunch = () => {
    setIsLaunching(true);

    if (onLaunch) {
      onLaunch(selectedVersion);
    }

    setTimeout(() => {
      setIsLaunching(false);
    }, 2000);
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    setShowVersions(false);

    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const toggleVersionSelect = () => {
    setShowVersions(!showVersions);
  };

  return (
    <div className={cn("relative flex justify-center w-full", className)}>
      <div className="flex items-center gap-3 max-w-md w-full">
        <button
          ref={buttonRef}
          onClick={handleLaunch}
          disabled={isLaunching}
          className={cn(
            "relative flex-1 py-4 px-12 font-minecraft tracking-wider text-2xl font-bold uppercase",
            "bg-black/60 backdrop-blur-lg text-white",
            "border-2 border-white/40 transition-all duration-300",
            "hover:bg-black/70 hover:border-white/60",
            "flex items-center justify-center gap-4",
            "disabled:opacity-80",
            "shadow-[0_0_20px_rgba(0,0,0,0.6)] hover:shadow-[0_0_25px_rgba(0,0,0,0.7)]",
            "text-shadow",
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-15 overflow-hidden pointer-events-none"></div>
          <div ref={iconRef} className="transition-transform relative z-10">
            {isLaunching ? (
              <Icon
                icon="pixel:spinner-solid"
                className="w-9 h-9 animate-spin"
              />
            ) : (
              <Icon icon="pixel:startups" className="w-9 h-9" />
            )}
          </div>
          <span className="relative z-10 whitespace-nowrap">
            {isLaunching ? "LAUNCHING..." : "LAUNCH GAME"}
          </span>
        </button>

        <button
          onClick={toggleVersionSelect}
          className={cn(
            "h-full py-4 px-5 font-minecraft tracking-wider uppercase",
            "bg-black/60 backdrop-blur-lg text-white border-2 border-white/40",
            "hover:bg-black/70 hover:border-white/60 transition-all duration-300",
            "flex items-center justify-center",
            "shadow-[0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(0,0,0,0.7)]",
            "text-shadow",
          )}
        >
          <Icon icon="pixel:chevron-down-solid" className="w-8 h-8" />
        </button>
      </div>

      {showVersions && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-black/70 backdrop-blur-lg border-2 border-white/30 shadow-xl z-10 max-h-80 overflow-y-auto custom-scrollbar">
          {versions.map((version) => (
            <button
              key={version.id}
              className={cn(
                "flex items-center w-full px-6 whitespace-nowrap py-4 text-left transition-all duration-200 font-minecraft tracking-wider",
                version.id === selectedVersion
                  ? "bg-white/25 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] inset-0 border-l-4 border-l-white"
                  : "text-[#ABABAB] hover:bg-white/15 hover:text-white",
              )}
              onClick={() => handleVersionChange(version.id)}
            >
              {version.isCustom ? (
                <div className="w-8 h-8 mr-4 relative">
                  <Image
                    src="/logo.png"
                    alt="NoRisk"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
              ) : version.icon ? (
                <div className="w-8 h-8 mr-4 flex items-center justify-center">
                  <Icon icon="pixel:grid-solid" className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-8 h-8 mr-4" />
              )}

              {version.id === selectedVersion ? (
                <div className="w-7 h-7 mr-3 flex items-center justify-center">
                  <Icon icon="pixel:check-solid" className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-7 h-7 mr-3" />
              )}
              <span className="text-xl">{version.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
