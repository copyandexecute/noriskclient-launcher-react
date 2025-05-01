"use client";

import type { ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      onClick,
      disabled = false,
      variant = "primary",
      size = "md",
      className,
      type = "button",
      icon,
    },
    ref,
  ) => {
    const variantClasses = {
      primary:
        "bg-black/60 backdrop-blur-lg text-white border-white/40 hover:bg-black/70 hover:border-white/60",
      secondary:
        "bg-black/40 backdrop-blur-lg text-white border-white/30 hover:bg-black/60 hover:border-white/50",
      danger:
        "border-red-500/60 hover:border-red-700/60 hover:bg-red-900/20 text-white",
      success:
        "border-green-500/60 hover:border-green-700/60 hover:bg-green-900/20 text-white",
    };

    const sizeClasses = {
      sm: "py-2 px-4 text-sm",
      md: "py-3 px-6 text-base",
      lg: "py-4 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "font-minecraft tracking-wider lowercase border-2 transition-all duration-300",
          "flex items-center justify-center gap-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-md hover:shadow-lg active:shadow-sm",
          "text-shadow-sm rounded-md",
          "active:translate-y-0.5",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
      >
        {icon && (
          <span className="flex items-center justify-center">{icon}</span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
