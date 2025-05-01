"use client";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      className={`px-5 py-3 font-minecraft lowercase tracking-wider ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10"
      } transition-colors`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
