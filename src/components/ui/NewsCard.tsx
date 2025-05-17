"use client";

import type React from "react";
import { forwardRef, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

interface NewsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  imageUrl: string;
  postUrl: string;
}

export const NewsCard = forwardRef<HTMLDivElement, NewsCardProps>(
  ({ className, title, imageUrl, postUrl, onClick, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);

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
      if (cardRef.current) {
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
    }, []);

    return (
      <div
        ref={mergedRef}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white",
          "text-shadow-sm",

          "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",

          "hover:translate-y-[-3px] cursor-pointer",
          "hover:shadow-[0_11px_0_rgba(0,0,0,0.25),0_14px_20px_rgba(0,0,0,0.4)]",
          "hover:brightness-110",

          "active:translate-y-[3px]",
          "active:border-b-2 active:shadow-[0_2px_0_rgba(0,0,0,0.2),0_3px_5px_rgba(0,0,0,0.3)]",
          "active:brightness-90",

          "w-full aspect-square",

          className,
        )}
        onClick={onClick}
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        }}
        {...props}
      >
        <span
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />

        <span
          className="absolute inset-y-0 left-0 w-[2px]"
          style={{ backgroundColor: `${accentColor.value}40` }}
        />
        <span
          className="absolute inset-y-0 right-0 w-[2px]"
          style={{ backgroundColor: `${accentColor.value}40` }}
        />

        <span className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/30 via-transparent to-transparent" />

        <div className="relative w-full h-full overflow-hidden bg-black/30">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `${accentColor.value}10` }}
          />

          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title || "News image"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />
        </div>
      </div>
    );
  },
);

NewsCard.displayName = "NewsCard";
