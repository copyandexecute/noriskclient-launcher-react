"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { Dropdown } from "./dropdown/Dropdown.tsx";
import { DropdownItem } from "./dropdown/DropdownItem.tsx";
import { gsap } from "gsap";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
  size = "md",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (containerRef.current && isBackgroundAnimationEnabled) {
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

  const handleClick = () => {
    if (disabled) return;

    if (triggerRef.current && isBackgroundAnimationEnabled) {
      gsap.to(triggerRef.current, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(triggerRef.current, {
            scale: 1,
            duration: 0.2,
            ease: "elastic.out(1.2, 0.4)",
          });
        },
      });
    }

    setIsOpen(!isOpen);
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);

    if (triggerRef.current && isBackgroundAnimationEnabled) {
      gsap.to(triggerRef.current, {
        y: -3,
        boxShadow: `0 7px 0 rgba(0,0,0,0.25), 0 9px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);

    if (triggerRef.current && isBackgroundAnimationEnabled) {
      gsap.to(triggerRef.current, {
        y: 0,
        boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);

    if (triggerRef.current && isBackgroundAnimationEnabled) {
      gsap.fromTo(
        triggerRef.current,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.3,
          ease: "elastic.out(1.2, 0.4)",
        },
      );
    }
  };

  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-[42px] text-sm",
    lg: "h-14 text-lg",
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2 text-white font-minecraft lowercase rounded-md transition-all duration-200",
          "border-2 border-b-4 overflow-hidden",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          sizeClasses[size],
        )}
        style={{
          backgroundColor: `${accentColor.value}${isHovered || isOpen ? "40" : "30"}`,
          borderColor: `${accentColor.value}${isHovered || isOpen ? "70" : "60"}`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          transform: "translateY(0)",
          filter:
            (isHovered || isOpen) && !disabled
              ? "brightness(1.1)"
              : "brightness(1)",
        }}
        disabled={disabled}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />

        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="flex-shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <Icon
          icon="solar:alt-arrow-down-bold"
          className={cn(
            "w-5 h-5 transition-transform duration-200",
            isOpen && "transform rotate-180",
          )}
        />

        <span
          className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent transition-opacity duration-300"
          style={{ opacity: isHovered || isOpen ? 0.5 : 0 }}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        width={triggerRef.current?.offsetWidth || 300}
        position={options.length > 6 ? "top" : "bottom"}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              isActive={option.value === value}
              icon={option.icon}
              onClick={() => handleOptionSelect(option.value)}
            >
              {option.label}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
