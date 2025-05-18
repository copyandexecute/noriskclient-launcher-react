'use client';

import React, { useState, useEffect } from 'react';
import type { CosmeticCape } from '../../types/noriskCapes';
import { useThemeStore } from '../../store/useThemeStore'; 
import { Cape3DRenderer } from './Cape3DRenderer';
import { Button } from '../ui/buttons/Button';
import { IconButton } from '../ui/buttons/IconButton';
import { getPlayerProfileByUuidOrName } from '../../services/cape-service';
import type { MinecraftProfile } from '../../types/minecraft';
import { Icon } from '@iconify/react';
import {SkinViewer} from "../launcher/SkinViewer.tsx";

interface CapeCardProps {
  cape: CosmeticCape;
  onEquip: (capeHash: string) => void;
  isSelected?: boolean; 
  isLoading?: boolean;
  index: number; 
  isActuallyVisible?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
}

const CARD_MIN_WIDTH = 230;
const CAPE_MODEL_ASPECT_RATIO = 10 / 16;

export function CapeCard({ cape, onEquip, isSelected, isLoading, index, isActuallyVisible, onDelete }: CapeCardProps) {
  const { _id: capeHash, elytra, uses, firstSeen: creatorUuid } = cape;
  const imageUrl = `https://cdn.norisk.gg/capes-staging/prod/${capeHash}.png`;
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const accentColor = useThemeStore((state) => state.accentColor);

  const RENDERER_TARGET_HEIGHT = Math.round(CARD_MIN_WIDTH * 1.1);
  const RENDERER_TARGET_WIDTH = Math.round(RENDERER_TARGET_HEIGHT * CAPE_MODEL_ASPECT_RATIO);

  useEffect(() => {
    if (isActuallyVisible && creatorUuid && !creatorName && !profileError) {
      let isMounted = true;
      getPlayerProfileByUuidOrName(creatorUuid)
        .then((profile) => {
          if (isMounted && profile && profile.name) {
            setCreatorName(profile.name);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn(`Failed to fetch profile for UUID ${creatorUuid}:`, err);
          }
        });
      return () => { isMounted = false; };
    }
  }, [isActuallyVisible, creatorUuid, creatorName, profileError]);

  const selectCape = () => {
    onEquip(capeHash);
  }

  return (
    <div
      className={(
        `relative group border-white/20 backdrop-blur-md border-2 rounded-lg p-2.5 pt-1.5 pb-2 transition-all 
        duration-200 flex-col text-center animate-slide-up-fade-in min-w-[${CARD_MIN_WIDTH}px]
        hover:bg-white/5
        ${(isLoading) ? 'opacity-60 pointer-events-none' : ''}`
      )}
      style={{
        animationDelay: `${index * 0.075}s`,
        borderColor: isSelected ? `${accentColor.value}80` : undefined,
        backgroundColor: isSelected ? `${accentColor.value}10` : undefined,
      }}
      title={creatorName ? `Cape by ${creatorName} (ID: ${capeHash})` : `Cape ID: ${capeHash}`}
      onClick={selectCape}
    >
      <div 
        className="w-full flex items-center justify-center relative mb-6"
        style={{ height: `${RENDERER_TARGET_HEIGHT}px` }}
      >
        <Cape3DRenderer 
          imageUrl={imageUrl} 
          width={RENDERER_TARGET_WIDTH} 
          height={RENDERER_TARGET_HEIGHT}
          autoRotate={false}
          backgroundColor="transparent"
          className={"mt-10"}
        />

        {elytra && (
          <div 
            className="absolute top-0 left-0 bg-accent text-accent-foreground px-1.5 py-0.5 text-s font-bold rounded-sm pixelated-text shadow-md uppercase z-10"
            title="This cape includes an Elytra texture."
          >
            Elytra
          </div>
        )}
         
        {onDelete && !isLoading && (
          <IconButton 
            className="absolute top-1 right-1 z-20 shadow-md opacity-85 hover:opacity-100"
            size="xs"
            icon={<Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />}
            onClick={onDelete}
            aria-label="Delete Cape"
            title="Delete Cape"
            shadowDepth="short"
          />
        )}
      </div>

      <div className="text-white/60 font-minecraft lowercase text-lg">
        Uses: {uses.toLocaleString()}
      </div>

      <div className="text-white/90 font-minecraft lowercase text-2xl truncate -mt-3" title={creatorName ? `Creator: ${creatorName} (Cape ID: ${capeHash})` : undefined}>
        {creatorName ? `By: ${creatorName}` : "Loading..."}
      </div>
    </div>
  );
} 