"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { Icon } from "@iconify/react";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";
import { AccountDropdown } from "./AccountDropdown";

interface UserProfileBarProps {
  className?: string;
}

export function UserProfileBar({ className }: UserProfileBarProps) {
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const { activeAccount, initializeAccounts } = useMinecraftAuthStore();
  const [_, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeAccounts();
    return () => setMounted(false);
  }, [initializeAccounts]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(profileButtonRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  const toggleAccountDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAccountDropdownOpen(!isAccountDropdownOpen);
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <RunningInstancesIndicator />

      <ProfileBarButton
        ref={profileButtonRef}
        activeAccount={activeAccount}
        onClick={toggleAccountDropdown}
      />

      <AccountDropdown
        isOpen={isAccountDropdownOpen}
        onClose={() => setIsAccountDropdownOpen(false)}
        buttonRef={profileButtonRef}
      />
    </div>
  );
}

interface ProfileBarButtonProps {
  activeAccount: any;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

const ProfileBarButton = forwardRef<HTMLDivElement, ProfileBarButtonProps>(
  ({ activeAccount, onClick }, ref) => {
    const chevronIcon = activeAccount 
      ? "mdi:chevron-down"
      : "mdi:plus";

    // Construct Crafatar URL for the active account
    const avatarUrl = activeAccount?.id 
      ? `https://crafatar.com/avatars/${activeAccount.id}?overlay&size=28` // Use size 28 (matches h-7 w-7)
      : null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 bg-black/50 h-10 px-4 py-1 max-w-fit backdrop-blur-md cursor-pointer",
          "border-2 border-white/30 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:border-white/50 transition-colors",
        )}
        onClick={onClick}
      >
        <div className="relative w-7 h-7 overflow-hidden border-2 border-white/30 bg-black/50 flex items-center justify-center rounded-sm flex-shrink-0">
          {activeAccount && avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${activeAccount.minecraft_username || activeAccount.username}'s avatar`}
              className="w-full h-full object-cover"
              // Basic error handling: Show fallback on error
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Hide broken image, let fallback show
                target.style.display = 'none'; 
                // Find the sibling span and display it (alternative to just letting background show)
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null /* Render nothing initially if loading or no account */}
          {/* Fallback element (initially hidden if avatarUrl exists) */}
          <span 
            className={`absolute inset-0 flex items-center justify-center text-white font-minecraft text-xs ${activeAccount && avatarUrl ? 'hidden' : ''}`}
            // Style this span to match the size and background, make it visible in onError or if no active account
          >
            {activeAccount 
              ? activeAccount.minecraft_username?.charAt(0).toUpperCase() || "?" 
              : "+"}
          </span>
        </div>
        <div className="flex items-center gap-1 min-w-0"> {/* Added min-w-0 */} 
          {activeAccount ? (
            <>
              <span className="text-xs text-white/80 font-minecraft uppercase">
                Logged in as
              </span>
              <span className="text-sm text-white font-minecraft uppercase truncate" title={activeAccount.minecraft_username || activeAccount.username}> {/* Added truncate and title */} 
                {activeAccount.minecraft_username || activeAccount.username}
              </span>
            </>
          ) : (
            <span className="text-sm text-white font-minecraft uppercase">
              Add Account
            </span>
          )}
        </div>
        <Icon icon={chevronIcon} className="w-4 h-4 text-white/70 ml-1 flex-shrink-0" />
      </div>
    );
  },
);

ProfileBarButton.displayName = "ProfileBarButton";
