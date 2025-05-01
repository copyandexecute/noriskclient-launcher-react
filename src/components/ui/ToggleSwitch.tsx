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
      <div
        className="relative inline-flex h-6 w-11 items-center rounded-full mr-3
                     bg-black/50 border border-white/30 transition-colors focus:outline-none"
        onClick={() => onChange(!checked)}
      >
        <span
          className={`${checked ? "translate-x-5 bg-white" : "translate-x-1 bg-white/70"} 
                         inline-block h-4 w-4 transform rounded-full transition-transform`}
        />
      </div>
      <div>
        <label
          htmlFor={id}
          className="text-white font-minecraft text-base lowercase tracking-wide cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <div className="text-white/50 text-xs font-minecraft tracking-wide">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
