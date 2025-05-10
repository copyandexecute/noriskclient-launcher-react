"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "loading...",
  className,
}: LoadingStateProps) {
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

      const spinner = containerRef.current.querySelector(".spinner");
      if (spinner) {
        gsap.to(spinner, {
          rotation: 360,
          repeat: -1,
          duration: 1.5,
          ease: "linear",
        });
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg",
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
      <div className="spinner w-16 h-16 mb-4 flex items-center justify-center text-white">
        <Icon icon="solar:refresh-bold" className="w-16 h-16 animate-spin" />
      </div>
      <p className="text-xl font-minecraft text-white lowercase">{message}</p>
    </div>
  );
}
