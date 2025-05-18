"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { SkinViewer } from './SkinViewer';
import { LaunchButton } from './LaunchButton';

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
}

export function PlayerActionsDisplay({
  skinUrl,
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
}: PlayerActionsDisplayProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <h2 className="font-minecraft text-6xl text-center text-white mb-2 lowercase font-normal">
        {playerName || "no account"}
      </h2>

      <div className="relative w-full max-w-[500px]">
        <SkinViewer
          skinUrl={skinUrl}
          playerName={playerName?.toString()}
          width={200}
          height={450}
          className="bg-transparent"
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