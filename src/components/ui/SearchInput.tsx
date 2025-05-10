"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
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

  const handleFocus = () => {
    setIsFocused(true);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: `0 0 0 2px ${accentColor.value}50, 0 4px 8px rgba(0,0,0,0.2)`,
        duration: 0.2,
      });
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        duration: 0.2,
      });
    }
  };

  const handleClear = () => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center h-10 rounded-md transition-all duration-200",
        "border-2 border-b-4 shadow-md",
        className,
      )}
      style={{
        backgroundColor: `${accentColor.value}30`,
        borderColor: `${accentColor.value}80`,
        borderBottomColor: accentColor.value,
        boxShadow: isFocused
          ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.25), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`
          : `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
        style={{ backgroundColor: `${accentColor.value}80` }}
      />

      <div className="flex items-center justify-center w-10 h-full text-white">
        <Icon icon="solar:magnifer-bold" className="w-4 h-4" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-full bg-transparent border-none outline-none px-2 text-white font-minecraft text-base placeholder:text-white/50 lowercase"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center justify-center w-8 h-full transition-opacity duration-200 hover:opacity-80 text-white"
        >
          <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
