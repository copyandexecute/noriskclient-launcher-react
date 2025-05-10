import type React from "react";
import { cn } from "../../lib/utils";

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ children, className }: TabContentProps) {
  return (
    <div className={cn("relative flex-1 min-h-0 p-2 ", className)}>
      {children}
    </div>
  );
}
