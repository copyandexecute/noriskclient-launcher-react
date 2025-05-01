"use client";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
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
  label,
  valueLabel,
  minLabel,
  maxLabel,
  disabled = false,
}: RangeSliderProps) {
  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between">
          <span className="text-white font-minecraft text-base lowercase">
            {label}
          </span>
          {valueLabel && (
            <span className="text-white font-minecraft text-base lowercase">
              {valueLabel}
            </span>
          )}
        </div>
      )}

      <div className="mb-2 flex justify-between">
        <span className="text-white/70 font-minecraft text-sm lowercase">
          {minLabel || min}
        </span>
        <span className="text-white/70 font-minecraft text-sm lowercase">
          {maxLabel || max}
        </span>
      </div>

      <div className="relative h-2 bg-black/30 border border-white/30 rounded-none overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-white/40"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
          }}
        ></div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2"
        disabled={disabled}
      />
    </div>
  );
}
