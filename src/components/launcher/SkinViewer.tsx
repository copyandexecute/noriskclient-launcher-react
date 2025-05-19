"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface SkinViewerProps {
  skinUrl: string; // Bleibt für Fallback oder wenn API es doch unterstützt
  playerName?: string; // Wird primär für API-Endpunkt verwendet
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties; // Style-Prop hinzugefügt
  // autoRotate und enableZoom sind nicht mehr relevant für statische Bilder
}

const STARLIGHT_API_BASE = "https://starlightskins.lunareclipse.studio";

export function SkinViewer({
  skinUrl,
  playerName,
  width = 300, // Wird als CSS-Style für das img-Tag verwendet
  height = 400, // Wird als CSS-Style für das img-Tag verwendet
  className,
  style, // Style-Prop destrukturieren
}: SkinViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    let determinedUrl: string | null = null;
    if (playerName) {
      // Korrekter Endpunkt basierend auf der Nutzerinformation
      determinedUrl = `${STARLIGHT_API_BASE}/render/default/${encodeURIComponent(playerName)}/full`;
    } else if (skinUrl) {
      // Fallback, falls kein Spielername, aber skinUrl vorhanden ist.
      // Zeigt direkt die skinUrl, wenn es ein valides Bild ist oder ein Placeholder.
      // Eine API-Umwandlung von skinUrl zu Render ist hier nicht implementiert, da API-Details fehlen.
      determinedUrl = skinUrl; 
    } else {
      setHasError(true); // Kein Spielername und keine Skin-URL
    }
    setImageUrl(determinedUrl);
    console.log("SkinViewer imageUrl:", determinedUrl);
  }, [playerName, skinUrl]);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError || !imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-700/50 rounded-md",
          className
        )}
        style={{ width, height, ...style }} // Style hier auch für den Fehlerfall anwenden (optional)
      >
        <span className="text-gray-500 text-3xl">?</span> {/* Placeholder bei Fehler */}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={playerName ? `${playerName}'s Skin` : "Minecraft Skin"}
      width={width}
      height={height}
      className={cn("object-contain rounded-md", className)} // object-contain, damit Skin nicht verzerrt wird
      style={{ 
        imageRendering: "pixelated",
        ...style // Übergebene Styles hier mergen
      }} // Wichtig für Minecraft-Skins
      onError={handleError}
    />
  );
}
