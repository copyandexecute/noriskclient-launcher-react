"use client";

import { Icon } from "@iconify/react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "search...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="bg-black/20 backdrop-blur-md border-2 border-white/30 px-10 py-2 text-white w-full font-minecraft text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
          onClick={() => onChange("")}
        >
          <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
        </button>
      )}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
        <Icon icon="pixel:search" className="w-4 h-4" />
      </div>
    </div>
  );
}
