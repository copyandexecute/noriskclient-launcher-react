"use client";

import React from 'react';

interface PlainBackgroundProps {
  accentColorValue: string;
}

const PlainBackground: React.FC<PlainBackgroundProps> = ({ accentColorValue }) => {
  const getDarkerShade = (hexColor: string): string => {
    // Remove # if present
    let color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

    // Convert hex to RGB
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    // Reduce brightness (e.g., by 50%)
    // Ensure values don't go below 0
    r = Math.max(0, Math.floor(r * 0.1));
    g = Math.max(0, Math.floor(g * 0.1));
    b = Math.max(0, Math.floor(b * 0.1));

    // Convert back to hex
    const darkerHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return darkerHex;
  };

  const backgroundColor = getDarkerShade(accentColorValue);

  return (
    <div
      className="absolute inset-0 w-full h-full transition-colors duration-500"
      style={{ backgroundColor }}
    />
  );
};

export default PlainBackground; 