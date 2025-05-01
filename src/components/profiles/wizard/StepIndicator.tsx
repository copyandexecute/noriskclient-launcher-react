"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center select-none py-6">
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={`step-${index}`} className="flex items-center">
            <div
              className={`w-7 h-7 rounded-full transition-all duration-300 ${
                currentStep === index + 1
                  ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                  : index < currentStep - 1
                    ? "bg-white/70"
                    : "bg-white/30"
              }`}
            ></div>
            {index < totalSteps - 1 && (
              <div
                className={`w-28 h-2 transition-all duration-300 ${
                  index < currentStep - 1
                    ? "bg-white/70"
                    : index === currentStep - 1
                      ? "bg-gradient-to-r from-white/70 to-white/30"
                      : "bg-white/30"
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StepIndicator;
