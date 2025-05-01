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
    <div className="flex items-center mb-5 select-none">
      <div
        className="relative inline-flex h-8 w-14 items-center rounded-full mr-4
                     bg-black/50 border border-white/30 transition-colors focus:outline-none cursor-pointer"
        onClick={() => onChange(!checked)}
      >
        <span
          className={`${checked ? "translate-x-7 bg-white" : "translate-x-1 bg-white/70"} 
                         inline-block h-6 w-6 transform rounded-full transition-transform`}
        />
      </div>
      <div>
        <label
          htmlFor={id}
          className="text-2xl text-white font-minecraft lowercase tracking-wide cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <div className="text-base text-white/50 font-minecraft tracking-wide">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
