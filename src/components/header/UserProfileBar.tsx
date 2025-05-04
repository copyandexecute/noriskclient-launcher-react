"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { Icon } from "@iconify/react";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";
import { createPortal } from "react-dom";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";

interface UserProfileBarProps {
  className?: string;
}

export function UserProfileBar({ className }: UserProfileBarProps) {
  const profileRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeAccount, initializeAccounts } = useMinecraftAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeAccounts();
    return () => setMounted(false);
  }, [initializeAccounts]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(profileRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  const toggleModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <RunningInstancesIndicator />

      <ProfileBarButton
        ref={profileRef}
        activeAccount={activeAccount}
        onClick={toggleModal}
      />

      {isModalOpen &&
        mounted &&
        createPortal(
          <MinecraftAccountManager onClose={() => setIsModalOpen(false)} />,
          document.body,
        )}
    </div>
  );
}

interface ProfileBarButtonProps {
  activeAccount: any;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

const ProfileBarButton = forwardRef<HTMLDivElement, ProfileBarButtonProps>(
  ({ activeAccount, onClick, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 bg-black/50 h-10 px-4 py-1 max-w-fit backdrop-blur-md cursor-pointer",
          "border-2 border-white/30 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:border-white/50 transition-colors",
        )}
        onClick={onClick}
      >
        <div className="relative w-7 h-7 overflow-hidden border-2 border-white/30">
          {activeAccount ? (
            <div className="w-full h-full bg-black/40 flex items-center justify-center text-white font-minecraft text-xs">
              {activeAccount.minecraft_username?.charAt(0).toUpperCase() || "?"}
            </div>
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center text-white font-minecraft text-xs">
              +
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeAccount ? (
            <>
              <span className="text-xs text-white/80 font-minecraft uppercase">
                Logged in as
              </span>
              <span className="text-sm text-white font-minecraft uppercase">
                {activeAccount.minecraft_username || activeAccount.username}
              </span>
            </>
          ) : (
            <span className="text-sm text-white font-minecraft uppercase">
              Add Account
            </span>
          )}
        </div>
        <Icon icon="mdi:chevron-down" className="w-4 h-4 text-white/70 ml-1" />
      </div>
    );
  },
);

ProfileBarButton.displayName = "ProfileBarButton";
