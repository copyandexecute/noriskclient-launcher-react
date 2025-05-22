"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../../store/useThemeStore";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "ghost"
    | "warning"
    | "destructive"
    | "info"
    | "success"
    | "flat";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  shadowDepth?: "default" | "short" | "none";
  widthClassName?: string;
  heightClassName?: string;
}

interface RippleType {
  x: number;
  y: number;
  size: number;
  id: number;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      disabled = false,
      icon,
      iconPosition = "left",
      shadowDepth = "short",
      onClick,
      widthClassName,
      heightClassName,
      ...props
    },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ripples, setRipples] = useState<RippleType[]>([]);
    const rippleCounter = useRef(0);
    const accentColor = useThemeStore((state) => state.accentColor);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const mergedRef = (node: HTMLButtonElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      buttonRef.current = node;
    };

    useEffect(() => {
      if (buttonRef.current && isBackgroundAnimationEnabled) {
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
    }, [isBackgroundAnimationEnabled]);

    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();

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
      if (disabled) return;
      setIsPressed(true);

      if (buttonRef.current && isBackgroundAnimationEnabled) {
        gsap.to(buttonRef.current, {
          scale: 0.95,
          duration: 0.1,
          ease: "power2.out",
        });
      }
    };

    const handleMouseUp = () => {
      if (disabled) return;
      setIsPressed(false);

      if (buttonRef.current && isBackgroundAnimationEnabled) {
        gsap.to(buttonRef.current, {
          scale: 1,
          duration: 0.2,
          ease: "elastic.out(1.2, 0.4)",
        });
      }
    };

    const handleMouseEnter = () => {
      if (disabled) return;
      setIsHovered(true);

      if (
        buttonRef.current &&
        isBackgroundAnimationEnabled &&
        shouldShowShadow()
      ) {
        gsap.to(buttonRef.current, {
          boxShadow: `0 6px 0 rgba(0,0,0,0.25), 0 8px 12px rgba(0,0,0,0.4)`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      if (disabled) return;
      setIsHovered(false);

      if (
        buttonRef.current &&
        isBackgroundAnimationEnabled &&
        shouldShowShadow()
      ) {
        gsap.to(buttonRef.current, {
          boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35)`,
          duration: 0.2,
          ease: "power2.out",
        });
      }

      if (isPressed) {
        handleMouseUp();
      }
    };

    const shouldShowShadow = () => {
      return (
        variant !== "ghost" && variant !== "flat" && shadowDepth !== "none"
      );
    };

    const getVariantColors = () => {
      switch (variant) {
        case "warning":
          return {
            main: "#f59e0b",
            light: "#fbbf24",
            dark: "#d97706",
            text: "#fef3c7",
          };
        case "destructive":
          return {
            main: "#ef4444",
            light: "#f87171",
            dark: "#dc2626",
            text: "#fee2e2",
          };
        case "info":
          return {
            main: "#3b82f6",
            light: "#60a5fa",
            dark: "#2563eb",
            text: "#dbeafe",
          };
        case "success":
          return {
            main: "#10b981",
            light: "#34d399",
            dark: "#059669",
            text: "#d1fae5",
          };
        case "secondary":
          return {
            main: "#6b7280",
            light: "#9ca3af",
            dark: "#4b5563",
            text: "#f3f4f6",
          };
        case "ghost":
          return {
            main: accentColor.value,
            light: accentColor.hoverValue || accentColor.value,
            dark: accentColor.value,
            text: "#ffffff",
          };
        case "flat":
          return {
            main: accentColor.value,
            light: accentColor.hoverValue || accentColor.value,
            dark: accentColor.value,
            text: "#ffffff",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.hoverValue || accentColor.value,
            dark: accentColor.value,
            text: "#ffffff",
          };
      }
    };

    const colors = getVariantColors();

    const sizeStyles = {
      xs: "h-[32px] py-1 px-3 text-sm min-w-[100px]",
      sm: "h-[42px] py-2 px-6 text-xl min-w-[140px]",
      md: "h-[50px] py-2.5 px-8 text-2xl min-w-[180px]",
      lg: "h-[58px] py-3 px-10 text-3xl min-w-[220px]",
      xl: "h-[66px] py-4 px-12 text-4xl min-w-[260px]",
      xxl: "h-[74px] py-5 px-14 text-5xl min-w-[300px]",
    };

    const getBackgroundColor = () => {
      if (variant === "ghost") {
        return isHovered ? `${colors.main}50` : `${colors.main}30`;
      }

      if (variant === "flat")
        return isHovered ? `${colors.main}25` : `${colors.main}15`;

      const baseOpacity = isHovered ? "50" : "30";
      return `${colors.main}${baseOpacity}`;
    };

    const getBorderColor = () => {
      if (variant === "ghost") {
        return isHovered ? `${colors.light}` : `${colors.main}80`;
      }

      if (variant === "flat")
        return isHovered ? `${colors.main}50` : `${colors.main}40`;

      return isHovered ? `${colors.light}` : `${colors.main}80`;
    };

    const getBorderBottomColor = () => {
      if (variant === "ghost") {
        return isHovered ? colors.light : colors.dark;
      }

      if (variant === "flat") return colors.main;

      return isHovered ? colors.light : colors.dark;
    };

    const getBorderClasses = () => {
      if (variant === "ghost" || variant === "flat") {
        return "border border-b-2";
      }

      if (shadowDepth === "none") {
        return "border-2";
      }

      return "border-2 border-b-4";
    };

    const getShadowClasses = () => {
      if (variant === "ghost" || variant === "flat" || shadowDepth === "none") {
        return "";
      }

      return shadowDepth === "default"
        ? "shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]"
        : "shadow-[0_4px_0_rgba(0,0,0,0.3),0_6px_10px_rgba(0,0,0,0.35)]";
    };

    const getBoxShadow = () => {
      if (shadowDepth === "default") {
        return "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35)";
      } else {
        return "0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35)";
      }
    };

    return (
      <button
        ref={mergedRef}
        disabled={disabled}
        onClick={handleRipple}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white tracking-wider lowercase",
          "flex items-center justify-center gap-2",
          "text-shadow-sm whitespace-nowrap",
          getBorderClasses(),
          getShadowClasses(),
          "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-black/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizeStyles[size],
          className,
          widthClassName,
          heightClassName,
        )}
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderBottomColor: getBorderBottomColor(),
          boxShadow: shouldShowShadow() ? getBoxShadow() : "none",
          color: colors.text,
          filter: isHovered && !disabled ? "brightness(1.1)" : "brightness(1)",
        }}
        {...props}
      >
        {variant !== "ghost" && (
          <span
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm transition-colors duration-200"
            style={{
              backgroundColor: isHovered
                ? `${colors.light}`
                : `${colors.light}80`,
              opacity: isHovered ? 1 : 0.8,
            }}
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

        <div
          className="flex items-center justify-center gap-2 transition-transform duration-200"
          style={{
            transform: isHovered && !disabled ? "scale(1.05)" : "scale(1)",
          }}
        >
          {icon && iconPosition === "left" && (
            <span className="flex items-center justify-center">{icon}</span>
          )}
          <span className="relative z-10">{children}</span>
          {icon && iconPosition === "right" && (
            <span className="flex items-center justify-center">{icon}</span>
          )}
        </div>
      </button>
    );
  },
);

Button.displayName = "Button";
