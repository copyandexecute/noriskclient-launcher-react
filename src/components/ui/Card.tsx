import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface CardProps {
  children: ReactNode;
  className?: string;
  isCollapsible?: boolean;
  isHoverable?: boolean;
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className, isHoverable = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-black/20 backdrop-blur-lg border-2 border-white/40 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]",
        isHoverable &&
          "hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, actions }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-b-2 border-white/40 bg-black/60 backdrop-blur-md flex items-center justify-between",
        className,
      )}
    >
      <div className="font-minecraft tracking-wider uppercase">{children}</div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
