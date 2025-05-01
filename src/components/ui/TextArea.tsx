"use client";

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export function TextArea({
  value,
  onChange,
  placeholder = "",
  className = "",
  disabled = false,
  rows = 4,
}: TextAreaProps) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`w-full bg-black/30 backdrop-blur-md border-2 border-white/30 px-5 py-4 text-2xl text-white font-minecraft rounded-md
        focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20
        placeholder:text-white/40 placeholder:lowercase resize-none select-none
        ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    />
  );
}
