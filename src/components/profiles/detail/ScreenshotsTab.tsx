"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile, ScreenshotInfo as ActualScreenshotInfo } from "../../../types/profile"; // Renamed ScreenshotInfo to ActualScreenshotInfo
import { useThemeStore } from "../../../store/useThemeStore";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils"; // Assuming you have a cn utility
import { Select, type SelectOption } from "../../ui/Select"; // Import Select and SelectOption
import { EmptyState } from "../../ui/EmptyState"; // Import EmptyState
import { invoke } from "@tauri-apps/api/core"; // Import invoke
import { convertFileSrc } from "@tauri-apps/api/core"; // Import convertFileSrc
import { ScreenshotGridItem } from "./ScreenshotGridItem"; // Import ScreenshotGridItem
import { VirtuosoGrid } from "react-virtuoso"; // Import VirtuosoGrid

interface ScreenshotItem {
  id: string;
  color: string;
  // Future: src: string, alt: string, date: Date etc.
}

interface ScreenshotsTabProps {
  profile: Profile;
  // onRefresh?: () => void; // Placeholder for future refresh functionality
  isActive?: boolean; // To control animations if needed directly
}

// Placeholder data for screenshots
const placeholderScreenshotsData: ScreenshotItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `screenshot-${i + 1}`,
  // You could add more properties like src, alt, date, etc. later
  // For now, we'll just use a placeholder color based on index
  color: `hsl(${i * 45}, 65%, 60%)`, // Adjusted color spread
}));

const sortOptions: SelectOption[] = [
  { value: "newest", label: "newest first", icon: <Icon icon="solar:sort-amount-down-bold-duotone" /> },
  { value: "oldest", label: "oldest first", icon: <Icon icon="solar:sort-amount-up-bold-duotone" /> },
];

export function ScreenshotsTab({
  profile,
  isActive = true, // Assuming it's active when rendered by ProfileDetailView logic
}: ScreenshotsTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true); // Simulate loading
  const [error, setError] = useState<string | null>(null); // Simulate error

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<ActualScreenshotInfo | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("newest");

  // Simulate fetching and initial data state
  const [rawScreenshots, setRawScreenshots] = useState<ActualScreenshotInfo[]>([]);

  useEffect(() => {
    const fetchScreenshots = async () => {
      if (!profile || !profile.id) {
        setRawScreenshots([]);
        setIsLoading(false);
        setError("Profile information is missing.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await invoke<ActualScreenshotInfo[]>(
          "list_profile_screenshots",
          { profileId: profile.id },
        );
        setRawScreenshots(result);
      } catch (err) {
        console.error("Failed to fetch screenshots:", err);
        setError(err instanceof Error ? err.message : String(err));
        setRawScreenshots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScreenshots();
  }, [profile.id, profile]); // Added profile to dependency array

  const displayedScreenshots = useMemo(() => {
    let sorted = [...rawScreenshots];
    if (sortOrder === "newest") {
      sorted.sort((a, b) => {
        if (!a.modified && !b.modified) return 0;
        if (!a.modified) return 1; // b comes first if a has no date
        if (!b.modified) return -1; // a comes first if b has no date
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      });
    } else if (sortOrder === "oldest") {
      sorted.sort((a, b) => {
        if (!a.modified && !b.modified) return 0;
        if (!a.modified) return -1; // a comes first if a has no date
        if (!b.modified) return 1; // b comes first if b has no date
        return new Date(a.modified).getTime() - new Date(b.modified).getTime();
      });
    }
    // If no date or same date, could add secondary sort by filename if desired
    // e.g., return a.filename.localeCompare(b.filename);
    return sorted;
  }, [rawScreenshots, sortOrder]);

  useEffect(() => {
    if (containerRef.current && isActive && isBackgroundAnimationEnabled && !isLoading) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          delay: 0.1, // Small delay to ensure tab switch animation completes
        },
      );
    } else if (containerRef.current && isActive && !isLoading) {
      gsap.set(containerRef.current, { opacity: 1, y: 0 });
    }
  }, [isActive, isBackgroundAnimationEnabled, isLoading]); // Re-run animation when loading completes

  const openLightbox = (screenshot: ActualScreenshotInfo) => {
    setSelectedScreenshot(screenshot);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    // Delay clearing selected screenshot for smoother exit animation if any
    setTimeout(() => setSelectedScreenshot(null), 300); 
  };

  useEffect(() => {
    if (isLightboxOpen && lightboxRef.current && isBackgroundAnimationEnabled) {
      gsap.fromTo(lightboxRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        lightboxRef.current?.querySelector(".lightbox-content"),
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out", delay: 0.1 },
      );
    } else if (!isLightboxOpen && lightboxRef.current && isBackgroundAnimationEnabled) {
      // Exit animation for lightbox (optional)
      gsap.to(lightboxRef.current, { opacity: 0, duration: 0.3 });
    }
  }, [isLightboxOpen, isBackgroundAnimationEnabled]);
  
  // Handle Escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen]);

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col select-none p-4 gap-4"
      style={{ opacity: (isBackgroundAnimationEnabled && isLoading) ? 0 : 1 }}
    >
      {/* Header with styling similar to WorldsTab action bar */}
      <div
        className="flex items-center justify-between gap-4 mb-4 p-3 rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${accentColor.value}10`,
          borderColor: `${accentColor.value}30`,
        }}
      >
        <h2 className="font-minecraft text-lg text-white flex-shrink-0">Screenshots</h2>
        <div className="w-full max-w-xs sm:max-w-[200px] ml-auto">
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            options={sortOptions}
            size="sm"
            disabled={isLoading || (!isLoading && !error && displayedScreenshots.length === 0)} // Disable if loading or no items
          />
        </div>
      </div>

      {/* New main content wrapper with its own background */}
      <div 
        className="flex-1 overflow-hidden rounded-lg border flex flex-col"
        style={{
          backgroundColor: `${accentColor.value}0A`, // Slightly different from tab pane bg
          borderColor: `${accentColor.value}20`,
        }}
      >
        {isLoading && (
          <EmptyState 
            icon="solar:gallery-send-bold-duotone" 
            message="loading screenshots..." 
            // fullHeight is true by default, which is desired here
            // The EmptyState component will handle its own styling and centering within this flex-1 container.
          />
        )}

        {!isLoading && error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Icon icon="solar:gallery-remove-bold-duotone" className="w-20 h-20 mb-4 text-red-400/80" />
            <p className="font-minecraft-ten text-xl text-red-400 mb-2">Oops! Something went wrong.</p>
            <p className="text-white/60 font-minecraft-five text-base">{error}</p>
          </div>
        )}

        {!isLoading && !error && displayedScreenshots.length === 0 && rawScreenshots.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Icon icon="solar:gallery-minimalistic-bold-duotone" className="w-20 h-20 mb-4 text-white/40" />
            <p className="font-minecraft-ten text-xl text-white/70 mb-2">No Screenshots Match Filter</p>
            <p className="text-white/50 font-minecraft-five text-base">
              Try adjusting your sort options.
            </p>
          </div>
        )}

        {!isLoading && !error && rawScreenshots.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Icon icon="solar:camera-minimalistic-bold-duotone" className="w-20 h-20 mb-4 text-white/30" />
            <p className="font-minecraft-ten text-xl text-white/70 mb-2">No Screenshots Yet</p>
            <p className="text-white/50 font-minecraft-five text-base">
              Take some in-game screenshots and they'll appear here!
            </p>
          </div>
        )}

        {!isLoading && !error && displayedScreenshots.length > 0 && (
          <div className="h-full p-3">
            <VirtuosoGrid
              style={{ height: '100%' }}
              data={displayedScreenshots}
              itemContent={(index, screenshot) => (
                <ScreenshotGridItem
                  key={screenshot.path} 
                  screenshot={screenshot}
                  accentColorValue={accentColor.value}
                  isBackgroundAnimationEnabled={isBackgroundAnimationEnabled}
                  animationDelay={isBackgroundAnimationEnabled ? `${index * 0.035}s` : undefined}
                  onClick={() => openLightbox(screenshot)}
                />
              )}
              listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              className="custom-scrollbar"
            />
          </div>
        )}
      </div>

      {isLightboxOpen && selectedScreenshot && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeLightbox} // Close on backdrop click
        >
          <div 
            className="lightbox-content relative max-w-4xl max-h-[90vh] w-full rounded-lg shadow-2xl overflow-hidden cursor-default bg-black/50"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the content itself
          >
            <img 
              src={convertFileSrc(selectedScreenshot.path)}
              alt={`Enlarged screenshot: ${selectedScreenshot.filename}`}
              className="block max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-md mx-auto"
            />
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
              aria-label="Close screenshot viewer"
            >
              <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// It's generally better to define keyframes in a global CSS file (e.g., globals.css)
// For Tailwind, you can also define custom animations in tailwind.config.js
// If you must include it here and are not in a Next.js pages dir, 
// you might need a different approach than <style jsx> or ensure your setup supports it.
// For now, adding a utility class `animate-fadeInUpItem` and assuming it's defined globally:
/*
@keyframes fadeInUpItem {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeInUpItem {
  animation-name: fadeInUpItem;
  animation-duration: 0.5s;
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;
}
*/ 