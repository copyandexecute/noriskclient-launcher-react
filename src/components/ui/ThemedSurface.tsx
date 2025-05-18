"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../store/useThemeStore';

interface ThemedSurfaceProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  surfaceRef?: React.Ref<HTMLDivElement>;
  alwaysActive?: boolean;
  baseColorHex?: string;
}

export function ThemedSurface({ 
  children, 
  className, 
  onClick, 
  onContextMenu, 
  surfaceRef, 
  alwaysActive = false,
  baseColorHex,
}: ThemedSurfaceProps) {
  const accentColorValue = useThemeStore((state) => state.accentColor.value);

  const isValidHex = (hex: string | undefined): hex is string => {
    if (!hex) return false;
    return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{8}$/i.test(hex);
  };

  const effectiveBaseColor = isValidHex(baseColorHex) ? baseColorHex : accentColorValue;

  const parseHexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) { // Fallback for invalid hex
      return `rgba(0, 0, 0, ${alpha})`; // Default to black with alpha
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const styles = {
    '--surface-bg-default': parseHexToRgba(effectiveBaseColor, 0.03),
    '--surface-bg-hover': parseHexToRgba(effectiveBaseColor, 0.1),
    '--surface-border-default': `${effectiveBaseColor}33`,
    '--surface-border-hover': `${effectiveBaseColor}7A`,
    '--surface-border-focus-within': `${effectiveBaseColor}99`,
  } as React.CSSProperties;

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative p-3 transition-colors duration-150 rounded-lg border-2 group w-full select-none",
        alwaysActive 
          ? "bg-[var(--surface-bg-hover)] border-[var(--surface-border-hover)]"
          : "bg-[var(--surface-bg-default)] hover:bg-[var(--surface-bg-hover)] border-[var(--surface-border-default)] hover:border-[var(--surface-border-hover)] focus-within:border-[var(--surface-border-focus-within)]",
        className
      )}
      style={styles}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
} 