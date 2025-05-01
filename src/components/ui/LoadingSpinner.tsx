import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  textClass?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  textClass = "text-base",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={`animate-spin ${sizeClasses[size]}`}>
        <Icon icon="pixel:spinner-solid" className="w-full h-full text-white" />
      </div>
      {text && (
        <div className={`mt-3 text-white/70 font-minecraft ${textClass}`}>
          {text}
        </div>
      )}
    </div>
  );
}
