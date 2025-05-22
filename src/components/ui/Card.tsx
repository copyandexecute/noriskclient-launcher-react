"use client";

import type React from "react";
import { forwardRef, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "flat" | "secondary" | "3d";
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
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [isHovered, setIsHovered] = useState(false);

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
    if (withAnimation && isBackgroundAnimationEnabled && cardRef.current) {
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
  }, [withAnimation, isBackgroundAnimationEnabled]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (
      onClick &&
      isBackgroundAnimationEnabled &&
      cardRef.current &&
      variant === "3d"
    ) {
      gsap.to(cardRef.current, {
        y: 0,
        boxShadow: `0 13px 0 rgba(0,0,0,0.25), 0 16px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (
      onClick &&
      isBackgroundAnimationEnabled &&
      cardRef.current &&
      variant === "3d"
    ) {
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
      case "3d":
        return `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
      case "elevated":
        return `0 10px 0 rgba(0,0,0,0.3), 0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
      case "secondary":
        return `0 6px 0 rgba(0,0,0,0.25), 0 8px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)`;
      default:
        return "none";
    }
  };

  const getBorderStyle = () => {
    switch (variant) {
      case "3d":
      case "elevated":
      case "secondary":
        return "border-2 border-b-4";
      default:
        return "border border-b-2";
    }
  };

  const getBackgroundColor = () => {
    if (variant === "secondary") {
      return "rgba(107, 114, 128, 0.2)";
    }

    return `${accentColor.value}30`;
  };

  const getBorderColor = () => {
    if (variant === "secondary") {
      return "rgba(107, 114, 128, 0.6)";
    }

    return `${accentColor.value}80`;
  };

  const getBorderBottomColor = () => {
    if (variant === "secondary") {
      return "rgba(75, 85, 99, 1)";
    }

    return isHovered ? accentColor.hoverValue : accentColor.value;
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
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        borderBottomColor: getBorderBottomColor(),
        boxShadow: getBoxShadow(),
        filter: isHovered ? "brightness(1.1)" : "brightness(1)",
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={onContextMenu}
    >
      {variant === "3d" && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{
            backgroundColor:
              variant === "3d"
                ? "rgba(107, 114, 128, 0.6)"
                : `${accentColor.value}80`,
          }}
        />
      )}
      {children}
    </div>
  );
});

Card.displayName = "Card";
