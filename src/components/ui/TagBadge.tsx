import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { cn } from '../../lib/utils';

interface TagBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'info';
}

export const TagBadge: React.FC<TagBadgeProps> = ({ children, className, variant = 'default' }) => {
  const accentColor = useThemeStore((state) => state.accentColor);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.2)', // Tailwind green-600 with 20% opacity
          borderColor: 'rgba(16, 185, 129, 0.7)', // Tailwind green-600 with 70% opacity
          color: '#6ee7b7', // Tailwind green-400
        };
      case 'info':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.2)', // Tailwind blue-500 with 20% opacity
          borderColor: 'rgba(59, 130, 246, 0.7)', // Tailwind blue-500 with 70% opacity
          color: '#93c5fd', // Tailwind blue-300
        };
      default: // 'default'
        return {
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}80`,
          color: accentColor.value,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5 rounded-md text-xs font-medium',
        'border',
        'lowercase',
        className
      )}
      style={variantStyles}
    >
      {children}
    </span>
  );
}; 