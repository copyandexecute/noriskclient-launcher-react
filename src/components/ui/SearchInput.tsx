"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSearch?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "filled";
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
    },
    md: {
      container: "h-10",
      text: "text-base",
      icon: "w-4 h-4",
      padding: "px-3",
    },
    lg: {
      container: "h-12",
      text: "text-lg",
      icon: "w-5 h-5",
      padding: "px-4",
    },
  };

  useEffect(() => {
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
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setIsFocused(true);

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: -5,
        boxShadow: `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleBlur = () => {
    if (disabled) return;
    setIsFocused(false);

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: 0,
        boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);

    if (!isFocused && containerRef.current) {
      gsap.to(containerRef.current, {
        y: -3,
        boxShadow: `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);

    if (!isFocused && containerRef.current) {
      gsap.to(containerRef.current, {
        y: 0,
        boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
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
          border: "border-b-2 border-white/30 rounded-none",
          shadow: "shadow-none",
          hoverShadow: "shadow-none",
          focusShadow: "shadow-none",
        };
      case "filled":
        return {
          bg: `${accentColor.value}40`,
          border: "border-none rounded-md",
          shadow: `shadow-inner shadow-black/20`,
          hoverShadow: `shadow-inner shadow-black/30`,
          focusShadow: `shadow-inner shadow-black/30`,
        };
      default:
        return {
          bg: `${accentColor.value}30`,
          border: "border-2 border-b-4 rounded-md",
          shadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          hoverShadow: `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
          focusShadow: `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2 text-white font-minecraft lowercase rounded-md transition-all duration-200",
        "border-2 border-b-4 overflow-hidden",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
      style={{
        backgroundColor: variantStyles.bg,
        borderColor:
          variant === "default" ? `${accentColor.value}60` : undefined,
        borderBottomColor:
          variant === "default" ? accentColor.value : undefined,
        boxShadow: variantStyles.shadow,
        transform: isFocused
          ? "translateY(-5px)"
          : isHovered
            ? "translateY(-3px)"
            : "translateY(0)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {variant === "default" && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
      )}

      <div
        className={cn(
          "flex items-center justify-center w-10 h-full text-white",
          sizeConfig[size].padding,
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
          "flex-1 h-full bg-transparent border-none outline-none text-white font-minecraft placeholder:text-white/50 lowercase",
          sizeConfig[size].text,
          sizeConfig[size].padding,
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {value && !loading && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "flex items-center justify-center w-8 h-full transition-opacity duration-200 hover:opacity-80 text-white",
            sizeConfig[size].padding,
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
            sizeConfig[size].padding,
            "border-l border-white/20",
          )}
        >
          <Icon
            icon="solar:arrow-right-bold"
            className={sizeConfig[size].icon}
          />
        </button>
      )}
    </div>
  );
}
