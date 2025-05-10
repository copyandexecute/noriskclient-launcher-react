"use client";

import type React from "react";
import { type ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

import { VerticalNavbar } from ".././navigation/VerticalNavbar";
import { UserProfileBar } from ".././header/UserProfileBar";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import MatrixRainEffect from ".././effects/MatrixRainEffect";
import EnchantmentParticlesEffect from ".././effects/EnchantmentParticlesEffect";
import AccentWaves from ".././effects/AccentWaves";
import AccentParticles from ".././effects/AccentParticles";
import AccentGrid from ".././effects/AccentGrid";
import AccentVoxels from ".././effects/AccentVoxels";
import AccentLightning from ".././effects/AccentLightning";
import AccentLiquidChrome from ".././effects/AccentLiquidChrome";

const navItems = [
  { id: "play", icon: "solar:play-bold", label: "Play" },
  { id: "profiles", icon: "solar:user-id-bold", label: "Profiles" },
  { id: "mods", icon: "solar:widget-bold", label: "Mods" },
  { id: "skins", icon: "solar:emoji-funny-circle-bold", label: "Skins" },
  { id: "store", icon: "solar:shop-bold", label: "Store" },
  { id: "news", icon: "solar:bell-bold", label: "News" },
  { id: "settings", icon: "solar:settings-bold", label: "Settings" },
];

const appConfig = {
  version: "v0.5.22",
};

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
  const accentColor = useThemeStore((state) => state.accentColor);

  // Get the current background effect from our store
  const { currentEffect } = useBackgroundEffectStore();

  // Function to create a dark background color that complements the accent color
  const getComplementaryBackground = () => {
    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 34, g: 34, b: 34 }; // Default to #222 if parsing fails
    };

    const rgb = hexToRgb(accentColor.value);

    // Create a very dark version of the accent color (10% of original)
    // This ensures it's dark enough for readability but still has a hint of the accent
    const darkR = Math.floor(rgb.r * 0.1);
    const darkG = Math.floor(rgb.g * 0.1);
    const darkB = Math.floor(rgb.b * 0.1);

    // Ensure the background is not too bright (max 30 per channel)
    const finalR = Math.min(darkR, 30);
    const finalG = Math.min(darkG, 30);
    const finalB = Math.min(darkB, 30);

    return `rgb(${finalR}, ${finalG}, ${finalB})`;
  };

  // Get the background color
  const backgroundColor = getComplementaryBackground();

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
        // Try to import Tauri API, but don't fail if not available (for web development)
        const tauriModule = await import("@tauri-apps/api/window").catch(
          () => null,
        );

        if (tauriModule) {
          const { Window } = tauriModule;
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
        } else {
          // Fallback for web development
          console.log(
            "Tauri API not available, window controls will be decorative only",
          );
        }
      } catch (error) {
        console.error("Failed to initialize window controls:", error);
      }
    };

    setupWindowControls();

    return () => ctx.revert();
  }, []);

  const renderBackgroundEffect = () => {
    switch (currentEffect) {
      case BACKGROUND_EFFECTS.MATRIX_RAIN:
        return <MatrixRainEffect />;
      case BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES:
        return <EnchantmentParticlesEffect opacity={0.3} />;
      case BACKGROUND_EFFECTS.ACCENT_WAVES:
        return <AccentWaves opacity={0.2} speed={1} />;
      case BACKGROUND_EFFECTS.ACCENT_PARTICLES:
        return <AccentParticles opacity={0.3} particleCount={50} speed={1} />;
      case BACKGROUND_EFFECTS.ACCENT_GRID:
        return <AccentGrid opacity={0.15} speed={1} gridSize={30} />;
      case BACKGROUND_EFFECTS.ACCENT_VOXELS:
        return <AccentVoxels opacity={0.2} cubeCount={30} speed={1} />;
      case BACKGROUND_EFFECTS.ACCENT_LIGHTNING:
        return (
          <AccentLightning
            opacity={0.7}
            speed={0.8}
            intensity={1.2}
            size={1.5}
          />
        );
      case BACKGROUND_EFFECTS.ACCENT_LIQUID_CHROME:
        return (
          <AccentLiquidChrome
            opacity={0.7}
            speed={0.2}
            amplitude={0.5}
            frequencyX={3}
            frequencyY={2}
          />
        );
      default:
        return <MatrixRainEffect />;
    }
  };

  return (
    <div
      ref={launcherRef}
      className="h-screen w-full bg-black/50 backdrop-blur-lg border-2 overflow-hidden relative flex shadow-[0_0_25px_rgba(0,0,0,0.4)]"
      style={{
        backgroundColor: backgroundColor,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundImage: `linear-gradient(to bottom right, ${backgroundColor}, rgba(0,0,0,0.9))`,
        borderColor: `${accentColor.value}30`,
        boxShadow: `0 0 15px ${accentColor.value}30, inset 0 0 10px ${accentColor.value}20`,
      }}
    >
      <BorderGlowEffects accentColor={accentColor.value} />

      <VerticalNavbar
        items={navItems}
        activeItem={activeTab}
        onItemClick={onNavChange}
        className="h-full border-r-2 z-10"
        version={appConfig.version}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <HeaderBar
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />

        <div className="flex-1 relative overflow-hidden">
          {renderBackgroundEffect()}

          <div className="relative z-10 h-full overflow-hidden custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function BorderGlowEffects({ accentColor }: { accentColor: string }) {
  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 left-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 right-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
    </>
  );
}

interface HeaderBarProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function HeaderBar({ minimizeRef, maximizeRef, closeRef }: HeaderBarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div
      className="h-20 flex-shrink-0 border-b-2 bg-black/40 backdrop-blur-lg flex items-center justify-between px-8 z-10"
      style={{ borderColor: `${accentColor.value}40` }}
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
        <UserProfileBar />

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
