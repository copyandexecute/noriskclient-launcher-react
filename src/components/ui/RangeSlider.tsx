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
}: RangeSliderProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
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
  }, []);

  // Calculate percentage directly from value
  const percentage = ((value - min) / (max - min)) * 100;

  // Update both progress bar and thumb position simultaneously
  useEffect(() => {
    if (progressRef.current && thumbRef.current) {
      // Update without animation to prevent delay
      progressRef.current.style.width = `${percentage}%`;
      thumbRef.current.style.left = `calc(${percentage}% - 16px)`;
    }
  }, [percentage]);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);

    if (thumbRef.current) {
      gsap.to(thumbRef.current, {
        scale: 1.1,
        boxShadow: "0 6px 0 rgba(0,0,0,0.25), 0 8px 15px rgba(0,0,0,0.4)",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);

    if (thumbRef.current && !isDragging) {
      gsap.to(thumbRef.current, {
        scale: 1,
        boxShadow: "0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35)",
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsDragging(true);

    if (thumbRef.current) {
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

    if (thumbRef.current) {
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
  }, [isDragging]);

  return (
    <div
      ref={sliderRef}
      className={cn("relative", disabled && "opacity-50 cursor-not-allowed")}
    >
      {valueLabel && (
        <div className="text-center mb-3">
          <span className="text-xl text-white font-minecraft lowercase tracking-wide">
            {valueLabel}
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          {minLabel && (
            <span className="text-lg text-white/70 font-minecraft lowercase">
              {minLabel}
            </span>
          )}
          <span className="text-xl text-white font-minecraft lowercase">
            {value}
          </span>
          {maxLabel && (
            <span className="text-lg text-white/70 font-minecraft lowercase">
              {maxLabel}
            </span>
          )}
        </div>

        <div
          className={cn(
            "relative h-6 rounded-md overflow-hidden backdrop-blur-md transition-colors duration-200",
            "border-2 border-b-4 shadow-[0_4px_0_rgba(0,0,0,0.3),0_6px_10px_rgba(0,0,0,0.35)]",
            "focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-1 focus-within:ring-offset-black/20",
          )}
          style={{
            backgroundColor: `${accentColor.value}15`,
            borderColor: `${accentColor.value}40`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
          ref={trackRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
            style={{
              backgroundColor: `${accentColor.value}80`,
              opacity: isHovered ? 1 : 0.8,
            }}
          />

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
              "absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
              "border-2 border-b-4 shadow-[0_4px_0_rgba(0,0,0,0.3),0_6px_10px_rgba(0,0,0,0.35)]",
              "flex items-center justify-center",
            )}
            style={{
              left: `calc(${percentage}% - 16px)`,
              backgroundColor: `${accentColor.value}50`,
              borderColor: `${accentColor.value}80`,
              borderBottomColor: accentColor.value,
              boxShadow: `0 4px 0 rgba(0,0,0,0.3), 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
              transform: `translateY(-50%) scale(${isDragging ? 0.95 : isHovered ? 1.1 : 1})`,
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent transition-opacity duration-300"
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