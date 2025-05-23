"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface RetroGridEffectProps {
  className?: string;
  style?: React.CSSProperties;
  renderMode?: "top" | "bottom" | "both";
  perspective?: string;
  gridBackgroundColor?: string;
  customGridLineColor?: string;
  isAnimationEnabled?: boolean;
}

export function RetroGridEffect({
  className,
  style,
  renderMode = "both",
  perspective = "150px",
  gridBackgroundColor,
  customGridLineColor,
  isAnimationEnabled = true,
}: RetroGridEffectProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const gridLineColor = customGridLineColor || `${accentColor.value}80`;

  let effectiveGridBackgroundColor;
  if (gridBackgroundColor !== undefined) {
    effectiveGridBackgroundColor = gridBackgroundColor;
  } else {
    const r = Number.parseInt(accentColor.value.slice(1, 3), 16);
    const g = Number.parseInt(accentColor.value.slice(3, 5), 16);
    const b = Number.parseInt(accentColor.value.slice(5, 7), 16);
    effectiveGridBackgroundColor = `rgba(${r}, ${g}, ${b}, 0)`;
  }

  const gridSize =
    qualityLevel === "low"
      ? "60px 30px"
      : qualityLevel === "high"
        ? "30px 15px"
        : "40px 20px";
  const animationDuration =
    qualityLevel === "low" ? "15s" : qualityLevel === "high" ? "8s" : "10s";

  const baseGridStyles: React.CSSProperties = {
    width: "150%",
    height: "60%",
    backgroundImage: `
      linear-gradient(to right, ${gridLineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)
    `,
    backgroundSize: gridSize,
    position: "absolute",
    left: "-25%",
    pointerEvents: "none",
  };

  const bottomGridStyle: React.CSSProperties = {
    ...baseGridStyles,
    transform: "rotateX(140deg)",
    bottom: "-10%",
    animation:
      isAnimationEnabled && isVisible
        ? `moveGrid ${animationDuration} linear infinite`
        : "none",
    WebkitMaskImage:
      "linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
    maskImage: "linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
  };

  const topGridStyle: React.CSSProperties = {
    ...baseGridStyles,
    transform: "rotateX(-140deg)",
    top: "-10%",
    animation:
      isAnimationEnabled && isVisible
        ? `moveGridReverse ${animationDuration} linear infinite`
        : "none",
    WebkitMaskImage:
      "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
    maskImage:
      "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
  };

  const keyframes = `
    @keyframes moveGrid {
      0% { background-position-y: 0; }
      100% { background-position-y: -200px; }
    }
    @keyframes moveGridReverse {
      0% { background-position-y: -200px; }
      100% { background-position-y: 0; }
    }
  `;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: effectiveGridBackgroundColor,
        perspective: perspective,
        zIndex: 0,
        ...style,
      }}
    >
      <style>{keyframes}</style>
      {(renderMode === "top" || renderMode === "both") && (
        <div style={topGridStyle}></div>
      )}
      {(renderMode === "bottom" || renderMode === "both") && (
        <div style={bottomGridStyle}></div>
      )}
    </div>
  );
}
