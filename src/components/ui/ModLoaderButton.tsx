"use client";

interface ModLoaderButtonProps {
  name: string;
  icon: string;
  isSelected: boolean;
  isCompatible: boolean;
  onClick: () => void;
}

export function ModLoaderButton({
  name,
  icon,
  isSelected,
  isCompatible,
  onClick,
}: ModLoaderButtonProps) {
  return (
    <button
      className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 select-none
        ${
          !isCompatible
            ? "opacity-50 cursor-not-allowed bg-black/20 border-2 border-white/10"
            : isSelected
              ? "bg-white/20 border-2 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              : "bg-black/20 border-2 border-white/20 hover:bg-black/30 hover:border-white/30"
        }`}
      onClick={onClick}
      disabled={!isCompatible}
      title={
        !isCompatible ? `Not compatible with this Minecraft version` : undefined
      }
    >
      <div className="w-12 h-12 mb-3 flex items-center justify-center">
        <img
          src={icon || "/placeholder.svg"}
          alt={name}
          className="w-10 h-10 object-contain"
        />
      </div>
      <span className="text-2xl text-white font-minecraft lowercase tracking-wide">
        {name}
      </span>
    </button>
  );
}
