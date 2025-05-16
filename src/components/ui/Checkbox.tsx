"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  description?: string;
  customSize?: "sm" | "md" | "lg";
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, customSize = "md", ...props }, ref) => {
    const accentColor = useThemeStore((state) => state.accentColor);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );
    const checkboxRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    useEffect(() => {
      if (labelRef.current && isBackgroundAnimationEnabled) {
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
    }, []);

    const handleMouseEnter = () => {
      if (props.disabled) return;
      setIsHovered(true);

      if (checkboxRef.current && isBackgroundAnimationEnabled) {
        gsap.to(checkboxRef.current, {
          y: -2,
          boxShadow: `0 4px 0 rgba(0,0,0,0.25), 0 6px 8px rgba(0,0,0,0.3), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      if (props.disabled) return;
      setIsHovered(false);

      if (checkboxRef.current && isBackgroundAnimationEnabled) {
        gsap.to(checkboxRef.current, {
          y: 0,
          boxShadow: `0 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (props.disabled) return;

      if (checkboxRef.current && isBackgroundAnimationEnabled) {
        gsap.to(checkboxRef.current, {
          scale: 0.9,
          duration: 0.1,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(checkboxRef.current, {
              scale: 1,
              duration: 0.2,
              ease: "elastic.out(1.2, 0.4)",
            });
          },
        });
      }

      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <label
        ref={labelRef}
        className={cn(
          "flex items-start gap-3 cursor-pointer",
          props.disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative flex-shrink-0 mt-1">
          <input
            type="checkbox"
            ref={ref}
            className="sr-only"
            onChange={handleChange}
            {...props}
          />
          <div
            ref={checkboxRef}
            className={cn(
              "w-6 h-6 rounded-sm transition-all duration-200",
              "border-2 border-b-3 flex items-center justify-center",
              "overflow-hidden",
            )}
            style={{
              backgroundColor: props.checked
                ? `${accentColor.value}${isHovered ? "90" : "80"}`
                : `${accentColor.value}${isHovered ? "30" : "20"}`,
              borderColor: props.checked
                ? `${accentColor.value}`
                : `${accentColor.value}${isHovered ? "70" : "60"}`,
              borderBottomColor: props.checked
                ? accentColor.dark
                : `${accentColor.value}${isHovered ? "90" : "80"}`,
              boxShadow: `0 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
              transform: "translateY(0)",
            }}
          >
            {props.checked && (
              <Icon
                icon="solar:unread-outline"
                className="w-4 h-4 text-white"
              />
            )}

            <span
              className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent transition-opacity duration-300"
              style={{ opacity: isHovered ? 0.5 : 0 }}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-white font-minecraft text-2xl lowercase">
                {label}
              </span>
            )}
            {description && (
              <span className="text-white/60 font-minecraft-ten text-xs">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
