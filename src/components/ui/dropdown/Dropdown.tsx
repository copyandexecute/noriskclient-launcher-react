"use client";

import type React from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  width?: number;
  className?: string;
  children: React.ReactNode;
  position?: "bottom" | "top" | "left" | "right";
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      isOpen,
      onClose,
      triggerRef,
      width = 300,
      className,
      children,
      position = "bottom",
    },
    ref,
  ) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownTop, setDropdownTop] = useState<number>(0);
    const [dropdownLeft, setDropdownLeft] = useState<number>(0);
    const [animationState, setAnimationState] = useState<
      "entering" | "entered" | "exiting" | "exited"
    >("exited");
    const accentColor = useThemeStore((state) => state.accentColor);
    const previousIsOpen = useRef(isOpen);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      setIsMounted(true);
      return () => {
        setIsMounted(false);
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (isOpen !== previousIsOpen.current) {
        if (isOpen) {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }

          setAnimationState("entering");
          setTimeout(() => {
            if (isMounted) {
              setAnimationState("entered");
            }
          }, 10);
        } else if (
          animationState === "entered" ||
          animationState === "entering"
        ) {
          setAnimationState("exiting");

          closeTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setAnimationState("exited");
            }
            closeTimeoutRef.current = null;
          }, 200);
        }

        previousIsOpen.current = isOpen;
      }
    }, [isOpen, animationState, isMounted]);

    const calculatePosition = useCallback(() => {
      if (!isOpen || !triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const estimatedHeight = Math.min(300, children ? 300 : 200);

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let effectivePosition = position;
      if (
        position === "bottom" &&
        spaceBelow < estimatedHeight &&
        spaceAbove > spaceBelow
      ) {
        effectivePosition = "top";
      } else if (
        position === "top" &&
        spaceAbove < estimatedHeight &&
        spaceBelow > spaceAbove
      ) {
        effectivePosition = "bottom";
      }

      switch (effectivePosition) {
        case "bottom":
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - width / 2;
          break;
        case "top":
          top = rect.top - estimatedHeight - 8;
          left = rect.left + rect.width / 2 - width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - estimatedHeight / 2;
          left = rect.left - width - 8;
          break;
        case "right":
          top = rect.top + rect.height / 2 - estimatedHeight / 2;
          left = rect.right + 8;
          break;
      }

      const padding = 8;
      left = Math.max(padding, left);
      left = Math.min(left, viewportWidth - width - padding);

      top = Math.max(padding, top);
      top = Math.min(top, viewportHeight - estimatedHeight - padding);

      setDropdownTop(top);
      setDropdownLeft(left);
    }, [isOpen, triggerRef, width, position, children]);

    useEffect(() => {
      if (isOpen) {
        calculatePosition();
        window.addEventListener("resize", calculatePosition);
      }

      return () => {
        window.removeEventListener("resize", calculatePosition);
      };
    }, [isOpen, calculatePosition]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      if (isOpen) {
        setTimeout(() => {
          document.addEventListener("mousedown", handleClickOutside);
        }, 0);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, onClose, triggerRef]);

    if (!isMounted || animationState === "exited") {
      return null;
    }

    const getAnimationClasses = () => {
      switch (position) {
        case "bottom":
          return {
            entering: "opacity-0 translate-y-[-10px]",
            entered: "opacity-100 translate-y-0",
            exiting: "opacity-0 translate-y-[-10px]",
          };
        case "top":
          return {
            entering: "opacity-0 translate-y-[10px]",
            entered: "opacity-100 translate-y-0",
            exiting: "opacity-0 translate-y-[10px]",
          };
        case "left":
          return {
            entering: "opacity-0 translate-x-[10px]",
            entered: "opacity-100 translate-x-0",
            exiting: "opacity-0 translate-x-[10px]",
          };
        case "right":
          return {
            entering: "opacity-0 translate-x-[-10px]",
            entered: "opacity-100 translate-x-0",
            exiting: "opacity-0 translate-x-[-10px]",
          };
      }
    };

    const animationClasses = getAnimationClasses();

    return createPortal(
      <div
        ref={(node) => {
          if (ref) {
            if (typeof ref === "function") {
              ref(node);
            } else {
              ref.current = node;
            }
          }
          dropdownRef.current = node;
        }}
        className={cn(
          "fixed font-minecraft backdrop-blur-md z-50 overflow-hidden",
          "rounded-md text-white",
          "transition-all duration-200",
          "border-2 border-b-4 shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
          animationState === "entering" && animationClasses.entering,
          animationState === "entered" && animationClasses.entered,
          animationState === "exiting" && animationClasses.exiting,
          className,
        )}
        style={{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          width: `${width}px`,
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}40`,
          borderBottomColor: accentColor.dark,
          boxShadow: `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.light}20, inset 0 0 0 1px ${accentColor.value}10`,
        }}
      >
        <div className="absolute inset-0 opacity-20 bg-gradient-radial from-white/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>,
      document.body,
    );
  },
);

Dropdown.displayName = "Dropdown";
