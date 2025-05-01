"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  id,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center mb-4">
      <input
        type="checkbox"
        id={id}
        className="mr-2 w-5 h-5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <label
          htmlFor={id}
          className="text-white font-minecraft text-base lowercase"
        >
          {label}
        </label>
        {description && (
          <div className="text-white/50 text-xs font-minecraft">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
