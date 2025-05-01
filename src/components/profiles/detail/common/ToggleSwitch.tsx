"use client";

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  title?: string;
}

export function ToggleSwitch({ enabled, onChange, title }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? "bg-primary/70" : "bg-black/50"
      } border border-white/30`}
      title={title}
    >
      <span
        className={`${
          enabled ? "translate-x-5 bg-white" : "translate-x-1 bg-white/70"
        } inline-block h-4 w-4 transform rounded-full transition-transform`}
      />
    </button>
  );
}
