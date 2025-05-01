"use client";

import type React from "react";

import { Icon } from "@iconify/react";
import { cn } from "../../../../lib/utils";

interface ActionButtonProps {
  icon: string;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  danger?: boolean;
  children?: React.ReactNode;
}

export function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  className = "",
  title,
  danger = false,
  children,
}: ActionButtonProps) {
  return (
    <button
      className={cn(
        "bg-black/20 hover:bg-black/30 border-2 border-white/30 px-4 py-2 text-white font-minecraft text-sm flex items-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all duration-300",
        "tracking-wider lowercase active:translate-y-0.5",
        danger && "hover:bg-red-900/30 hover:border-red-500/50",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Icon icon={icon} className="w-4 h-4" />
      {label && <span className="hidden sm:inline">{label}</span>}
      {children}
    </button>
  );
}
