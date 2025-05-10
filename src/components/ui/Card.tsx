import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-black/50 backdrop-blur-md border-2 border-white/30 shadow-md rounded-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
