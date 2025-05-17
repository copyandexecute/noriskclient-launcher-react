"use client";

import { Icon } from "@iconify/react";
import { EmptyState } from "./EmptyState"; // Assuming EmptyState is in the same directory or adjust path
import { ReactNode, useEffect } from "react";
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css'; // Import skeleton styles
import { preloadIcons } from "../../lib/icon-utils"; // Assuming this is the correct path

const GENERIC_LIST_DEFAULT_ICONS = [
  "solar:danger-triangle-bold", // Default error icon
  "solar:planet-bold"         // Default empty state icon
];

interface GenericListItemSkeletonProps {
  accentColor: string;
}

// Internal component for a single skeleton list item
function GenericListItemSkeleton({ accentColor }: GenericListItemSkeletonProps) {
  // Attempt to derive highlightColor from accentColor or use a default
  // This is a simple way to make highlight slightly lighter/different
  // More sophisticated color manipulation might be needed for perfect results
  const baseIsDark = parseInt(accentColor.substring(1, 3), 16) < 128; // Simple check if base color is dark
  const highlightColor = baseIsDark ? `${accentColor}99` : `${accentColor}4D`; // Lighter for dark, more transparent for light

  return (
    <SkeletonTheme baseColor={`${accentColor}20`} highlightColor={highlightColor}>
      <li className="p-4 flex items-start gap-4">
        {/* Icon Skeleton */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <Skeleton height="100%" width="100%" style={{ borderRadius: '0px' }} />
        </div>
        {/* Content Skeleton */}
        <div className="flex-grow min-w-0 h-24 flex flex-col justify-center">
          <Skeleton width="70%" height={20} style={{ marginBottom: '0.5rem', borderRadius: '0px' }} />
          <Skeleton count={2} height={15} style={{ borderRadius: '0px' }} />
        </div>
      </li>
    </SkeletonTheme>
  );
}

interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  isLoading?: boolean;
  loadingComponent?: ReactNode; // Custom loading component takes precedence
  loadingItemCount?: number; // Number of skeleton items to show
  error?: string | null;
  errorComponent?: (error: string) => ReactNode;
  emptyStateIcon?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  searchQuery?: string;
  accentColor?: string; // Assuming accentColor is a string like "#RRGGBB"
  listContainerClassName?: string;
  listItemClassName?: string; // For individual li elements if needed
  ulClassName?: string;
  showEmptyState?: boolean; // Explicitly control if empty state should be shown
}

export function GenericList<T>({
  items,
  renderItem,
  isLoading = false,
  loadingComponent,
  loadingItemCount = 3, // Default to 3 skeleton items
  error = null,
  errorComponent,
  emptyStateIcon = GENERIC_LIST_DEFAULT_ICONS[1], // Use preloaded default
  emptyStateMessage = "no items match your search",
  emptyStateDescription = "Try adjusting your search or filters.",
  searchQuery = "",
  accentColor = "#FFFFFF", // default accent color
  listContainerClassName = "",
  ulClassName = "divide-y divide-white/10",
  showEmptyState = true,
}: GenericListProps<T>) {
  const effectiveAccentColor = accentColor || "#FFFFFF"; // Fallback

  useEffect(() => {
    preloadIcons(GENERIC_LIST_DEFAULT_ICONS);
  }, []);

  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    // Default skeleton loading state
    return (
      <div
        className={`flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm ${listContainerClassName}`}
        style={{
          backgroundColor: `${effectiveAccentColor}08`,
          borderColor: `${effectiveAccentColor}20`,
        }}
      >
        <div className="h-full overflow-y-auto custom-scrollbar">
          <ul className={ulClassName}>
            {Array.from({ length: loadingItemCount }).map((_, index) => (
              <GenericListItemSkeleton key={`skeleton-${index}`} accentColor={effectiveAccentColor} />
            ))}
          </ul>
        </div>
      </div>
    );
  }
  // Error display can be customized via errorComponent
  if (error && errorComponent) {
    return <>{errorComponent(error)}</>;
  }
  if (error) {
    // Default error display if no custom component
    return (
      <div
        className="p-3 flex items-center gap-2 mb-4 rounded-lg border"
        style={{
          backgroundColor: `rgba(220, 38, 38, 0.1)`,
          borderColor: `rgba(220, 38, 38, 0.3)`,
        }}
      >
        <Icon
          icon={GENERIC_LIST_DEFAULT_ICONS[0]} // Use preloaded default
          className="w-5 h-5 text-red-400"
        />
        <span className="text-white font-minecraft text-lg">{error}</span>
      </div>
    );
  }
  
  const isEmpty = items.length === 0;

  if (showEmptyState && isEmpty && !isLoading) {
    return (
      <EmptyState
        icon={emptyStateIcon}
        message={searchQuery ? emptyStateMessage : "no items found"}
        description={searchQuery ? "Try a different search term." : emptyStateDescription}
      />
    );
  }

  // Render empty list container if items is empty and showEmptyState is false, but not loading and no error
  // This allows the parent to control whether a completely empty state (via EmptyState) or just an empty list shell is shown.
  if (isEmpty && !isLoading && !error && !showEmptyState) {
     return (
        <div
            className={`flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm ${listContainerClassName}`}
            style={{
                backgroundColor: `${effectiveAccentColor}08`,
                borderColor: `${effectiveAccentColor}20`,
            }}
        >
            <div className="h-full overflow-y-auto custom-scrollbar">
                <ul className={ulClassName}>
                    {/* No items to render */}
                </ul>
            </div>
        </div>
     );
  }

  // Only render the list with items if items array is not empty
  if (!isEmpty) {
    return (
        <div
        className={`flex-1 min-h-0 overflow-hidden rounded-lg border backdrop-blur-sm ${listContainerClassName}`}
        style={{
            backgroundColor: `${effectiveAccentColor}08`,
            borderColor: `${effectiveAccentColor}20`,
        }}
        >
        <div className="h-full overflow-y-auto custom-scrollbar">
            <ul className={ulClassName}>
            {items.map((item, index) => renderItem(item, index))}
            </ul>
        </div>
        </div>
    );
  }

  // Fallback for any unhandled cases (e.g. loading but no loading component)
  // Or if items are empty, not loading, no error, but showEmptyState is false.
  return null;
} 