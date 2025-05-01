"use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";

interface TabHeaderProps {
  title: string;
  icon?: string;
  children?: ReactNode;
  className?: string;
}

export function TabHeader({
  title,
  icon,
  children,
  className = "",
}: TabHeaderProps) {
  return (
    <div
      className={`flex-shrink-0 flex flex-col gap-4 p-6 bg-black/30 backdrop-blur-md border-b border-white/20 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-white font-minecraft text-2xl lowercase flex items-center gap-2">
          {icon && <Icon icon={icon} className="w-6 h-6" />}
          {title}
        </h2>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </div>
  );
}
