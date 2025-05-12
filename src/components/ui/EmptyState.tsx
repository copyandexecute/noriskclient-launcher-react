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
}

export function EmptyState({
  icon = "solar:info-circle-bold",
  message,
  description,
  className,
  action,
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

      gsap.to(iconRef.current, {
        y: -5,
        scale: 1.05,
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
        "flex flex-col items-center justify-center p-8 rounded-lg",
        "border-2 border-b-4 shadow-md",
        className,
      )}
      style={{
        backgroundColor: `${accentColor.value}10`,
        borderColor: `${accentColor.value}60`,
        borderBottomColor: accentColor.value,
        boxShadow: `0 8px 0 rgba(0,0,0,0.2), 0 10px 15px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
        style={{ backgroundColor: `${accentColor.value}80` }}
      />

      <div
        ref={iconRef}
        className="w-20 h-20 mb-6 flex items-center justify-center text-white"
        style={{ color: accentColor.value }}
      >
        <Icon icon={icon} className="w-20 h-20" />
      </div>

      <p className="text-2xl font-minecraft text-white lowercase text-center mb-2">
        {message}
      </p>

      {description && (
        <p className="text-lg font-minecraft text-white/70 lowercase text-center mb-6 max-w-md">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
