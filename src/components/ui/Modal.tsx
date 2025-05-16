"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";
import { IconButton } from "./buttons/IconButton.tsx";

interface ModalProps {
  title: string;
  titleIcon?: React.ReactNode;
  titleSubtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnClickOutside?: boolean;
  headerActions?: React.ReactNode;
}

export function Modal({
  title,
  titleIcon,
  titleSubtitle,
  onClose,
  children,
  footer,
  width = "md",
  closeOnClickOutside = true,
  headerActions,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const backdrop = modalRef.current;
    const content = contentRef.current;
    const header = headerRef.current;
    const closeButton = closeButtonRef.current;

    if (backdrop && content && header) {
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
        { y: -50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "back.out(1.2)",
        },
      );

      gsap.fromTo(
        header,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay: 0.1,
          ease: "power2.out",
        },
      );

      if (closeButton) {
        gsap.fromTo(
          closeButton,
          { opacity: 0, rotate: -90 },
          {
            opacity: 1,
            rotate: 0,
            duration: 0.4,
            delay: 0.2,
            ease: "back.out(1.7)",
          },
        );
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);

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
        scale: 0.95,
        duration: 0.3,
        ease: "back.in(1.2)",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === modalRef.current && !isClosing) {
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
          "max-h-[85vh]"
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
          ref={headerRef}
          className="flex items-center justify-between px-6 py-4 border-b-2"
          style={{
            borderColor: `${accentColor.value}60`,
            backgroundColor: `${accentColor.value}30`,
          }}
        >
          <div className="flex items-start space-x-3">
            {titleIcon && (
              <span className="text-white flex-shrink-0 pt-1.5">
                {titleIcon}
              </span>
            )}
            <div className="flex flex-col">
              <h2 className="text-3xl font-minecraft text-white lowercase">
                {title}
              </h2>
              {titleSubtitle && <div className="mt-0.5">{titleSubtitle}</div>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {headerActions}
            <IconButton
              ref={closeButtonRef as any}
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
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-6">{children}</div>

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
