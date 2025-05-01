"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface ModalProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  height?: string;
  footer?: ReactNode;
}

export function Modal({
  children,
  title,
  onClose,
  className,
  width = "md",
  height = "auto",
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" },
      );
    }

    // Add event listener to close modal when clicking outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleCloseWithAnimation();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleCloseWithAnimation = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50"
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-black/70 backdrop-blur-lg border-2 border-white/30 w-full shadow-lg flex flex-col rounded-lg",
          widthClasses[width],
          className,
        )}
        style={{ height }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/20 bg-black/20">
          <h2 className="text-2xl font-minecraft text-white lowercase tracking-wider text-shadow">
            {title}
          </h2>
          <button
            className="text-white/60 hover:text-white transition-colors p-2 rounded-md"
            onClick={handleCloseWithAnimation}
          >
            <Icon icon="pixel:window-close-solid" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-5">
          {children}
        </div>

        {footer && (
          <div className="p-5 border-t border-white/20 bg-black/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
