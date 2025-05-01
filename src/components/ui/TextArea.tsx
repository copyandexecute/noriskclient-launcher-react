"use client";

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function TextArea({
  value,
  onChange,
  placeholder = "",
  className = "",
  rows = 4,
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-3 text-white font-minecraft text-base resize-none ${className}`}
      rows={rows}
    />
  );
}
