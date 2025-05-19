"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { SkinViewer } from './SkinViewer';
import { LaunchButton } from './LaunchButton';
import { useThemeStore } from '../../store/useThemeStore';

interface PlayerActionsDisplayProps {
  skinUrl: string;
  playerName: string | null | undefined;
  launchButtonDefaultVersion: string;
  onLaunchVersionChange: (versionId: string) => void;
  launchButtonVersions: Array<{ 
    id: string; 
    label: string; 
    icon?: string; 
    isCustom?: boolean; 
    profileId: string; 
  }>;
  className?: string;
  displayMode?: 'playerName' | 'logo';
}

export function PlayerActionsDisplay({
  skinUrl,
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
  displayMode = 'playerName',
}: PlayerActionsDisplayProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const dropShadowX = '2px';
  const dropShadowY = '4px';
  const dropShadowBlur = '6px';
  const commonDropShadowStyle = `drop-shadow(${dropShadowX} ${dropShadowY} ${dropShadowBlur} ${accentColor.value})`;
  
  const skinViewerDisplayHeight = 450;
  const skinViewerMaxDisplayWidth = 225; // Adjusted to allow for wider classic skins

  const skinViewerStyles: React.CSSProperties = {
    filter: 'drop-shadow(5px 10px 5px rgba(0,0,0,0.75))',
    WebkitBoxReflect: 'below 0px linear-gradient(to bottom, transparent, rgba(0,0,0,0.05))',
    height: `${skinViewerDisplayHeight}px`,
    width: 'auto', // Allow width to adjust to aspect ratio
    maxWidth: `${skinViewerMaxDisplayWidth}px`, // Cap the maximum width
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {displayMode === 'logo' ? (
        <img
          src="norisk_logo_color.png"
          alt="NoRisk Logo"
          className="h-48 sm:h-56 md:h-64 mb-[-80px] sm:mb-[-100px] md:mb-[-120px] relative z-0"
          style={{
            imageRendering: "pixelated",
            filter: commonDropShadowStyle
          }}
        />
      ) : (
        <h2 className="font-minecraft text-6xl text-center text-white mb-2 lowercase font-normal">
          {playerName || "no account"}
        </h2>
      )}

      <div className={cn(
        "relative w-full max-w-[500px] flex flex-col items-center",
        displayMode === 'logo' && "z-10"
      )}>
        <SkinViewer
          skinUrl={skinUrl}
          playerName={playerName?.toString()}
          width={skinViewerMaxDisplayWidth} // Provide max width to internal canvas
          height={skinViewerDisplayHeight} // Provide fixed height to internal canvas
          className="bg-transparent flex-shrink-0"
          style={skinViewerStyles}
        />

        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <div className="max-w-xs sm:max-w-sm">
            <LaunchButton
              defaultVersion={launchButtonDefaultVersion}
              onVersionChange={onLaunchVersionChange}
              versions={launchButtonVersions}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 