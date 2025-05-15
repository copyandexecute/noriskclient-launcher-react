'use client';

import React, { useCallback } from 'react';
import type { CosmeticCape } from '../../types/noriskCapes';
import { CapeCard } from './CapeCard';
import { EmptyState } from '../ui/EmptyState';
import { InView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';

export interface CapeListProps {
  capes: CosmeticCape[];
  onEquipCape: (capeHash: string) => void;
  isLoading?: boolean;
  isEquippingCapeId?: string | null;
  searchQuery?: string;
  canDelete?: boolean;
  onDeleteCape?: (cape: CosmeticCape) => void;
}

export function CapeList({ 
  capes, 
  onEquipCape, 
  isLoading = false, 
  isEquippingCapeId = null,
  searchQuery = '',
  canDelete = false,
  onDeleteCape
}: CapeListProps) {
  
  const handleDeleteClick = useCallback((cape: CosmeticCape, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the cape selection/equip action
    if (onDeleteCape) {
      onDeleteCape(cape);
    }
  }, [onDeleteCape]);
  
  // Empty state with appropriate messaging
  if (!isLoading && capes.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center p-5">
        <EmptyState
          icon="pixel:ghost" 
          message={searchQuery ? `No capes found for "${searchQuery}"` : "No capes available"}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {capes.map((cape, index) => (
        <InView key={cape._id} threshold={0.1}>
          {({ ref, inView }) => (
            <div 
              ref={ref} 
              className="transition-opacity duration-300"
              style={{ opacity: inView ? 1 : 0.3 }}
            >
              <CapeCard
                cape={cape}
                onEquip={() => onEquipCape(cape._id)}
                isLoading={isEquippingCapeId === cape._id}
                isSelected={isEquippingCapeId === cape._id}
                index={index}
                isActuallyVisible={inView}
                onDelete={canDelete ? (e) => handleDeleteClick(cape, e) : undefined}
              />
            </div>
          )}
        </InView>
      ))}
    </div>
  );
} 