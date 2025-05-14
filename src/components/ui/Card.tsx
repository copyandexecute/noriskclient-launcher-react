"use client";

import type React from "react";
import { forwardRef, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "flat";
  withAnimation?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    variant = "default",
    withAnimation = true,
    onClick,
    onContextMenu,
  },
  ref,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  // Merge refs
  const mergedRef = (node: HTMLDivElement) => {
    if (ref) {
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
    cardRef.current = node;
  };

  useEffect(() => {
    if (withAnimation && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.95, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, [withAnimation]);

  const handleMouseEnter = () => {
    if (onClick && cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        boxShadow:
          variant === "flat"
            ? "none"
            : `0 13px 0 rgba(0,0,0,0.25), 0 16px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (onClick && cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        boxShadow: getBoxShadow(),
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const getBoxShadow = () => {
    switch (variant) {
      case "elevated":
        return `0 10px 0 rgba(0,0,0,0.3), 0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
      case "flat":
        return "none";
      default:
        return `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
    }
  };

  const getBorderStyle = () => {
    switch (variant) {
      case "flat":
        return "border border-white/10";
      default:
        return "border-2 border-b-4";
    }
  };

  return (
    <div
      ref={mergedRef}
      className={cn(
        "relative backdrop-blur-md rounded-lg overflow-hidden transition-all duration-200",
        getBorderStyle(),
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        backgroundColor: `${accentColor.value}20`,
        borderColor:
          variant === "flat" ? "transparent" : `${accentColor.value}60`,
        borderBottomColor:
          variant === "flat" ? "transparent" : accentColor.value,
        boxShadow: getBoxShadow(),
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={onContextMenu}
    >
      {variant !== "flat" && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />
      )}
      {children}
    </div>
  );
});

Card.displayName = "Card";
