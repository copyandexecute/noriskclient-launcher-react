"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

interface ModalProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  height?: string;
  footer?: ReactNode;
}

export function Modal({
  title,
  children,
  onClose,
  footer,
  width = "md",
  height,
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
    full: "max-w-full",
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
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center"
    >
      <div
        ref={modalRef}
        className={`bg-black/20 backdrop-blur-lg border-2 border-white/30 w-full ${
          widthClasses[width]
        } flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
        style={{ height: height || "auto", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/20 bg-black/20">
          <h2 className="text-2xl font-minecraft text-white lowercase tracking-wider select-none">
            {title}
          </h2>
          <button
            className="text-white/70 hover:text-white transition-colors"
            onClick={onClose}
          >
            <Icon icon="pixel:window-close-solid" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">{children}</div>

        {footer && (
          <div className="p-5 border-t border-white/20 bg-black/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
