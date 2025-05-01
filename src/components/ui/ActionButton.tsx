"use client";

import { Icon } from "@iconify/react";

interface ActionButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
}

export function ActionButton({
  label,
  icon,
  onClick,
  className = "",
}: ActionButtonProps) {
  return (
    <button
      className={`bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-2 text-white font-minecraft flex items-center gap-2 transition-colors text-base lowercase ${className}`}
      onClick={onClick}
    >
      <Icon icon={icon} className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
