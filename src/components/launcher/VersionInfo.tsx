"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import Image from "../ui/Image";

interface VersionInfoProps {
  version: {
    id: string;
    label: string;
    icon?: string;
    isCustom?: boolean;
  };
  isLaunching: boolean;
  className?: string;
}

export function VersionInfo({
  version,
  isLaunching,
  className,
}: VersionInfoProps) {
  const versionInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(versionInfoRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.5,
        delay: 0.2,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={versionInfoRef} className={className}>
      <div className="flex items-center gap-3 bg-black/50 backdrop-blur-lg px-4 py-2 border-2 border-white/20 shadow-[0_0_12px_rgba(0,0,0,0.3)]">
        {version.isCustom ? (
          <div className="w-9 h-9 relative">
            <Image
              src="/logo.png"
              alt="NoRisk"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center">
            <Icon icon="pixel:grid-solid" className="w-8 h-8" />
          </div>
        )}
        <span className="text-2xl font-minecraft text-white uppercase">
          {isLaunching ? "LAUNCHING..." : version.label}
        </span>
      </div>
    </div>
  );
}
