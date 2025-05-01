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
      className={`py-3 px-4 font-minecraft text-center text-base lowercase ${
        isSelected
          ? "bg-white/30 text-white border-2 border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          : isCompatible
            ? "bg-black/30 text-white/70 border-2 border-white/20 hover:bg-black/40 hover:text-white"
            : "bg-black/10 border-2 border-white/10 opacity-50 cursor-not-allowed"
      }`}
      onClick={onClick}
      disabled={!isCompatible}
    >
      <div className="flex flex-col items-center">
        <img
          src={icon || "/placeholder.svg"}
          alt={name}
          className="w-8 h-8 mb-2 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
        <span>{name}</span>
        {!isCompatible && (
          <div className="text-white/50 font-minecraft text-xs mt-1 lowercase">
            not compatible
          </div>
        )}
      </div>
    </button>
  );
}
