"use client";

import { Icon } from "@iconify/react";

interface TableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
}

export function TableHeader({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className = "",
}: TableHeaderProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <button
      className={`text-left flex items-center gap-1 text-white/80 hover:text-white font-minecraft text-sm ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <Icon
          icon={
            sortDirection === "asc"
              ? "pixel:arrow-up-solid"
              : "pixel:arrow-down-solid"
          }
          className="w-3 h-3"
        />
      )}
    </button>
  );
}
