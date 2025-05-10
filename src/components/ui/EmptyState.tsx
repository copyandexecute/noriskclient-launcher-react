"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface EmptyStateProps {
  icon?: string;
  message: string;
  className?: string;
}

export function EmptyState({
  icon = "solar:info-circle-bold",
  message,
  className,
}: EmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
        },
      );

      const iconElement = containerRef.current.querySelector(".icon");
      if (iconElement) {
        gsap.to(iconElement, {
          scale: 1.1,
          repeat: -1,
          yoyo: true,
          duration: 1.5,
          ease: "sine.inOut",
        });
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center h-full w-full p-8 rounded-lg",
        "border-2 border-b-4 shadow-md",
        className,
      )}
      style={{
        backgroundColor: `${accentColor.value}10`,
        borderColor: `${accentColor.value}60`,
        borderBottomColor: accentColor.value,
        boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
      }}
    >
      <div className="icon w-32 h-32 mb-6 flex items-center justify-center text-white">
        <Icon icon={icon} className="w-32 h-32" />
      </div>
      <p className="text-2xl font-minecraft text-white lowercase text-center">
        {message}
      </p>
    </div>
  );
}
