import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <span className="flex items-center gap-2">
        <Icon
          icon="pixel:spinner-solid"
          className={cn("animate-spin text-white", sizeClasses[size])}
        />
        {text && <span className="font-minecraft text-white">{text}</span>}
      </span>
    </div>
  );
}
