"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  valueLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "flat" | "3d";
}

export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  valueLabel,
  minLabel,
  maxLabel,
  disabled = false,
  showValue = true,
  size = "md",
  className,
  variant = "default",
}: RangeSliderProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const valueDisplayRef = useRef<HTMLDivElement>(null);

  const sizeConfig = {
    sm: {
      track: "h-4",
      thumb: "h-6 w-6",
    },
    md: {
      track: "h-6",
      thumb: "h-8 w-8",
    },
    lg: {
      track: "h-8",
      thumb: "h-10 w-10",
    },
  };

  useEffect(() => {
    if (sliderRef.current && isBackgroundAnimationEnabled) {
      gsap.fromTo(
        sliderRef.current,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, [isBackgroundAnimationEnabled]);

  const percentage = ((value - min) / (max - min)) * 100;

  useEffect(() => {
    if (progressRef.current && thumbRef.current) {
      progressRef.current.style.width = `${percentage}%`;

      const thumbSizePx = size === "sm" ? 24 : size === "lg" ? 40 : 32;
      const thumbOffset =
        thumbSizePx / (size === "sm" ? 4 : size === "lg" ? 4 : 4);

      thumbRef.current.style.left = `calc(${percentage}% - ${thumbOffset}px)`;

      if (valueDisplayRef.current && isBackgroundAnimationEnabled) {
        gsap.to(valueDisplayRef.current, {
          scale: 1.1,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
        });
      }
    }
  }, [percentage, size, isBackgroundAnimationEnabled]);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);

    if (isBackgroundAnimationEnabled) {
      if (thumbRef.current) {
        gsap.to(thumbRef.current, {
          scale: 1.1,
          boxShadow:
            variant === "3d"
              ? "0 6px 0 rgba(0,0,0,0.25), 0 8px 15px rgba(0,0,0,0.4)"
              : `0 0 10px ${accentColor.value}60`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
      if (trackRef.current && variant === "3d") {
        gsap.to(trackRef.current, {
          boxShadow: `0 6px 0 rgba(0,0,0,0.25), 0 8px 15px rgba(0,0,0,0.3), inset 0 1px 0 ${accentColor.value}30, inset 0 0 0 1px ${accentColor.value}15`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);

    if (isBackgroundAnimationEnabled) {
      if (thumbRef.current && !isDragging) {
        gsap.to(thumbRef.current, {
          scale: 1,
          boxShadow:
            variant === "3d"
              ? "0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35)"
              : `0 0 0 1px ${accentColor.value}60`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
      if (trackRef.current && variant === "3d") {
        gsap.to(trackRef.current, {
          boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    }
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsDragging(true);

    if (thumbRef.current && isBackgroundAnimationEnabled) {
      gsap.to(thumbRef.current, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.out",
      });
    }
  };

  const handleMouseUp = () => {
    if (disabled) return;
    setIsDragging(false);

    if (thumbRef.current && isBackgroundAnimationEnabled) {
      gsap.to(thumbRef.current, {
        scale: isHovered ? 1.1 : 1,
        duration: 0.2,
        ease: "elastic.out(1.2, 0.4)",
      });
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, isBackgroundAnimationEnabled]);

  const getBorderClasses = () => {
    if (variant === "3d") {
      return "border-2 border-b-4 shadow-[0_4px_0_rgba(0,0,0,0.3),0_6px_10px_rgba(0,0,0,0.35)]";
    }
    return "border border-white/10";
  };

  const getThumbBorderClasses = () => {
    if (variant === "3d") {
      return "border-2 border-b-4 shadow-[0_4px_0_rgba(0,0,0,0.3),0_6px_10px_rgba(0,0,0,0.35)]";
    }
    return "border border-white/20";
  };

  return (
    <div
      ref={sliderRef}
      className={cn(
        "relative",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {valueLabel && (
        <div className="text-center mb-3">
          <span
            className={cn(
              "text-white font-minecraft-ten text-xs tracking-wide",
            )}
          >
            {valueLabel}
          </span>
        </div>
      )}

      <div className="mb-4">
        {showValue && (
          <div className="flex justify-between mb-2">
            {minLabel && (
              <span className={cn("text-white/70 font-minecraft-ten text-xs")}>
                {minLabel}
              </span>
            )}
            <span
              ref={valueDisplayRef}
              className={cn("text-white font-minecraft-ten text-xs")}
            >
              {value}
            </span>
            {maxLabel && (
              <span className={cn("text-white/70 font-minecraft-ten text-xs")}>
                {maxLabel}
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            "relative rounded-md overflow-hidden backdrop-blur-md transition-colors duration-200",
            getBorderClasses(),
            "focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-1 focus-within:ring-offset-black/20",
            sizeConfig[size].track,
          )}
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor:
              variant === "3d"
                ? `${accentColor.value}40`
                : `${accentColor.value}30`,
            borderBottomColor:
              variant === "3d" ? accentColor.value : `${accentColor.value}30`,
            boxShadow:
              variant === "3d"
                ? `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`
                : `0 0 0 1px ${accentColor.value}20`,
          }}
          ref={trackRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {variant === "3d" && (
            <span
              className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
              style={{
                backgroundColor: `${accentColor.value}80`,
                opacity: isHovered ? 1 : 0.8,
              }}
            />
          )}

          <div
            ref={progressRef}
            className="absolute h-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: `${accentColor.value}40`,
            }}
          />

          <div
            ref={thumbRef}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full",
              getThumbBorderClasses(),
              "flex items-center justify-center",
              sizeConfig[size].thumb,
            )}
            style={{
              backgroundColor: `${accentColor.value}50`,
              borderColor:
                variant === "3d"
                  ? `${accentColor.value}80`
                  : `${accentColor.value}60`,
              borderBottomColor:
                variant === "3d" ? accentColor.value : `${accentColor.value}60`,
              boxShadow:
                variant === "3d"
                  ? `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`
                  : `0 0 0 1px ${accentColor.value}60`,
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent transition-opacity duration-300 rounded-full"
              style={{ opacity: isHovered ? 0.5 : 0 }}
            />
          </div>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueLabel ? `${valueLabel}: ${value}` : `${value}`}
      />
    </div>
  );
}
