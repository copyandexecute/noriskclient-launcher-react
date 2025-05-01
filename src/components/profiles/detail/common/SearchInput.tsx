"use client";

import { Icon } from "@iconify/react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "search...",
}: SearchInputProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <input
          type="text"
          className="w-full bg-black/20 border-2 border-white/30 py-3 pl-12 pr-5 text-2xl text-white font-minecraft
                     placeholder-white/40 rounded-md focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Icon
          icon="pixel:search-solid"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60"
        />
        {value && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
            onClick={() => onChange("")}
          >
            <Icon icon="pixel:close-solid" className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
