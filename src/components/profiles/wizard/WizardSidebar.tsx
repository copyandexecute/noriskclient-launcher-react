"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../../store/useThemeStore";
import { Icon } from "@iconify/react";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";

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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }

    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          delay: 0.1,
          ease: "power2.out",
        },
      );
    }

    if (stepsRef.current) {
      gsap.fromTo(
        stepsRef.current.children,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          stagger: 0.1,
          delay: 0.2,
          ease: "power2.out",
        },
      );
    }
  }, []);

  return (
    <div
      ref={sidebarRef}
      className="w-64 border-r-2 overflow-y-auto custom-scrollbar"
      style={{
        borderColor: `${accentColor.value}40`,
        backgroundColor: `${accentColor.value}20`,
        boxShadow: `inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`,
      }}
    >
      <div className="p-4">
        <Card ref={headerRef} variant="default" className="mb-6 p-3">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:magic-stick-bold"
              className="w-5 h-5 text-white"
            />
            <span className="text-xl font-minecraft text-white lowercase">
              profile creation
            </span>
          </div>
        </Card>

        <div ref={stepsRef} className="space-y-3">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isPast = stepNumber < currentStep;
            const isClickable =
              stepNumber <= currentStep || isStepValid(currentStep);
            const isValid = isStepValid(stepNumber);
            const isCompleted = isPast && isValid;

            return (
              <button
                key={`step-${stepNumber}`}
                className={`w-full text-left p-3 rounded-md transition-all duration-200 flex items-center gap-3 
                  border-2 ${isActive || isCompleted ? "border-b-4" : ""}`}
                style={{
                  backgroundColor: isActive
                    ? `${accentColor.value}30`
                    : isCompleted
                      ? `${accentColor.value}15`
                      : "rgba(0,0,0,0.2)",
                  borderColor: isActive
                    ? `${accentColor.value}60`
                    : isCompleted
                      ? `${accentColor.value}40`
                      : "rgba(255,255,255,0.2)",
                  borderBottomColor:
                    isActive || isCompleted
                      ? accentColor.value
                      : "rgba(255,255,255,0.15)",
                  boxShadow: isActive
                    ? `0 4px 0 rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15), inset 0 1px 0 ${accentColor.value}20, inset 0 0 0 1px ${accentColor.value}10`
                    : isCompleted
                      ? `0 3px 0 rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 ${accentColor.value}15, inset 0 0 0 1px ${accentColor.value}10`
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
                      : isCompleted
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(255,255,255,0.1)",
                    borderColor: isActive
                      ? `${accentColor.value}70`
                      : isCompleted
                        ? "rgba(16, 185, 129, 0.6)"
                        : "rgba(255,255,255,0.2)",
                  }}
                >
                  {isCompleted ? (
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
