import { Icon } from "@iconify/react";

interface LoadingIndicatorProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingIndicator({
  message = "Loading...",
  size = "md",
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <Icon
        icon="pixel:loading"
        className={`animate-spin ${sizeClasses[size]} text-white mb-3`}
      />
      <p className={`text-white/70 font-minecraft ${textClasses[size]}`}>
        {message}
      </p>
    </div>
  );
}
