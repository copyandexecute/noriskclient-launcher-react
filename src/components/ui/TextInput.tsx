"use client";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: "text" | "number" | "password" | "email";
}

export function TextInput({
  value,
  onChange,
  placeholder = "",
  className = "",
  disabled = false,
  type = "text",
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-3 text-white font-minecraft text-base ${
        disabled ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
    />
  );
}
