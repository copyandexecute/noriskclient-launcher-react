"use client";

import type { ReactNode } from "react";
import { TableHeader } from "./TableHeader";

interface ContentTableProps {
  children: ReactNode;
  headers: {
    key: string;
    label: string;
    width?: string;
    className?: string;
    sortable?: boolean;
  }[];
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  selectedCount: number;
  totalCount: number;
  filteredCount: number;
  enabledCount: number;
  onSelectAll: () => void;
  showFooter?: boolean;
  contentType?: string;
  searchQuery?: string;
}

export function ContentTable({
  children,
  headers,
  sortKey,
  sortDirection,
  onSort,
  selectedCount,
  totalCount,
  filteredCount,
  enabledCount,
  onSelectAll,
  showFooter = true,
  contentType = "items",
  searchQuery = "",
}: ContentTableProps) {
  const handleSort = (key: string) => {
    onSort(key);
  };

  return (
    <div className="border-2 border-white/30 h-full flex flex-col">
      {/* Fixed header - will not scroll */}
      <div className="bg-black/80 border-b border-white/30 py-2 px-3 flex items-center">
        <div className="w-8 flex justify-center">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={selectedCount === filteredCount && filteredCount > 0}
            onChange={onSelectAll}
            title={`Select all ${contentType}`}
          />
        </div>

        {headers.map((header) => (
          <div key={header.key} className={header.width || "flex-1"}>
            {header.sortable !== false ? (
              <TableHeader
                label={header.label}
                sortKey={header.key}
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className={header.className || ""}
              />
            ) : (
              <div
                className={`text-white/80 font-minecraft text-sm ${header.className || ""}`}
              >
                {header.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable content area - only this part will scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {children}
      </div>

      {/* Fixed footer - will not scroll */}
      {showFooter && filteredCount > 0 && (
        <div className="bg-black/80 border-t border-white/30 py-2 px-4 text-white/70 font-minecraft text-sm flex justify-between items-center">
          <div>
            {filteredCount} {contentType}
            {filteredCount !== 1 && contentType.endsWith("s") ? "" : "s"}
            {searchQuery && filteredCount !== totalCount && (
              <span> (filtered from {totalCount})</span>
            )}
          </div>
          <div>{enabledCount} enabled</div>
        </div>
      )}
    </div>
  );
}
