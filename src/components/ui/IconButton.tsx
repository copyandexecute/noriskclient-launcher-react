"use client";

import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  variant?: "default" | "transparent";
}

export function IconButton({
  icon,
  onClick,
  disabled = false,
  title,
  className,
  variant = "default",
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "w-8 h-8 flex items-center justify-center transition-all",
        variant === "default"
          ? "text-white/60 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95"
          : "text-white/60 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </button>
  );
}
