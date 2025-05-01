"use client";

import type { ReactNode } from "react";

interface FormSectionProps {
  children: ReactNode;
  className?: string;
}

export function FormSection({ children, className = "" }: FormSectionProps) {
  return (
    <div
      className={`bg-black/20 backdrop-blur-md border-2 border-white/20 p-5 space-y-5 ${className}`}
    >
      {children}
    </div>
  );
}
