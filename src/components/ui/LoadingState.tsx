"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "inline" | "overlay";
}

export function LoadingState({
  message = "loading...",
  className,
  size = "md",
  variant = "default",
}: LoadingStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const sizeConfig = {
    sm: {
      container: "p-4",
      spinner: "w-8 h-8",
      text: "text-base",
    },
    md: {
      container: "p-6",
      spinner: "w-12 h-12",
      text: "text-xl",
    },
    lg: {
      container: "p-8",
      spinner: "w-16 h-16",
      text: "text-2xl",
    },
  };

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

    if (spinnerRef.current) {
      gsap.to(spinnerRef.current, {
        rotation: 360,
        repeat: -1,
        duration: 1.5,
        ease: "linear",
      });

      gsap.to(spinnerRef.current, {
        scale: 1.1,
        repeat: -1,
        yoyo: true,
        duration: 0.8,
        ease: "sine.inOut",
      });
    }
  }, []);

  if (variant === "inline") {
    return (
      <div
        ref={containerRef}
        className={cn("flex items-center gap-3", className)}
      >
        <div
          ref={spinnerRef}
          className={cn(
            "flex-shrink-0 text-white",
            size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5",
          )}
          style={{ color: accentColor.value }}
        >
          <Icon icon="solar:refresh-bold" className="w-full h-full" />
        </div>
        {message && (
          <p
            className={cn(
              "font-minecraft text-white lowercase",
              size === "sm"
                ? "text-sm"
                : size === "lg"
                  ? "text-xl"
                  : "text-base",
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div
        ref={containerRef}
        className={cn(
          "fixed inset-0 flex flex-col items-center justify-center z-50",
          "backdrop-blur-sm bg-black/50",
          className,
        )}
      >
        <div
          ref={spinnerRef}
          className={cn("mb-4 text-white", sizeConfig[size].spinner)}
          style={{ color: accentColor.value }}
        >
          <Icon icon="solar:refresh-bold" className="w-full h-full" />
        </div>
        {message && (
          <p
            className={cn(
              "font-minecraft text-white lowercase",
              sizeConfig[size].text,
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg",
        "border-2 border-b-4 shadow-md",
        sizeConfig[size].container,
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
        ref={spinnerRef}
        className={cn("mb-4 text-white", sizeConfig[size].spinner)}
        style={{ color: accentColor.value }}
      >
        <Icon icon="solar:refresh-bold" className="w-full h-full" />
      </div>

      <p
        className={cn(
          "font-minecraft text-white lowercase",
          sizeConfig[size].text,
        )}
      >
        {message}
      </p>
    </div>
  );
}
