"use client";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full bg-black/30 backdrop-blur-md border-2 border-white/30 px-5 py-4 text-2xl text-white font-minecraft
        appearance-none focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 rounded-md
        ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label ? option.label : option.value}
        </option>
      ))}
    </select>
  );
}
