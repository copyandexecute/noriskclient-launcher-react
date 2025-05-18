"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { ThemedSurface } from "./ThemedSurface";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSearch?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "filled" | "themed-surface";
}

export function SearchInput({
  value,
  onChange,
  placeholder = "search...",
  className,
  onSearch,
  loading = false,
  disabled = false,
  size = "md",
  variant = "default",
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const sizeConfig = {
    sm: {
      container: "h-8",
      text: "text-sm",
      icon: "w-3 h-3",
      padding: "px-2",
      surfacePadding: "!p-0",
    },
    md: {
      container: "h-10",
      text: "text-base",
      icon: "w-4 h-4",
      padding: "px-3",
      surfacePadding: "!p-0",
    },
    lg: {
      container: "h-12",
      text: "text-base",
      icon: "w-5 h-5",
      padding: "px-4",
      surfacePadding: "!p-0",
    },
  };

  useEffect(() => {
    if (variant === "themed-surface") return;
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { scale: 0.98, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, [variant]);

  const handleFocus = () => {
    if (disabled || variant === "themed-surface") return;
    setIsFocused(true);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: -5,
        boxShadow: variantStyles.focusShadow,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleBlur = () => {
    if (disabled || variant === "themed-surface") return;
    setIsFocused(false);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: 0,
        boxShadow: variantStyles.shadow,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseEnter = () => {
    if (disabled || variant === "themed-surface") return;
    setIsHovered(true);
    if (!isFocused && containerRef.current) {
      gsap.to(containerRef.current, {
        y: -3,
        boxShadow: variantStyles.hoverShadow,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (disabled || variant === "themed-surface") return;
    setIsHovered(false);
    if (!isFocused && containerRef.current) {
      gsap.to(containerRef.current, {
        y: 0,
        boxShadow: variantStyles.shadow,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleClear = () => {
    if (disabled) return;
    onChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "minimal":
        return {
          bg: "transparent",
          borderClass: "border-b-2 border-white/30 rounded-none",
          borderColorStyle: undefined,
          borderBottomColorStyle: undefined,
          shadow: "shadow-none",
          hoverShadow: "shadow-none",
          focusShadow: "shadow-none",
          containerTransform: "translateY(0)",
          applyTopSpan: false,
        };
      case "filled":
        return {
          bg: `${accentColor.value}20`,
          borderClass: "border-none rounded-md",
          borderColorStyle: undefined,
          borderBottomColorStyle: undefined,
          shadow: `shadow-inner shadow-black/20`,
          hoverShadow: `shadow-inner shadow-black/30`,
          focusShadow: `shadow-inner shadow-black/30`,
          containerTransform: "translateY(0)",
          applyTopSpan: false,
        };
      case "themed-surface":
        return {
          bg: "transparent",
          borderClass: "border-none",
          borderColorStyle: undefined,
          borderBottomColorStyle: undefined,
          shadow: "shadow-none",
          hoverShadow: "shadow-none",
          focusShadow: "shadow-none",
          containerTransform: "translateY(0)",
          applyTopSpan: false,
        };
      default:
        const currentShadow = isFocused
          ? `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`
          : isHovered
            ? `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`
            : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`;
        return {
          bg: `${accentColor.value}30`,
          borderClass: "border-2 border-b-4 rounded-md",
          borderColorStyle: `${accentColor.value}60`,
          borderBottomColorStyle: accentColor.value,
          shadow: currentShadow,
          hoverShadow: `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
          focusShadow: `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
          containerTransform: isFocused ? "translateY(-5px)" : isHovered ? "translateY(-3px)" : "translateY(0)",
          applyTopSpan: true,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const inputContent = (
    <>
      {variantStyles.applyTopSpan && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
      )}
      <div
        className={cn(
          "flex items-center justify-center h-full text-white",
          sizeConfig[size].padding,
          variant === "themed-surface" ? "" : "w-10"
        )}
      >
        {loading ? (
          <Icon
            icon="solar:refresh-bold"
            className={cn("animate-spin", sizeConfig[size].icon)}
          />
        ) : (
          <Icon icon="solar:magnifer-bold" className={sizeConfig[size].icon} />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 h-full bg-transparent border-none outline-none text-white font-minecraft-ten placeholder:text-white/50",
          sizeConfig[size].text,
          sizeConfig[size].padding.replace("px-", "pr-"),
          variant === "themed-surface" ? "pl-0" : sizeConfig[size].padding.replace("px-", "pl-"),
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {value && !loading && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "flex items-center justify-center h-full transition-opacity duration-200 hover:opacity-80 text-white",
            sizeConfig[size].padding.replace("px-", "px-"),
            variant === "themed-surface" ? "w-auto" : "w-8"
          )}
          tabIndex={-1}
        >
          <Icon
            icon="solar:close-circle-bold"
            className={sizeConfig[size].icon}
          />
        </button>
      )}

      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          disabled={disabled || loading}
          className={cn(
            "flex items-center justify-center h-full transition-opacity duration-200 hover:opacity-80 text-white",
            sizeConfig[size].padding.replace("px-", "px-"),
            variant === "themed-surface" ? "border-l-0" : "border-l border-white/20",
            variant === "themed-surface" ? "w-auto" : ""
          )}
        >
          <Icon
            icon="solar:arrow-right-bold"
            className={sizeConfig[size].icon}
          />
        </button>
      )}
    </>
  );

  if (variant === "themed-surface") {
    return (
      <ThemedSurface 
        className={cn(sizeConfig[size].surfacePadding, className)}
      >
        <div className={cn("flex items-center w-full", sizeConfig[size].container)}>
         {inputContent}
        </div>
      </ThemedSurface>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center transition-all duration-200",
        variantStyles.borderClass,
        sizeConfig[size].container,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        backgroundColor: variantStyles.bg,
        borderColor: variantStyles.borderColorStyle,
        borderBottomColor: variantStyles.borderBottomColorStyle,
        boxShadow: variantStyles.shadow,
        transform: variantStyles.containerTransform,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {inputContent}
    </div>
  );
}
