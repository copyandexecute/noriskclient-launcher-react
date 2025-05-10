"use client";

import { useThemeStore } from "../../store/useThemeStore";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
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
  valueLabel,
  minLabel,
  maxLabel,
  disabled = false,
}: RangeSliderProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div className={`${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      {valueLabel && (
        <div className="text-center mb-2">
          <span className="text-lg text-white font-minecraft">
            {valueLabel}
          </span>
        </div>
      )}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          {minLabel && (
            <span className="text-sm text-white/70 font-minecraft">
              {minLabel}
            </span>
          )}
          {maxLabel && (
            <span className="text-sm text-white/70 font-minecraft">
              {maxLabel}
            </span>
          )}
        </div>
        <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
          <div
            className="absolute h-full rounded-full transition-all duration-200"
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
              backgroundColor: accentColor.value,
            }}
          ></div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        disabled={disabled}
      />
    </div>
  );
}
