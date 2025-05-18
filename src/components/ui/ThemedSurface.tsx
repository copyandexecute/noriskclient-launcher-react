"use client";

import React, { useState } from 'react';
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
  borderVisibility?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
  };
}

export function ThemedSurface({ 
  children, 
  className, 
  onClick, 
  onContextMenu, 
  surfaceRef, 
  alwaysActive = false,
  baseColorHex,
  borderVisibility,
}: ThemedSurfaceProps) {
  const accentColorValue = useThemeStore((state) => state.accentColor.value);
  const [isSurfaceHovered, setIsSurfaceHovered] = useState(false);

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

  const {
    top: showTopBorder = true,
    bottom: showBottomBorder = true,
    left: showLeftBorder = true,
    right: showRightBorder = true,
  } = borderVisibility || {};

  const styles = {
    '--surface-bg-default': parseHexToRgba(effectiveBaseColor, 0.03),
    '--surface-bg-hover': parseHexToRgba(effectiveBaseColor, 0.1),
    '--surface-border-default': `${effectiveBaseColor}33`,
    '--surface-border-hover': `${effectiveBaseColor}7A`,
    '--surface-border-focus-within': `${effectiveBaseColor}99`,
  } as React.CSSProperties;

  const getBorderClass = (
    showBorderConfig: boolean, 
    borderDirection: 't' | 'b' | 'l' | 'r'
  ) => {
    if (showBorderConfig) {
      return alwaysActive
        ? `border-${borderDirection}-[var(--surface-border-hover)]`
        : `border-${borderDirection}-[var(--surface-border-default)] hover:border-${borderDirection}-[var(--surface-border-hover)] focus-within:border-${borderDirection}-[var(--surface-border-focus-within)]`;
    } else if (isSurfaceHovered) {
      return `border-${borderDirection}-[var(--surface-border-hover)]`;
    }
    return `border-${borderDirection}-transparent`;
  };

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative p-3 transition-colors duration-150 w-full select-none rounded-lg",
        alwaysActive 
          ? "bg-[var(--surface-bg-hover)]"
          : "bg-[var(--surface-bg-default)] hover:bg-[var(--surface-bg-hover)]",
        
        (showTopBorder || showBottomBorder || showLeftBorder || showRightBorder || isSurfaceHovered) && "border-2",

        getBorderClass(showTopBorder, 't'),
        getBorderClass(showBottomBorder, 'b'),
        getBorderClass(showLeftBorder, 'l'),
        getBorderClass(showRightBorder, 'r'),

        className
      )}
      style={styles}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsSurfaceHovered(true)}
      onMouseLeave={() => setIsSurfaceHovered(false)}
    >
      {children}
    </div>
  );
} 