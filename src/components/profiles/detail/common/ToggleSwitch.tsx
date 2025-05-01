"use client";

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  title?: string;
}

export function ToggleSwitch({ enabled, onChange, title }: ToggleSwitchProps) {
  return (
    <button
      className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
        enabled ? "bg-green-500/70" : "bg-white/20"
      }`}
      onClick={onChange}
      title={title}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
          enabled ? "translate-x-6" : ""
        }`}
      ></div>
    </button>
  );
}
