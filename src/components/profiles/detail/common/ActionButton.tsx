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
        "bg-black/20 hover:bg-black/30 border-2 border-white/30 px-5 py-3 text-white font-minecraft text-2xl flex items-center gap-3",
        "disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all duration-300",
        "tracking-wider lowercase active:translate-y-0.5 select-none",
        danger && "hover:bg-red-900/30 hover:border-red-500/50",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Icon icon={icon} className="w-5 h-5" />
      {label && <span className="hidden sm:inline">{label}</span>}
      {children}
    </button>
  );
}
