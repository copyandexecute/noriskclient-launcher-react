"use client";

import { useState, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "../../../lib/utils";
import type { ScreenshotInfo as ActualScreenshotInfo } from "../../../types/profile";

interface ScreenshotGridItemProps {
  screenshot: ActualScreenshotInfo;
  accentColorValue: string;
  isBackgroundAnimationEnabled?: boolean;
  animationDelay?: string;
  onClick?: () => void;
}

export function ScreenshotGridItem({
  screenshot,
  accentColorValue,
  isBackgroundAnimationEnabled,
  animationDelay,
  onClick,
}: ScreenshotGridItemProps) {
  const [imageError, setImageError] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleError = () => {
    setImageError(true);
  };

  return (
    <div
      ref={itemRef}
      onClick={onClick}
      className={cn(
        "relative w-full rounded-md overflow-hidden border-2 border-b-4 cursor-pointer aspect-video bg-black/20",
        "transition-transform transition-opacity duration-300 ease-out hover:scale-105 active:scale-95",
        isBackgroundAnimationEnabled ? "animate-fadeInUpItem" : "",
      )}
      style={{
        borderColor: `${accentColorValue}40`,
        borderBottomColor: `${accentColorValue}60`,
        animationDelay: isBackgroundAnimationEnabled ? animationDelay : undefined,
      }}
    >
      {!imageError ? (
        <img
          src={convertFileSrc(screenshot.path)}
          alt={screenshot.filename}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-red-400 text-xs font-minecraft p-2 text-center">Error loading image</p>
        </div>
      )}
    </div>
  );
} 