"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";

interface TitleBarProps {
  className?: string;
  title?: string;
}

export function TitleBar({
  className,
  title = "NoRisk Client",
}: TitleBarProps) {
  const titleBarRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleBarRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    const setupWindowControls = async () => {
      try {
        const { Window } = await import("@tauri-apps/api/window");
        const currentWindow = Window.getCurrent();

        if (minimizeRef.current) {
          minimizeRef.current.addEventListener("click", () =>
            currentWindow.minimize(),
          );
        }

        if (maximizeRef.current) {
          maximizeRef.current.addEventListener("click", () =>
            currentWindow.toggleMaximize(),
          );
        }

        if (closeRef.current) {
          closeRef.current.addEventListener("click", () =>
            currentWindow.close(),
          );
        }
      } catch (error) {
        console.error("Failed to initialize window controls:", error);
      }
    };

    setupWindowControls();

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={titleBarRef}
      className={cn(
        "titlebar h-8 bg-black/60 backdrop-blur-lg border-b border-white/20 flex items-center justify-between px-4",
        className,
      )}
      data-tauri-drag-region
    >
      <div
        className="text-white/70 text-xs font-minecraft tracking-wider uppercase"
        data-tauri-drag-region
      >
        {title}
      </div>

      <div className="flex items-center gap-3">
        <div
          ref={minimizeRef}
          id="titlebar-minimize"
          className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Icon icon="pixel:minus-solid" className="w-4 h-4" />
        </div>
        <div
          ref={maximizeRef}
          id="titlebar-maximize"
          className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          title="Maximize"
        >
          <Icon icon="pixel:expand-solid" className="w-4 h-4" />
        </div>
        <div
          ref={closeRef}
          id="titlebar-close"
          className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-red-500 transition-colors cursor-pointer"
          title="Close"
        >
          <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
