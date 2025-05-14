"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

interface LabelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "ghost"
    | "warning"
    | "destructive"
    | "info"
    | "success";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  withAnimation?: boolean;
}

export const Label = forwardRef<HTMLDivElement, LabelProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      icon,
      iconPosition = "left",
      withAnimation = true,
      ...props
    },
    ref,
  ) => {
    const labelRef = useRef<HTMLDivElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);
    const [isHovered, setIsHovered] = useState(false);

    const mergedRef = (node: HTMLDivElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      labelRef.current = node;
    };

    useEffect(() => {
      if (withAnimation && labelRef.current) {
        gsap.fromTo(
          labelRef.current,
          { scale: 0.95, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          },
        );
      }
    }, [withAnimation]);

    const handleMouseEnter = () => {
      setIsHovered(true);

      if (labelRef.current && variant !== "ghost") {
        gsap.to(labelRef.current, {
          y: -2,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${getVariantColors().light}40, inset 0 0 0 1px ${getVariantColors().main}20`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);

      if (labelRef.current && variant !== "ghost") {
        gsap.to(labelRef.current, {
          y: 0,
          boxShadow: `0 6px 0 rgba(0,0,0,0.3), 0 8px 12px rgba(0,0,0,0.35), inset 0 1px 0 ${getVariantColors().light}40, inset 0 0 0 1px ${getVariantColors().main}20`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
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

    const sizeStyles = {
      xs: "py-0.5 px-1.5 text-sm",
      sm: "py-1 px-2 text-xl",
      md: "py-1.5 px-3 text-2xl",
      lg: "py-2 px-4 text-3xl",
      xl: "py-2.5 px-5 text-4xl",
    };

    const iconSizes = {
      xs: "w-3 h-3",
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
      xl: "w-7 h-7",
    };

    return (
      <div
        ref={mergedRef}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white tracking-wider",
          "inline-flex items-center justify-center",
          "text-shadow-sm",
          variant !== "ghost" &&
            "border-2 border-b-4 shadow-[0_6px_0_rgba(0,0,0,0.3),0_8px_12px_rgba(0,0,0,0.35)]",
          sizeStyles[size],
          className,
        )}
        style={{
          backgroundColor:
            variant === "ghost"
              ? "transparent"
              : `${colors.main}${isHovered ? "40" : "30"}`,
          borderColor:
            variant === "ghost"
              ? "transparent"
              : `${colors.main}${isHovered ? "90" : "80"}`,
          borderBottomColor: variant === "ghost" ? "transparent" : colors.dark,
          boxShadow:
            variant === "ghost"
              ? "none"
              : isHovered
                ? `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`
                : `0 6px 0 rgba(0,0,0,0.3), 0 8px 12px rgba(0,0,0,0.35), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`,
          color: colors.text,
          transform:
            isHovered && variant !== "ghost"
              ? "translateY(-2px)"
              : "translateY(0)",
          filter: isHovered ? "brightness(1.1)" : "brightness(1)",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {variant !== "ghost" && (
          <span
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
            style={{ backgroundColor: `${colors.light}80` }}
          />
        )}

        {variant !== "ghost" && (
          <>
            <span
              className="absolute inset-y-0 left-0 w-[1px]"
              style={{ backgroundColor: `${colors.light}40` }}
            />
            <span
              className="absolute inset-y-0 right-0 w-[1px]"
              style={{ backgroundColor: `${colors.dark}40` }}
            />
          </>
        )}

        <span
          className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent transition-opacity duration-300"
          style={{ opacity: isHovered ? 0.5 : 0.2 }}
        />

        {icon && iconPosition === "left" && (
          <span
            className={cn(
              "flex items-center justify-center mr-1.5 transition-transform duration-200",
              iconSizes[size],
            )}
            style={{
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
          >
            {icon}
          </span>
        )}
        <span className="relative z-10">{children}</span>
        {icon && iconPosition === "right" && (
          <span
            className={cn(
              "flex items-center justify-center ml-1.5 transition-transform duration-200",
              iconSizes[size],
            )}
            style={{
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
          >
            {icon}
          </span>
        )}
      </div>
    );
  },
);

Label.displayName = "Label";
