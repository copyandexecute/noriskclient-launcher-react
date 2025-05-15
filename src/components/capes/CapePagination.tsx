'use client';

import React from 'react';
import type { PaginationInfo } from '../../types/noriskCapes';
import { Button } from '../ui/buttons/Button';

interface CapePaginationProps {
  paginationInfo: PaginationInfo;
  onPageChange: (newPage: number) => void;
}

export function CapePagination({ paginationInfo, onPageChange }: CapePaginationProps) {
  const { currentPage, totalPages, totalItems } = paginationInfo;

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page or no items
  }

  const handlePrevious = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-t border-white/10 bg-background-secondary mt-auto">
      <p className="font-minecraft lowercase text-sm text-white/60">
        Page {currentPage + 1} / {totalPages} 
        <span className="text-white/40 text-xs ml-1">({totalItems})</span>
      </p>
      <div className="flex items-center space-x-1.5">
        <Button 
          onClick={handlePrevious} 
          disabled={currentPage === 0} 
          variant="secondary" 
          size="xs"
          className="font-minecraft lowercase text-sm px-2 py-0.5"
        >
          &lt;
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={currentPage >= totalPages - 1} 
          variant="secondary" 
          size="xs"
          className="font-minecraft lowercase text-sm px-2 py-0.5"
        >
          &gt;
        </Button>
      </div>
    </div>
  );
} 