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
          width={200}
          height={450}
          className="bg-transparent"
          style={{ filter: commonDropShadowStyle }}
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