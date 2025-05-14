"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchInput } from "../../ui/SearchInput";
import { Label } from "../../ui/Label";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils";

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
  const typeButtonsRef = useRef<HTMLDivElement>(null);
  const versionsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeButtonsRef.current) {
      gsap.fromTo(
        typeButtonsRef.current.children,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        },
      );
    }
  }, []);

  useEffect(() => {
    if (versionsGridRef.current) {
      gsap.fromTo(
        versionsGridRef.current,
        { opacity: 0.5, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        },
      );
    }
  }, [selectedVersionType, searchQuery]);

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
          <div ref={typeButtonsRef} className="flex flex-wrap">
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
            <Card
              variant="flat"
              className="max-h-48 overflow-y-auto custom-scrollbar"
            >
              {filteredVersions.length === 0 ? (
                <div className="p-4 text-2xl text-white/70 text-center select-none">
                  no versions found matching your search
                </div>
              ) : (
                <div
                  ref={versionsGridRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3"
                >
                  {filteredVersions.map((version) => (
                    <VersionButton
                      key={version}
                      version={version}
                      isSelected={selectedVersion === version}
                      onClick={() => onVersionSelect(version)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VersionButtonProps {
  version: string;
  isSelected: boolean;
  onClick: () => void;
}

function VersionButton({ version, isSelected, onClick }: VersionButtonProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buttonRef.current && isSelected) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.3,
          ease: "elastic.out(1.2, 0.4)",
        },
      );
    }
  }, [isSelected]);

  return (
    <button
      ref={buttonRef}
      className={cn(
        "py-3 px-4 font-minecraft text-xl text-center lowercase tracking-wide rounded-md transition-all duration-200",
        isSelected
          ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          : "bg-black/20 text-white/70 border-2 border-white/20 hover:bg-black/30 hover:text-white hover:border-white/30",
      )}
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
