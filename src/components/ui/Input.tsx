"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  error?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "flat";
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      icon,
      clearable = false,
      onClear,
      error,
      size = "md",
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);

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
      if (props.disabled) return;
      setIsFocused(true);

      if (containerRef.current && variant !== "flat") {
        gsap.to(containerRef.current, {
          y: -5,
          boxShadow: error
            ? `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(239, 68, 68, 0.4), inset 0 0 0 1px rgba(239, 68, 68, 0.2)`
            : `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleBlur = () => {
      if (props.disabled) return;
      setIsFocused(false);

      if (containerRef.current && variant !== "flat") {
        gsap.to(containerRef.current, {
          y: 0,
          boxShadow: error
            ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(239, 68, 68, 0.2), inset 0 0 0 1px rgba(239, 68, 68, 0.1)`
            : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseEnter = () => {
      if (props.disabled) return;
      setIsHovered(true);

      if (!isFocused && containerRef.current && variant !== "flat") {
        gsap.to(containerRef.current, {
          y: -3,
          boxShadow: error
            ? `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 rgba(239, 68, 68, 0.3), inset 0 0 0 1px rgba(239, 68, 68, 0.15)`
            : `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      if (props.disabled) return;
      setIsHovered(false);

      if (!isFocused && containerRef.current && variant !== "flat") {
        gsap.to(containerRef.current, {
          y: 0,
          boxShadow: error
            ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(239, 68, 68, 0.2), inset 0 0 0 1px rgba(239, 68, 68, 0.1)`
            : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (props.onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };

    const sizeClasses = {
      sm: "h-10",
      md: "h-12",
      lg: "h-14",
    };

    const inputSizeClasses = {
      sm: "text-xl",
      md: "text-2xl",
      lg: "text-3xl",
    };

    // Get border classes based on variant
    const getBorderClasses = () => {
      if (variant === "flat") {
        return "border border-b-2";
      }
      return "border-2 border-b-4";
    };

    return (
      <div className="w-full">
        <div
          ref={containerRef}
          className={cn(
            "relative rounded-md transition-all duration-200",
            getBorderClasses(),
            "overflow-hidden",
            error ? "border-red-500" : "",
            props.disabled ? "opacity-50 cursor-not-allowed" : "",
            sizeClasses[size],
            className,
          )}
          style={{
            backgroundColor: `${accentColor.value}${variant === "flat" ? "15" : "30"}`,
            borderColor: error
              ? "rgba(239, 68, 68, 0.6)"
              : `${accentColor.value}${variant === "flat" ? "40" : "60"}`,
            borderBottomColor: error ? "rgb(185, 28, 28)" : accentColor.value,
            boxShadow:
              variant === "flat"
                ? "none"
                : isFocused
                  ? `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${error ? "rgba(239, 68, 68, 0.4)" : `${accentColor.value}40`}, inset 0 0 0 1px ${error ? "rgba(239, 68, 68, 0.2)" : `${accentColor.value}20`}`
                  : isHovered
                    ? `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${error ? "rgba(239, 68, 68, 0.3)" : `${accentColor.value}30`}, inset 0 0 0 1px ${error ? "rgba(239, 68, 68, 0.15)" : `${accentColor.value}15`}`
                    : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${error ? "rgba(239, 68, 68, 0.2)" : `${accentColor.value}20`}, inset 0 0 0 1px ${error ? "rgba(239, 68, 68, 0.1)" : `${accentColor.value}10`}`,
            transform:
              variant === "flat"
                ? "none"
                : isFocused
                  ? "translateY(-5px)"
                  : isHovered
                    ? "translateY(-3px)"
                    : "translateY(0)",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {variant !== "flat" && (
            <span
              className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
              style={{
                backgroundColor: error
                  ? "rgba(239, 68, 68, 0.8)"
                  : `${accentColor.value}80`,
              }}
            />
          )}

          <div className="flex items-center h-full w-full">
            {icon && (
              <div className="flex items-center justify-center w-10 h-full text-white">
                {icon}
              </div>
            )}

            <input
              ref={ref}
              className={cn(
                "flex-1 h-full bg-transparent border-none outline-none px-3 py-2 text-white font-minecraft placeholder:text-white/50 lowercase",
                inputSizeClasses[size],
              )}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />

            {clearable && props.value && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center w-10 h-full transition-opacity duration-200 hover:opacity-80 text-white"
                tabIndex={-1}
              >
                <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-1 text-xl text-red-400 font-minecraft lowercase">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
