"use client";

import type { ReactNode } from "react";

interface TabContentProps {
  children: ReactNode;
  className?: string;
}

export function TabContent({ children, className = "" }: TabContentProps) {
  return (
    <div className={`flex-1 overflow-auto p-6 ${className}`}>{children}</div>
  );
}
