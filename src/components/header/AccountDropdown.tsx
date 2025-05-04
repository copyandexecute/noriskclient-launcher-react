"use client";

import type React from "react";
import { useState, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";

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
    const [dropdownRight, setDropdownRight] = useState<number>(0);

    // Track mount state
    useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
    }, []);

    // Calculate dropdown position when opened
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownTop(rect.bottom + 8); // Position below button + margin
        setDropdownRight(window.innerWidth - rect.right); // Align to the right edge
        // TODO: Add resize/scroll listener to update position if needed
      }
    }, [isOpen, buttonRef]);

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
          right: `${dropdownRight}px`,
          minWidth: '300px', // Set a minimum width
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