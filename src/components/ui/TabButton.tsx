"use client";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      className={`px-4 py-2 font-minecraft lowercase ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
