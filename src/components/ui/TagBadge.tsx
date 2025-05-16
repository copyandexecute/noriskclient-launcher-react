"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";

interface TagBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "success"
    | "info"
    | "inactive"
    | "destructive"
    | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  withIcon?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  shadowDepth?: "default" | "short" | "none";
}

interface RippleType {
  x: number;
  y: number;
  size: number;
  id: number;
}

export const TagBadge = forwardRef<HTMLDivElement, TagBadgeProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      withIcon = false,
      onClick,
      disabled = false,
      shadowDepth = "short",
      ...props
    },
    ref,
  ) => {
    const badgeRef = useRef<HTMLDivElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<RippleType[]>([]);
    const rippleCounter = useRef(0);
    const isFirstRender = useRef(true);

    const isClickable = !!onClick && !disabled;

    const mergedRef = (node: HTMLDivElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      badgeRef.current = node;
    };

    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (badgeRef.current) {
        gsap.fromTo(
          badgeRef.current,
          { scale: 0.95, opacity: 0.8 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          },
        );
      }
    }, []);

    const handleRipple = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !isClickable) return;

      const badge = badgeRef.current;
      if (!badge) return;

      const rect = badge.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const size = Math.max(rect.width, rect.height) * 2.5;

      const newRipple: RippleType = {
        x,
        y,
        size,
        id: rippleCounter.current,
      };

      rippleCounter.current += 1;

      setRipples((prevRipples) => [...prevRipples, newRipple]);

      setTimeout(() => {
        setRipples((prevRipples) =>
          prevRipples.filter((ripple) => ripple.id !== newRipple.id),
        );
      }, 850);

      if (onClick) onClick(e);
    };

    const handleMouseDown = () => {
      if (disabled || !isClickable) return;
      setIsPressed(true);

      if (badgeRef.current && isBackgroundAnimationEnabled) {
        gsap.to(badgeRef.current, {
          scale: 0.95,
          duration: 0.1,
          ease: "power2.out",
        });
      }
    };

    const handleMouseUp = () => {
      if (disabled || !isClickable) return;
      setIsPressed(false);

      if (badgeRef.current && isBackgroundAnimationEnabled) {
        gsap.to(badgeRef.current, {
          scale: 1,
          duration: 0.2,
          ease: "elastic.out(1.2, 0.4)",
        });
      }
    };

    const handleMouseEnter = () => {
      if (disabled) return;
      setIsHovered(true);

      if (badgeRef.current && isClickable && isBackgroundAnimationEnabled) {
        gsap.to(badgeRef.current, {
          y: -2,
          boxShadow: getShadowStyle(true),
          duration: 0.2,
          ease: "power2.out",
        });
      } else if (badgeRef.current && isClickable) {
        // Apply styles directly if animations are disabled
        badgeRef.current.style.transform = "translateY(-2px)";
        badgeRef.current.style.boxShadow = getShadowStyle(true);
      }
    };

    const handleMouseLeave = () => {
      if (disabled) return;
      setIsHovered(false);

      if (badgeRef.current && isClickable && isBackgroundAnimationEnabled) {
        gsap.to(badgeRef.current, {
          y: 0,
          boxShadow: getShadowStyle(false),
          duration: 0.2,
          ease: "power2.out",
        });
      } else if (badgeRef.current && isClickable) {
        // Apply styles directly if animations are disabled
        badgeRef.current.style.transform = "translateY(0px)";
        badgeRef.current.style.boxShadow = getShadowStyle(false);
      }

      if (isPressed) {
        handleMouseUp();
      }
    };

    const getVariantStyles = () => {
      switch (variant) {
        case "destructive":
          return {
            main: "#ef4444",
            light: "#f87171",
            dark: "#dc2626",
            text: "#fee2e2",
            bg: "rgba(239, 68, 68, 0.2)",
          };
        case "success":
          return {
            main: "#10b981",
            light: "#34d399",
            dark: "#059669",
            text: "#d1fae5",
            bg: "rgba(16, 185, 129, 0.2)",
          };
        case "info":
          return {
            main: "#3b82f6",
            light: "#60a5fa",
            dark: "#2563eb",
            text: "#dbeafe",
            bg: "rgba(59, 130, 246, 0.2)",
          };
        case "warning":
          return {
            main: "#f59e0b",
            light: "#fbbf24",
            dark: "#d97706",
            text: "#fef3c7",
            bg: "rgba(245, 158, 11, 0.2)",
          };
        case "inactive":
          return {
            main: "#6b7280",
            light: "#9ca3af",
            dark: "#4b5563",
            text: "#f3f4f6",
            bg: "rgba(107, 114, 128, 0.2)",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.hoverValue || accentColor.value,
            dark: accentColor.value,
            text: "#ffffff",
            bg: `${accentColor.value}20`,
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case "sm":
          return "px-2 py-1 text-xs rounded-md min-h-[24px]";
        case "lg":
          return "px-4 py-1.5 text-base rounded-md min-h-[36px]";
        case "xl":
          return "px-5 py-2 text-lg rounded-md min-h-[44px]";
        default: // 'md'
          return "px-2 py-1 text-[0.5em] rounded-md min-h-[15px]";
      }
    };

    const getShadowStyle = (isHovered: boolean) => {
      if (shadowDepth === "none") return "none";

      const colors = getVariantStyles();

      if (shadowDepth === "short") {
        return isHovered
          ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 8px rgba(0,0,0,0.25), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`
          : `0 2px 0 rgba(0,0,0,0.15), 0 3px 5px rgba(0,0,0,0.2), inset 0 1px 0 ${colors.light}30, inset 0 0 0 1px ${colors.main}15`;
      }

      return isHovered
        ? `0 6px 0 rgba(0,0,0,0.2), 0 8px 12px rgba(0,0,0,0.3), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`
        : `0 4px 0 rgba(0,0,0,0.15), 0 5px 8px rgba(0,0,0,0.25), inset 0 1px 0 ${colors.light}30, inset 0 0 0 1px ${colors.main}15`;
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();
    const initialShadow = getShadowStyle(false);

    return (
      <div
        ref={mergedRef}
        className={cn(
          "inline-flex items-center justify-center relative overflow-hidden",
          sizeStyles,
          "font-medium backdrop-blur-sm transition-all duration-150",
          withIcon ? "gap-1.5" : "",
          isClickable ? "cursor-pointer" : "",
          disabled ? "opacity-50 cursor-not-allowed" : "",
          shadowDepth !== "none" && "border-2",
          className,
        )}
        style={{
          backgroundColor: variantStyles.bg,
          borderColor:
            isHovered && isClickable ? variantStyles.light : variantStyles.main,
          borderBottomColor:
            isHovered && isClickable ? variantStyles.light : variantStyles.dark,
          color: variantStyles.text,
          boxShadow: initialShadow,
          transform:
            isHovered && isClickable && !disabled
              ? "translateY(-2px)"
              : "translateY(0)",
          filter:
            isHovered && isClickable && !disabled
              ? "brightness(1.1)"
              : "brightness(1)",
          letterSpacing: "0.01em",
          textTransform: "capitalize",
        }}
        onClick={isClickable ? handleRipple : undefined}
        onMouseDown={isClickable ? handleMouseDown : undefined}
        onMouseUp={isClickable ? handleMouseUp : undefined}
        onMouseEnter={isClickable ? handleMouseEnter : undefined}
        onMouseLeave={isClickable ? handleMouseLeave : undefined}
        {...props}
      >
        {shadowDepth !== "none" && (
          <span
            className="absolute inset-x-0 top-0 h-[1px] rounded-t-sm transition-colors duration-200"
            style={{
              backgroundColor:
                isHovered && isClickable
                  ? variantStyles.light
                  : `${variantStyles.light}80`,
              opacity: isHovered && isClickable ? 1 : 0.8,
            }}
          />
        )}

        {isClickable && (
          <span
            className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent transition-opacity duration-300"
            style={{ opacity: isHovered ? 0.4 : 0 }}
          />
        )}

        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none bg-white/30 animate-ripple"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}

        <span className="relative z-10 flex items-center gap-1.5 font-minecraft-ten">
          {children}
        </span>
      </div>
    );
  },
);

TagBadge.displayName = "TagBadge";
