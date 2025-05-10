"use client";

import type React from "react";
import { forwardRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";

// @ts-ignore
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, size, ...props }, ref) => {
    const accentColor = useThemeStore((state) => state.accentColor);

    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    return (
      <label
        className={cn(
          "flex items-start gap-3 cursor-pointer",
          props.disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <div className="relative flex-shrink-0 mt-1">
          <input
            type="checkbox"
            ref={ref}
            className={cn("sr-only", sizeClasses[size || "md"])}
            {...props}
          />
          <div
            className={cn(
              "w-6 h-6 rounded-sm transition-all duration-200",
              "border-2 border-b-3 flex items-center justify-center",
            )}
            style={{
              backgroundColor: props.checked
                ? `${accentColor.value}80`
                : `${accentColor.value}20`,
              borderColor: props.checked
                ? `${accentColor.value}`
                : `${accentColor.value}60`,
              borderBottomColor: props.checked
                ? accentColor.dark
                : `${accentColor.value}80`,
              boxShadow: `0 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
            }}
          >
            {props.checked && (
              <Icon icon="solar:check-bold" className="w-4 h-4 text-white" />
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
              <span className="text-white/60 font-minecraft text-xl lowercase">
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
