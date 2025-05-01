"use client";

import { Icon } from "@iconify/react";

interface FilterOption {
  id: string;
  label: string;
  icon: string;
}

interface FilterButtonGroupProps {
  options: FilterOption[];
  activeId: string;
  onChange: (id: string) => void;
}

export function FilterButtonGroup({
  options,
  activeId,
  onChange,
}: FilterButtonGroupProps) {
  return (
    <div className="flex bg-black/20 backdrop-blur-md border-2 border-white/30 rounded-none">
      {options.map((option) => (
        <button
          key={option.id}
          className={`px-4 py-2 font-minecraft text-base lowercase ${
            activeId === option.id
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white"
          }`}
          onClick={() => onChange(option.id)}
        >
          <div className="flex items-center gap-2">
            <Icon icon={option.icon} className="w-4 h-4" />
            <span>{option.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
