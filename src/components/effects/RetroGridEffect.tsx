"use client";

import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';

interface RetroGridEffectProps {
  className?: string;
  style?: React.CSSProperties;
  renderMode?: 'top' | 'bottom' | 'both';
  perspective?: string;
  gridBackgroundColor?: string;
  customGridLineColor?: string; // Erlaube eine benutzerdefinierte Linienfarbe
  isAnimationEnabled?: boolean;
}

export function RetroGridEffect({
  className,
  style,
  renderMode = 'both',
  perspective = '150px',
  gridBackgroundColor = '#121220',
  customGridLineColor,
  isAnimationEnabled = true,
}: RetroGridEffectProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const gridLineColor = customGridLineColor || `${accentColor.value}80`;

  const baseGridStyles: Omit<React.CSSProperties, 'transform' | 'top' | 'bottom' | 'animation'> = {
    width: "150%",
    height: "60%",
    backgroundImage: `
      linear-gradient(to right, ${gridLineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)
    `,
    backgroundSize: "40px 20px",
    position: "absolute",
    left: "-25%",
    pointerEvents: 'none', // Sicherstellen, dass Grids nicht klickbar sind
  };

  const bottomGridStyle: React.CSSProperties = {
    ...baseGridStyles,
    transform: "rotateX(140deg)",
    bottom: "-10%",
    animation: isAnimationEnabled ? "moveGrid 10s linear infinite" : "none",
  };

  const topGridStyle: React.CSSProperties = {
    ...baseGridStyles,
    transform: "rotateX(-140deg)",
    top: "-10%",
    animation: isAnimationEnabled ? "moveGridReverse 10s linear infinite" : "none",
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
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: gridBackgroundColor,
        perspective: perspective,
        zIndex: 0, 
        ...style,
      }}
    >
      <style>{keyframes}</style>
      { (renderMode === 'top' || renderMode === 'both') && <div style={topGridStyle}></div> }
      { (renderMode === 'bottom' || renderMode === 'both') && <div style={bottomGridStyle}></div> }
    </div>
  );
} 