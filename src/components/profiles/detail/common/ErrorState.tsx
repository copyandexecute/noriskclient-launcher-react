"use client";

import { Icon } from "@iconify/react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <Icon
        icon="pixel:warning-solid"
        className="w-16 h-16 text-red-400 mx-auto mb-4"
      />
      <p className="text-white/60 font-minecraft text-xl lowercase drop-shadow">
        {message}
      </p>
      {onRetry && (
        <button
          className="mt-4 bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-6 py-2 text-white font-minecraft transition-colors minecraft-button-hover shadow-sm"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
