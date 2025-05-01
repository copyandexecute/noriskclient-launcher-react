"use client";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  valueLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
}

export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = "",
  disabled = false,
  valueLabel,
  minLabel,
  maxLabel,
}: RangeSliderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        {minLabel && (
          <span className="text-base text-white/60 font-minecraft select-none">
            {minLabel}
          </span>
        )}
        {valueLabel && (
          <span className="text-xl text-white font-minecraft select-none">
            {valueLabel}
          </span>
        )}
        {maxLabel && (
          <span className="text-base text-white/60 font-minecraft select-none">
            {maxLabel}
          </span>
        )}
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-3 bg-black/40 rounded-lg appearance-none cursor-pointer
                   accent-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
      />
    </div>
  );
}
