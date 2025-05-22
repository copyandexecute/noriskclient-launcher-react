"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  variant?: "default" | "flat";
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, variant = "default", ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );

    useEffect(() => {
      if (containerRef.current && isBackgroundAnimationEnabled) {
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
    }, [isBackgroundAnimationEnabled]);

    const handleFocus = () => {
      setIsFocused(true);
      if (
        containerRef.current &&
        isBackgroundAnimationEnabled &&
        variant !== "flat"
      ) {
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
      setIsFocused(false);
      if (
        containerRef.current &&
        isBackgroundAnimationEnabled &&
        variant !== "flat"
      ) {
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

      if (
        !isFocused &&
        containerRef.current &&
        isBackgroundAnimationEnabled &&
        variant !== "flat"
      ) {
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

      if (
        !isFocused &&
        containerRef.current &&
        isBackgroundAnimationEnabled &&
        variant !== "flat"
      ) {
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

    // Get border classes based on variant
    const getBorderClasses = () => {
      if (variant === "flat") {
        return "border border-b-2";
      }
      return "border-2 border-b-4";
    };

    const staticBoxShadow = error
      ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(239, 68, 68, 0.2), inset 0 0 0 1px rgba(239, 68, 68, 0.1)`
      : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`;

    let currentBoxShadow = variant === "flat" ? "none" : staticBoxShadow;
    if (isBackgroundAnimationEnabled && variant !== "flat") {
      if (isFocused) {
        currentBoxShadow = error
          ? `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(239, 68, 68, 0.4), inset 0 0 0 1px rgba(239, 68, 68, 0.2)`
          : `0 9px 0 rgba(0,0,0,0.2), 0 12px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
      } else if (isHovered) {
        currentBoxShadow = error
          ? `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 rgba(239, 68, 68, 0.3), inset 0 0 0 1px rgba(239, 68, 68, 0.15)`
          : `0 7px 0 rgba(0,0,0,0.2), 0 9px 13px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`;
      }
    }

    let currentTransform = "translateY(0)";
    if (isBackgroundAnimationEnabled && variant !== "flat") {
      if (isFocused) {
        currentTransform = "translateY(-5px)";
      } else if (isHovered) {
        currentTransform = "translateY(-3px)";
      }
    }

    return (
      <div className="w-full">
        <div
          ref={containerRef}
          className={cn(
            "relative rounded-md transition-all duration-200",
            getBorderClasses(),
            variant !== "flat" && "shadow-md",
            error ? "border-red-500" : "",
            props.disabled ? "opacity-50 cursor-not-allowed" : "",
            className,
          )}
          style={{
            backgroundColor: `${accentColor.value}${variant === "flat" ? "15" : "30"}`,
            borderColor: error
              ? "rgba(239, 68, 68, 0.6)"
              : `${accentColor.value}${variant === "flat" ? "40" : "60"}`,
            borderBottomColor: error ? "rgb(185, 28, 28)" : accentColor.value,
            boxShadow: currentBoxShadow,
            transform: currentTransform,
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

          <textarea
            ref={ref}
            className="w-full min-h-[100px] bg-transparent border-none outline-none p-3 text-white font-minecraft-ten text-xs placeholder:text-white/50 resize-y custom-scrollbar"
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
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

TextArea.displayName = "TextArea";
