"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface EmptyStateProps {
  icon?: string;
  message: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  fullHeight?: boolean;
  compact?: boolean;
}

export function EmptyState({
  icon = "solar:info-circle-bold",
  message,
  description,
  className,
  action,
  fullHeight = true,
  compact = false,
}: EmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
        },
      );
    }

    if (iconRef.current) {
      // Initial animation
      gsap.fromTo(
        iconRef.current,
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          ease: "elastic.out(1.2, 0.5)",
        },
      );

      // Continuous subtle animation - smaller movement to prevent layout shifts
      gsap.to(iconRef.current, {
        y: -3,
        scale: 1.03,
        repeat: -1,
        yoyo: true,
        duration: 1.5,
        ease: "sine.inOut",
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg backdrop-blur-sm",
        compact ? "p-4" : "p-8",
        fullHeight ? "h-full w-full" : "auto",
        className,
      )}
      style={{
        backgroundColor: `${accentColor.value}10`,
      }}
    >
      <div
        ref={iconRef}
        className={cn(
          "flex items-center justify-center text-white mb-4",
          compact ? "w-16 h-16" : "w-20 h-20",
        )}
        style={{ color: accentColor.value }}
      >
        <Icon icon={icon} className={compact ? "w-16 h-16" : "w-20 h-20"} />
      </div>

      <p
        className={cn(
          "font-minecraft text-white lowercase text-center mb-2",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {message}
      </p>

      {description && (
        <p
          className={cn(
            "font-minecraft text-white/70 lowercase text-center max-w-md",
            compact ? "text-base mb-4" : "text-lg mb-6",
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
