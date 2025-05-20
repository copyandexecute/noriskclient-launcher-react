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

interface CapeCardProps {
  cape: CosmeticCape;
  onEquip: (capeHash: string) => void;
  isSelected?: boolean; 
  isLoading?: boolean;
  index: number; 
  isActuallyVisible?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
}

const CARD_MIN_WIDTH = 210;
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

  return (
    <div
      className={(
        `relative group bg-black/20 border-white/20 backdrop-blur-md border-2 rounded-lg p-2.5 pt-1.5 pb-2 transition-all 
        duration-200 flex flex-col text-center animate-slide-up-fade-in min-w-[${CARD_MIN_WIDTH}px]
        ${(isLoading) ? 'opacity-60 pointer-events-none' : ''}`
      )}
      style={{
        animationDelay: `${index * 0.075}s`,
        borderColor: isSelected ? `${accentColor.value}80` : undefined,
        backgroundColor: isSelected ? `${accentColor.value}10` : undefined,
      }}
      title={creatorName ? `Cape by ${creatorName} (ID: ${capeHash})` : `Cape ID: ${capeHash}`}
    >
      <div 
        className="w-full flex items-center justify-center relative bg-black/10 rounded mt-1 mb-1 overflow-hidden"
        style={{ height: `${RENDERER_TARGET_HEIGHT}px` }}
      >
        <Cape3DRenderer 
          imageUrl={imageUrl} 
          width={RENDERER_TARGET_WIDTH} 
          height={RENDERER_TARGET_HEIGHT}
          autoRotate={false}
          backgroundColor="transparent"
        />
         
        {elytra && (
          <div 
            className="absolute top-1 left-1 bg-accent text-accent-foreground px-1.5 py-0.5 text-xs font-bold rounded-sm pixelated-text shadow-md uppercase z-10"
            title="This cape includes an Elytra texture."
          >
            Elytra
          </div>
        )}
         
        {onDelete && (
          <IconButton 
            className="absolute top-1 right-1 z-20 shadow-md opacity-85 hover:opacity-100"
            size="xs"
            colorScheme="destructive"
            icon={<Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />}
            onClick={onDelete}
            aria-label="Delete Cape"
            title="Delete Cape"
            shadowDepth="short"
          />
        )}
      </div>

      <div className="text-white/60 font-minecraft lowercase text-base py-0.5 mt-0.5">
        Uses: {uses.toLocaleString()}
      </div>
      {creatorName && (
        <div className="text-white/50 font-minecraft lowercase text-sm py-0.5 truncate mt-0.5" title={`Creator: ${creatorName} (Cape ID: ${capeHash})`}>
          By: {creatorName}
        </div>
      )}
      {!creatorName && (
        <div className="text-white/30 font-minecraft lowercase text-sm py-0.5 truncate mt-0.5">
          Loading Creator...
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-white/10">
        <Button
          onClick={() => onEquip(capeHash)}
          variant="secondary" 
          size="sm" 
          className="w-full font-minecraft lowercase text-lg py-1.5 disabled:opacity-70"
          disabled={isLoading}
          aria-label={`Equip cape ${capeHash}`}
        >
          {isLoading ? 'Applying...' : 'Auswählen'}
        </Button>
      </div>
    </div>
  );
} 