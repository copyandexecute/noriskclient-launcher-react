"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";
import { CurrentAccountDisplay } from "../account/CurrentAccountDisplay";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";

interface UserProfileBarProps {
  className?: string;
}

export function UserProfileBar({ className }: UserProfileBarProps) {
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const { initializeAccounts } = useMinecraftAuthStore();
  const [_, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeAccounts();
    return () => setMounted(false);
  }, [initializeAccounts]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".profile-bar-container", {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  const toggleAccountDropdown = () => {
    setIsAccountDropdownOpen(!isAccountDropdownOpen);
  };

  const handleCloseDropdown = () => {
    setIsAccountDropdownOpen(false);
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="profile-bar-container flex items-center gap-2">
        <RunningInstancesIndicator />

        <div ref={profileButtonRef}>
          <CurrentAccountDisplay
            onClick={toggleAccountDropdown}
            className="h-10"
          />
        </div>
      </div>

      <Dropdown
        ref={dropdownRef}
        isOpen={isAccountDropdownOpen}
        onClose={handleCloseDropdown}
        triggerRef={profileButtonRef}
        width={300}
      >
        <MinecraftAccountManager onClose={handleCloseDropdown} isInDropdown />
      </Dropdown>
    </div>
  );
}
