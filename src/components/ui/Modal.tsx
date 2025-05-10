"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Portal } from "./Portal";

interface ModalProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export function Modal({
  title,
  children,
  footer,
  onClose,
  width = "md",
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  const getWidthClass = () => {
    switch (width) {
      case "sm":
        return "max-w-sm";
      case "md":
        return "max-w-md";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-xl";
      case "2xl":
        return "max-w-2xl";
      case "full":
        return "max-w-full";
      default:
        return "max-w-md";
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div
          ref={modalRef}
          className={cn(
            "w-full bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-lg shadow-xl",
            "animate-in fade-in zoom-in-95 duration-300",
            getWidthClass(),
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-minecraft text-white lowercase">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <Icon
                  icon="solar:close-circle-bold"
                  className="w-6 h-6 text-white/70"
                />
              </button>
            </div>
          )}

          <div className="overflow-auto">{children}</div>

          {footer && (
            <div className="p-4 border-t border-white/10">{footer}</div>
          )}
        </div>
      </div>
    </Portal>
  );
}
