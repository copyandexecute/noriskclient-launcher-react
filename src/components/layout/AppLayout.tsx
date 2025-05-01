"use client";

import type React from "react";
import { type ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

import { appConfig, navItems, userData } from "../../data/mock-data";
import { VerticalNavbar } from "../navigation/VerticalNavbar";
import { UserProfileBar } from "../header/UserProfileBar";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onNavChange,
}: AppLayoutProps) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const backgroundPatternRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: "power3.out",
      });

      if (backgroundPatternRef.current) {
        gsap.to(backgroundPatternRef.current, {
          backgroundPosition: "100% 100%",
          duration: 120,
          repeat: -1,
          ease: "none",
        });
      }
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
      ref={launcherRef}
      className="h-screen w-full bg-black/50 backdrop-blur-lg border-2 border-white/20 overflow-hidden relative flex shadow-[0_0_25px_rgba(0,0,0,0.4)]"
      style={{
        backgroundColor: "#222",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <BorderGlowEffects />

      <VerticalNavbar
        items={navItems}
        activeItem={activeTab}
        onItemClick={onNavChange}
        className="h-full border-r-2 border-white/20 z-10"
        version={appConfig.version}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <HeaderBar
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />

        <div className="flex-1 relative overflow-hidden">
          <div
            ref={backgroundPatternRef}
            className="absolute inset-0 opacity-90 pointer-events-none"
            style={{
              backgroundImage: "url('/background.jpeg')",
              backgroundSize: "200% 200%",
              backgroundPosition: "0% 0%",
              filter: "blur(8px)",
            }}
          ></div>

          <div className="relative z-10 h-full overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BorderGlowEffects() {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
      <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
    </>
  );
}

interface HeaderBarProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function HeaderBar({ minimizeRef, maximizeRef, closeRef }: HeaderBarProps) {
  return (
    <div
      className="h-20 flex-shrink-0 border-b-2 border-white/20 bg-black/40 backdrop-blur-lg flex items-center justify-between px-8 z-10"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-4" data-tauri-drag-region>
        <h1
          className="font-minecraft text-4xl tracking-wider text-white font-bold uppercase text-shadow"
          data-tauri-drag-region
        >
          <span className="text-white">noriskclient</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <UserProfileBar
          username={userData.username}
          avatarUrl={userData.avatarUrl}
        />

        <WindowControls
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}

interface WindowControlsProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function WindowControls({
  minimizeRef,
  maximizeRef,
  closeRef,
}: WindowControlsProps) {
  return (
    <div className="flex items-center gap-3 ml-4">
      <div
        ref={minimizeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
        title="Minimize"
      >
        <Icon icon="pixel:minus-solid" className="w-4 h-4" />
      </div>
      <div
        ref={maximizeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
        title="Maximize"
      >
        <Icon icon="pixel:expand-solid" className="w-4 h-4" />
      </div>
      <div
        ref={closeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-red-500 transition-colors cursor-pointer"
        title="Close"
      >
        <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
      </div>
    </div>
  );
}
