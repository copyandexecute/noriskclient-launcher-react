"use client";

import { Icon } from "@iconify/react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
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
    if (onAction) {
      onAction();
    } else if (actionUrl) {
      window.open(actionUrl, "_blank");
    }
  };

  return (
    <div className="text-center py-12">
      <Icon icon={icon} className="w-16 h-16 text-white/30 mx-auto mb-4" />
      <p className="text-white/60 font-minecraft text-xl lowercase drop-shadow">
        {title}
      </p>
      {description && (
        <p className="text-white/40 font-minecraft text-base lowercase mt-2">
          {description}
        </p>
      )}
      {(actionLabel || actionUrl || onAction) && (
        <button
          className="mt-4 bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-6 py-2 text-white font-minecraft transition-colors minecraft-button-hover shadow-sm"
          onClick={handleAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
