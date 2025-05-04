"use client";

import type React from "react";
import { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";

const DROPDOWN_WIDTH = 300; // Use the minWidth for calculation

interface AccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLDivElement>; // Ref to the button that triggers the dropdown
  className?: string;
}

export const AccountDropdown = forwardRef<HTMLDivElement, AccountDropdownProps>(
  ({ isOpen, onClose, buttonRef, className }, ref) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownTop, setDropdownTop] = useState<number>(0);
    const [dropdownLeft, setDropdownLeft] = useState<number>(0);

    // Track mount state
    useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
    }, []);

    // Function to calculate and update position
    const calculatePosition = useCallback(() => {
      if (!isOpen || !buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;

      // Calculate desired left position for centering
      let desiredLeft = buttonCenterX - DROPDOWN_WIDTH / 2;

      // Clamp position to viewport bounds (add some padding)
      const padding = 8;
      desiredLeft = Math.max(padding, desiredLeft); // Ensure not too far left
      desiredLeft = Math.min(
        desiredLeft,
        window.innerWidth - DROPDOWN_WIDTH - padding, // Ensure not too far right
      );

      setDropdownTop(rect.bottom + 8);
      setDropdownLeft(desiredLeft);
    }, [isOpen, buttonRef]);

    // Calculate dropdown position when opened or window resized
    useEffect(() => {
      if (isOpen) {
        calculatePosition(); // Initial calculation
        window.addEventListener("resize", calculatePosition); // Recalculate on resize
        // TODO: Potentially add scroll listener as well if needed
      }

      // Cleanup listener
      return () => {
        window.removeEventListener("resize", calculatePosition);
      };
    }, [isOpen, calculatePosition]);

    // Handle clicking outside the dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, onClose, buttonRef]);

    if (!isMounted || !isOpen) {
      return null;
    }

    return createPortal(
      <div
        ref={ref || dropdownRef} // Use forwarded ref if available, otherwise internal ref
        className={cn(
          "fixed bg-black/80 backdrop-blur-lg border-2 border-white/30 shadow-lg z-50",
          "overflow-hidden", // Let content manage scroll if needed
          className,
        )}
        style={{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          minWidth: `${DROPDOWN_WIDTH}px`, // Use constant
        }}
      >
        {/* Render MinecraftAccountManager inside */}
        <MinecraftAccountManager onClose={onClose} isInDropdown /> 
      </div>,
      document.body, // Target the document body
    );
  },
);

AccountDropdown.displayName = "AccountDropdown";

// Add a prop to MinecraftAccountManager to indicate it's in a dropdown
// This allows for potential style adjustments if needed
// We'll modify MinecraftAccountManager next if necessary. 