"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={`step-${index}`} className="flex items-center">
            <div
              className={`w-4 h-4 rounded-full ${
                currentStep === index + 1
                  ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  : index < currentStep - 1
                    ? "bg-white/70"
                    : "bg-white/30"
              }`}
            ></div>
            {index < totalSteps - 1 && (
              <div
                className={`w-20 h-1.5 ${
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
