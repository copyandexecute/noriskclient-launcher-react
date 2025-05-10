"use client";

import { useThemeStore } from "../../../store/useThemeStore";
import { Icon } from "@iconify/react";

interface WizardSidebarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  stepIcons: string[];
  onStepClick: (step: number) => void;
  isStepValid: (step: number) => boolean;
}

export function WizardSidebar({
  currentStep,
  totalSteps,
  stepTitles,
  stepIcons,
  onStepClick,
  isStepValid,
}: WizardSidebarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div
      className="w-64 border-r-2 overflow-y-auto custom-scrollbar"
      style={{
        borderColor: `${accentColor.value}40`,
        backgroundColor: `${accentColor.value}20`,
        boxShadow: `inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
      }}
    >
      <div className="p-4">
        <div
          className="text-xl font-minecraft text-white mb-6 lowercase p-3 rounded-md border-2 border-b-4"
          style={{
            backgroundColor: `${accentColor.value}30`,
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            boxShadow: `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
          }}
        >
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:magic-stick-bold"
              className="w-5 h-5 text-white"
            />
            <span>profile creation</span>
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isPast = stepNumber < currentStep;
            const isClickable =
              stepNumber <= currentStep || isStepValid(currentStep);
            const isValid = isStepValid(stepNumber);

            return (
              <button
                key={`step-${stepNumber}`}
                className={`w-full text-left p-3 rounded-md transition-all duration-200 flex items-center gap-3 
                  border-2 ${isActive ? "border-b-4" : ""}`}
                style={{
                  backgroundColor: isActive
                    ? `${accentColor.value}30`
                    : isPast && isValid
                      ? `${accentColor.value}15`
                      : "rgba(0,0,0,0.2)",
                  borderColor: isActive
                    ? `${accentColor.value}60`
                    : isPast && isValid
                      ? `${accentColor.value}40`
                      : "rgba(255,255,255,0.2)",
                  borderBottomColor: isActive ? accentColor.value : undefined,
                  boxShadow: isActive
                    ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`
                    : "none",
                  opacity: isClickable ? 1 : 0.5,
                  transform: isActive ? "translateY(0)" : "translateY(0)",
                  cursor: isClickable ? "pointer" : "not-allowed",
                }}
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-2`}
                  style={{
                    backgroundColor: isActive
                      ? `${accentColor.value}40`
                      : isPast && isValid
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(255,255,255,0.1)",
                    borderColor: isActive
                      ? `${accentColor.value}70`
                      : isPast && isValid
                        ? "rgba(16, 185, 129, 0.6)"
                        : "rgba(255,255,255,0.2)",
                  }}
                >
                  {isPast && isValid ? (
                    <Icon
                      icon="solar:check-circle-bold"
                      className="w-5 h-5 text-green-500"
                    />
                  ) : (
                    <Icon
                      icon={stepIcons[index]}
                      className={`w-5 h-5 ${isActive ? "text-white" : isClickable ? "text-white/70" : "text-white/40"}`}
                    />
                  )}
                </div>
                <span className="font-minecraft text-3xl lowercase">
                  {stepTitles[index]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
