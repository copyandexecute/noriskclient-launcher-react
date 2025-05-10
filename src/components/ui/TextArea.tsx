"use client";

import type React from "react";
import { forwardRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const accentColor = useThemeStore((state) => state.accentColor);

    return (
      <div className="w-full">
        <div
          className={cn(
            "relative rounded-md transition-all duration-200",
            "border-2 border-b-4 shadow-md",
            error ? "border-red-500" : "",
            props.disabled ? "opacity-50 cursor-not-allowed" : "",
            className,
          )}
          style={{
            backgroundColor: `${accentColor.value}30`,
            borderColor: error
              ? "rgba(239, 68, 68, 0.6)"
              : `${accentColor.value}60`,
            borderBottomColor: error ? "rgb(185, 28, 28)" : accentColor.value,
            boxShadow: isFocused
              ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`
              : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <span
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
            style={{
              backgroundColor: error
                ? "rgba(239, 68, 68, 0.8)"
                : `${accentColor.value}80`,
            }}
          />

          <textarea
            ref={ref}
            className="w-full min-h-[100px] bg-transparent border-none outline-none p-3 text-white font-minecraft text-2xl placeholder:text-white/50 lowercase resize-y"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xl text-red-400 font-minecraft">{error}</p>
        )}
      </div>
    );
  },
);

TextArea.displayName = "TextArea";
