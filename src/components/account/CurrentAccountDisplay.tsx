"use client";

import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface CurrentAccountDisplayProps {
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function CurrentAccountDisplay({
  onClick,
  className,
  compact = false,
}: CurrentAccountDisplayProps) {
  const { activeAccount } = useMinecraftAuthStore();
  const accentColor = useThemeStore((state) => state.accentColor);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0.95, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

  if (!activeAccount) {
    return (
      <div
        ref={buttonRef}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white tracking-wider",
          "flex items-center gap-3 px-4 py-1",
          "text-shadow-sm",

          "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",

          "hover:translate-y-[-2px] cursor-pointer",
          "hover:shadow-[0_10px_0_rgba(0,0,0,0.25),0_12px_20px_rgba(0,0,0,0.4)]",
          "hover:brightness-110",

          "active:translate-y-[2px]",
          "active:border-b-2 active:shadow-[0_2px_0_rgba(0,0,0,0.2),0_3px_5px_rgba(0,0,0,0.3)]",
          "active:brightness-90",

          className,
        )}
        onClick={onClick}
        style={{
          backgroundColor: `${accentColor.value}30`,
          borderColor: `${accentColor.value}80`,
          borderBottomColor: `${accentColor.value}`,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />

        <span className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/30 via-transparent to-transparent" />

        <div
          className="relative w-7 h-7 overflow-hidden border-2 rounded-sm flex-shrink-0 flex items-center justify-center"
          style={{
            borderColor: `${accentColor.value}60`,
            backgroundColor: `${accentColor.value}20`,
          }}
        >
          <span className="text-white font-minecraft text-xs">+</span>
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm text-white font-minecraft uppercase">
            Add Account
          </span>
        </div>

        <Icon
          icon="solar:alt-arrow-down-bold"
          className="w-4 h-4 text-white/90 ml-1 flex-shrink-0"
        />
      </div>
    );
  }

  const avatarUrl = activeAccount.id
    ? `https://crafatar.com/avatars/${activeAccount.id}?overlay&size=28`
    : null;

  const username =
    activeAccount.minecraft_username || activeAccount.username || "Unknown";

  return (
    <div
      ref={buttonRef}
      className={cn(
        "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
        "rounded-md text-white tracking-wider",
        "flex items-center gap-3 px-4 py-1",
        "text-shadow-sm",

        "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",

        "hover:translate-y-[-2px] cursor-pointer",
        "hover:shadow-[0_10px_0_rgba(0,0,0,0.25),0_12px_20px_rgba(0,0,0,0.4)]",
        "hover:brightness-110",

        "active:translate-y-[2px]",
        "active:border-b-2 active:shadow-[0_2px_0_rgba(0,0,0,0.2),0_3px_5px_rgba(0,0,0,0.3)]",
        "active:brightness-90",

        className,
      )}
      onClick={onClick}
      style={{
        backgroundColor: `${accentColor.value}30`,
        borderColor: `${accentColor.value}80`,
        borderBottomColor: `${accentColor.value}`,
        boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
        style={{ backgroundColor: `${accentColor.value}80` }}
      />

      <span className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/30 via-transparent to-transparent" />

      <div
        className="relative w-7 h-7 overflow-hidden border-2 rounded-sm flex-shrink-0 flex items-center justify-center"
        style={{
          borderColor: `${accentColor.value}60`,
          backgroundColor: `${accentColor.value}20`,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl || "/placeholder.svg"}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <span
          className={`absolute inset-0 flex items-center justify-center text-white font-minecraft text-xs ${
            avatarUrl ? "hidden" : ""
          }`}
        >
          {username.charAt(0).toUpperCase()}
        </span>
      </div>

      {!compact && (
        <div className="flex flex-col min-w-0">
          <span
            className="text-2xl text-white font-minecraft uppercase truncate"
            title={username}
          >
            {username}
          </span>
        </div>
      )}

      <Icon
        icon="solar:alt-arrow-down-bold"
        className="w-4 h-4 text-white/90 ml-1 flex-shrink-0"
      />
    </div>
  );
}
