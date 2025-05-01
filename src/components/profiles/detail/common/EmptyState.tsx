"use client";

import { Icon } from "@iconify/react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string | undefined;
  actionUrl?: string;
  onAction?: (() => void) | undefined;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionUrl,
  onAction,
}: EmptyStateProps) {
  const handleAction = () => {
    if (actionUrl) {
      window.open(actionUrl, "_blank");
    } else if (onAction) {
      onAction();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 select-none">
      <Icon icon={icon} className="w-16 h-16 text-white/30 mb-4" />
      <h3 className="text-white font-minecraft text-xl lowercase tracking-wide mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-white/60 text-base mb-6 max-w-md">{description}</p>
      )}
      {actionLabel && (
        <button
          onClick={handleAction}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-5 py-2.5 text-white font-minecraft text-base transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
