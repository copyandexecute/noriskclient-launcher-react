'use client';

import React from 'react';
import type { CosmeticCape } from '../../types/noriskCapes';
import { CapeCard } from './CapeCard';
import { EmptyState } from '../ui/EmptyState';
import { InView } from 'react-intersection-observer';

interface CapeListProps {
  capes: CosmeticCape[];
  onEquipCape: (capeHash: string) => void;
  isLoading?: boolean; // True if the list is being loaded/refreshed
  isEquippingCapeId?: string | null; // ID of the cape currently being equipped
  searchQuery?: string; // To display specific message if search yields no results
}

export function CapeList({ capes, onEquipCape, isLoading, isEquippingCapeId, searchQuery }: CapeListProps) {
  if (isLoading && capes.length === 0) { 
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-3">
        {Array.from({ length: 12 }).map((_, index) => ( // Show more placeholders if cards are smaller
          <div key={index} 
               className="border-2 border-white/20 bg-black/20 rounded-lg p-2.5 pt-1.5 pb-2 animate-pulse flex flex-col text-center aspect-[210/300] min-w-[210px]">
            {/* Adjusted placeholder structure for smaller card */}
            <div className="h-[calc(210px*1.1*0.625)] bg-black/10 rounded my-1"></div> {/* Placeholder for image area, respecting aspect ratio */}
            <div className="h-4 bg-white/10 rounded w-2/3 mx-auto my-1.5"></div> {/* Placeholder for Uses */}
            <div className="h-3 bg-white/10 rounded w-1/2 mx-auto mb-1.5"></div> {/* Placeholder for Creator */}
            <div className="h-8 bg-white/10 rounded w-full mt-auto"></div> {/* Placeholder for button area */}
          </div>
        ))}
      </div>
    );
  }

  if (!capes || capes.length === 0) {
    const message = searchQuery 
      ? `No capes match "${searchQuery}". Try a different search term.`
      : "No capes found. More will be added soon!";
    return (
      <div className="flex-grow flex items-center justify-center p-5">
        <EmptyState 
          icon="pixel:ghost" 
          message={message}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-3">
      {capes.map((cape, index) => (
        <InView key={cape._id} triggerOnce={false} rootMargin="100px 0px"> 
          {({ ref, inView }) => (
            <div ref={ref}>
              <CapeCard 
                cape={cape} 
                onEquip={onEquipCape} 
                isLoading={isEquippingCapeId === cape._id}
                isSelected={isEquippingCapeId === cape._id} // Visually mark as selected while equipping
                index={index}
                isActuallyVisible={inView} // Pass inView state to CapeCard
              />
            </div>
          )}
        </InView>
      ))}
    </div>
  );
} 