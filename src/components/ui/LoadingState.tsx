"use client";

import { Icon } from "@iconify/react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icon
          icon="pixel:loading"
          className="animate-spin w-8 h-8 text-white/70 mb-3"
        />
        <p className="text-white/70 font-minecraft text-sm">{message}</p>
      </div>
    </div>
  );
}
