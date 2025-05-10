"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { IconButton } from "./buttons/IconButton";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnClickOutside?: boolean;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = "md",
  closeOnClickOutside = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const backdrop = modalRef.current;
    const content = contentRef.current;

    if (backdrop && content) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
      );

      gsap.fromTo(
        content,
        { y: -50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(1.2)",
        },
      );
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleClose = () => {
    const backdrop = modalRef.current;
    const content = contentRef.current;

    if (backdrop && content) {
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
      });

      gsap.to(content, {
        y: -30,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.2)",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === modalRef.current) {
      e.stopPropagation();
      handleClose();
    }
  };

  const widthClasses = {
    sm: "max-w-lg",
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw] w-full",
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        if (e.target === modalRef.current) {
          e.stopPropagation();
        }
      }}
    >
      <div
        ref={contentRef}
        className={cn(
          "relative flex flex-col w-full rounded-lg overflow-hidden",
          "border-2 border-b-4 shadow-2xl",
          widthClasses[width],
        )}
        style={{
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}80`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 10px 0 rgba(0,0,0,0.3), 0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />

        <div
          className="flex items-center justify-between px-6 py-4 border-b-2"
          style={{
            borderColor: `${accentColor.value}60`,
            backgroundColor: `${accentColor.value}30`,
          }}
        >
          <h2 className="text-3xl font-minecraft text-white lowercase">
            {title}
          </h2>
          <IconButton
            icon={
              <Icon
                icon="solar:close-square-bold"
                className="w-4 h-4 text-white"
              />
            }
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            variant="secondary"
            size="sm"
            aria-label="Close"
          />
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">{children}</div>

        {footer && (
          <div
            className="px-6 py-4 border-t-2"
            style={{
              borderColor: `${accentColor.value}60`,
              backgroundColor: `${accentColor.value}15`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
