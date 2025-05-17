"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { toast as hotToast, Toaster as HotToaster } from "react-hot-toast";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";

export const toast = {
  success: (message: string) => {
    const id = hotToast.success(message);
    animateToast(id);
    return id;
  },
  error: (message: string) => {
    const id = hotToast.error(message);
    animateToast(id);
    return id;
  },
  loading: (message: string) => {
    const id = hotToast.loading(message);
    animateToast(id);
    return id;
  },
  custom: (message: string, icon?: React.ReactNode) => {
    const id = hotToast.custom((t) => (
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <span>{message}</span>
      </div>
    ));
    animateToast(id);
    return id;
  },
  dismiss: (id?: string) => {
    hotToast.dismiss(id);
  },
};

function animateToast(id: string) {
  setTimeout(() => {
    const toastElement = document.getElementById(`toast-${id}`);
    if (toastElement) {
      gsap.fromTo(
        toastElement,
        {
          x: 50,
          opacity: 0,
          scale: 0.9,
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        },
      );
    }
  }, 10);
}

export function GlobalToaster() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const toasterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toasts = document.querySelectorAll('[id^="toast-"]');
    toasts.forEach((toast) => {
      gsap.to(toast, {
        backgroundColor: "rgba(var(--accent-rgb), 0.3)",
        borderColor: "rgba(var(--accent-rgb), 0.8)",
        borderBottomColor: "var(--accent)",
        borderRadius: "0px",
        duration: 0.3,
      });
    });
  }, [accentColor]);

  return (
    <div ref={toasterRef}>
      <HotToaster
        position="bottom-right"
        toastOptions={{
          className: "font-minecraft tracking-wider lowercase text-shadow-sm",
          style: {
            borderWidth: "2px",
            borderBottomWidth: "4px",
            boxShadow:
              "0 6px 0 rgba(0,0,0,0.3), 0 8px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.1)",
            padding: "12px 16px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            backgroundColor: "rgba(var(--accent-rgb), 0.3)",
            borderColor: "rgba(var(--accent-rgb), 0.8)",
            borderBottomColor: "var(--accent)",
            color: "#f0f0f0",
            borderRadius: "0px",
            minWidth: "290px",
          },
          success: {
            style: {
              backgroundColor: "rgba(16, 185, 129, 0.3)",
              borderColor: "rgba(16, 185, 129, 0.8)",
              borderBottomColor: "#059669",
              color: "#d1fae5",
              borderRadius: "0px",
            },
            iconTheme: {
              primary: "#059669",
              secondary: "#d1fae5",
            },
          },
          error: {
            style: {
              backgroundColor: "rgba(239, 68, 68, 0.3)",
              borderColor: "rgba(239, 68, 68, 0.8)",
              borderBottomColor: "#dc2626",
              color: "#fee2e2",
              borderRadius: "0px",
            },
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fee2e2",
            },
          },
        }}
      />
    </div>
  );
}
