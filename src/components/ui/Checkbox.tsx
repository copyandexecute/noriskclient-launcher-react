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
  variant?: "default" | "flat" | "3d";
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      customSize = "md",
      variant = "default",
      ...props
    },
    ref,
  ) => {
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
    }, [isBackgroundAnimationEnabled]);

    const handleMouseEnter = () => {
      if (props.disabled) return;
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      if (props.disabled) return;
      setIsHovered(false);
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

    const getBorderClasses = () => {
      if (variant === "3d") {
        return "border-2 border-b-3";
      }
      return "border border-b-2";
    };

    const getBackgroundColor = () => {
      if (props.checked) {
        return `${accentColor.value}${isHovered ? "90" : "80"}`;
      }

      return isHovered ? `${accentColor.value}25` : `${accentColor.value}15`;
    };

    const getBorderColor = () => {
      if (props.checked) {
        return accentColor.value;
      }

      return isHovered ? `${accentColor.value}50` : `${accentColor.value}40`;
    };

    const getBorderBottomColor = () => {
      if (props.checked) {
        return accentColor.dark;
      }

      return accentColor.value;
    };

    const getBoxShadow = () => {
      if (variant === "3d") {
        return `0 2px 0 rgba(0,0,0,0.2)`;
      }
      return "none";
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
              getBorderClasses(),
              "flex items-center justify-center",
              "overflow-hidden",
            )}
            style={{
              backgroundColor: getBackgroundColor(),
              borderColor: getBorderColor(),
              borderBottomColor: getBorderBottomColor(),
              boxShadow: getBoxShadow(),
              filter:
                isHovered && !props.disabled
                  ? "brightness(1.1)"
                  : "brightness(1)",
            }}
          >
            {props.checked && (
              <Icon
                icon="solar:unread-outline"
                className="w-4 h-4 text-white"
              />
            )}
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
