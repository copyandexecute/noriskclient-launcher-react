"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  variant?: "default" | "secondary" | "ghost";
}

export const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  (
    { className, icon, isActive = false, variant = "default", ...props },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);

    const getVariantColors = () => {
      switch (variant) {
        case "secondary":
          return {
            main: "#6b7280",
            light: "#9ca3af",
            dark: "#4b5563",
            text: "#f3f4f6",
          };
        case "ghost":
          return {
            main: "transparent",
            light: "transparent",
            dark: "transparent",
            text: "#ffffff",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.hoverValue,
            dark: accentColor.value,
            text: "#ffffff",
          };
      }
    };

    const colors = getVariantColors();

    return (
      <button
        ref={ref || buttonRef}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-300",
          "w-16 h-16 rounded-md text-white flex items-center justify-center",
          "text-shadow-sm",
          isActive &&
            variant !== "ghost" &&
            "border-2 border-b-4 shadow-[0_6px_0_rgba(0,0,0,0.25),0_8px_15px_rgba(0,0,0,0.3)]",
          !isActive &&
            variant !== "ghost" &&
            "shadow-[0_4px_0_rgba(0,0,0,0.2),0_6px_10px_rgba(0,0,0,0.25)]",
          "hover:translate-y-[-2px]",
          !isActive &&
            variant !== "ghost" &&
            "hover:shadow-[0_6px_0_rgba(0,0,0,0.15),0_8px_15px_rgba(0,0,0,0.2)]",
          isActive &&
            variant !== "ghost" &&
            "hover:shadow-[0_8px_0_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.25)]",
          "hover:brightness-110",
          "active:translate-y-[2px]",
          !isActive &&
            variant !== "ghost" &&
            "active:shadow-[0_2px_0_rgba(0,0,0,0.1),0_3px_5px_rgba(0,0,0,0.15)]",
          isActive &&
            variant !== "ghost" &&
            "active:shadow-[0_3px_0_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.2)]",
          "active:brightness-90",
          "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-black/20",
          className,
        )}
        style={{
          backgroundColor:
            variant === "ghost"
              ? "transparent"
              : isActive
                ? `${colors.main}40`
                : `${colors.main}20`,
          borderColor:
            isActive && variant !== "ghost"
              ? `${colors.main}90`
              : "transparent",
          borderTopColor:
            isActive && variant !== "ghost" ? colors.light : undefined,
          borderBottomColor:
            isActive && variant !== "ghost" ? colors.dark : undefined,
          boxShadow:
            variant === "ghost"
              ? "none"
              : isActive
                ? `0 6px 0 rgba(0,0,0,0.25), 0 8px 15px rgba(0,0,0,0.3), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`
                : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.25), inset 0 1px 0 ${colors.light}30, inset 0 0 0 1px ${colors.main}10`,
          color: isActive ? colors.text : `${colors.text}90`,
        }}
        {...props}
      >
        <span
          className={cn(
            "absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent",
            isActive
              ? "opacity-30"
              : "opacity-0 group-hover:opacity-20 transition-opacity duration-300",
          )}
        />
        <span className="relative z-10 flex items-center justify-center w-8 h-8">
          {icon}
        </span>
      </button>
    );
  },
);

NavButton.displayName = "NavButton";
