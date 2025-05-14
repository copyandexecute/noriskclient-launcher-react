"use client";

import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { Button } from "../ui/buttons/Button";
import AccentGrid from "../effects/AccentGrid";
import AccentParticles from "../effects/AccentParticles";
import AccentWaves from "../effects/AccentWaves";
import AccentVoxels from "../effects/AccentVoxels";
import AccentLightning from "../effects/AccentLightning";
import AccentLiquidChrome from "../effects/AccentLiquidChrome";
import MatrixRainEffect from "../effects/MatrixRainEffect";

interface UpdaterStatusPayload {
  message: string;
  status:
    | "checking"
    | "downloading"
    | "installing"
    | "uptodate"
    | "pending"
    | "error"
    | "finished"
    | "close";
  progress?: number;
  total?: number;
  chunk?: number;
}

export default function Updater() {
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] =
    useState<UpdaterStatusPayload["status"]>("checking");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appWindow = getCurrentWindow();
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const accentColor = useThemeStore((state) => state.accentColor);

  const currentEffect = useBackgroundEffectStore(
    (state) => state.currentEffect,
  );

  useEffect(() => {
    const checkThemeLoaded = () => {
      if (accentColor && accentColor.value) {
        setIsThemeLoaded(true);
        return;
      }
      setTimeout(checkThemeLoaded, 50);
    };
    checkThemeLoaded();
  }, [accentColor]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.2)" },
      );
    }
  }, []);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const unlistenPromise = listen<UpdaterStatusPayload>(
      "updater_status",
      (event) => {
        const {
          message,
          status: newStatus,
          progress: eventProgress,
        } = event.payload;

        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }

        setStatusMessage(message);
        setStatus(newStatus);

        if (
          newStatus === "downloading" &&
          typeof eventProgress === "number" &&
          eventProgress >= 0 &&
          eventProgress <= 100
        ) {
          setProgress(eventProgress);
          setStatusMessage(`Downloading... ${eventProgress}%`);

          if (progressRef.current) {
            gsap.to(progressRef.current, {
              width: `${eventProgress}%`,
              duration: 0.3,
              ease: "power1.out",
            });
          }
        } else {
          setProgress(null);
        }

        switch (newStatus) {
          case "uptodate":
          case "finished":
            appWindow
              .close()
              .catch((err: Error) =>
                console.error(
                  "Failed to close updater window on completion:",
                  err,
                ),
              );
            break;
          case "error":
            break;
          case "close":
            appWindow
              .close()
              .catch((err: Error) =>
                console.error(
                  "Failed to close updater window on 'close' event:",
                  err,
                ),
              );
            break;
        }
      },
    );

    return () => {
      unlistenPromise
        .then((f) => f())
        .catch((err: Error) =>
          console.error("Failed to unlisten updater events:", err),
        );
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [appWindow]);

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return (
          <Icon icon="solar:refresh-bold" className="w-5 h-5 animate-spin" />
        );
      case "downloading":
        return <Icon icon="solar:download-bold" className="w-5 h-5" />;
      case "installing":
        return <Icon icon="solar:box-bold" className="w-5 h-5" />;
      case "uptodate":
      case "finished":
        return <Icon icon="solar:check-circle-bold" className="w-5 h-5" />;
      case "error":
        return <Icon icon="solar:danger-triangle-bold" className="w-5 h-5" />;
      default:
        return <Icon icon="solar:info-circle-bold" className="w-5 h-5" />;
    }
  };

  const handleManualClose = () => {
    appWindow
      .close()
      .catch((err: Error) =>
        console.error("Failed to close updater window:", err),
      );
  };

  const renderBackgroundEffect = () => {
    switch (currentEffect) {
      case BACKGROUND_EFFECTS.ACCENT_PARTICLES:
        return <AccentParticles opacity={0.1} />;
      case BACKGROUND_EFFECTS.ACCENT_WAVES:
        return <AccentWaves opacity={0.1} />;
      case BACKGROUND_EFFECTS.ACCENT_VOXELS:
        return <AccentVoxels opacity={0.1} />;
      case BACKGROUND_EFFECTS.ACCENT_LIGHTNING:
        return <AccentLightning opacity={0.1} />;
      case BACKGROUND_EFFECTS.ACCENT_LIQUID_CHROME:
        return <AccentLiquidChrome opacity={0.1} />;
      case BACKGROUND_EFFECTS.MATRIX_RAIN:
        return <MatrixRainEffect opacity={0.1} />;
      case BACKGROUND_EFFECTS.ACCENT_GRID:
      default:
        return <AccentGrid opacity={0.1} />;
    }
  };

  if (!isThemeLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-white text-2xl font-minecraft">
          Loading theme...
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center">
      {renderBackgroundEffect()}

      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-col items-center justify-between text-center",
          "border-2 border-b-4 shadow-2xl rounded-lg",
          "w-screen h-screen",
        )}
        style={{
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}80`,
          borderBottomColor: accentColor.value,
          boxShadow: `0 10px 0 rgba(0,0,0,0.3), 0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{ backgroundColor: `${accentColor.value}80` }}
        />

        <div className="w-full pt-8" />

        <div className="flex-1 w-full flex flex-col items-center justify-center px-8 gap-12">
          <div className="flex flex-col items-center">
            <img
              ref={logoRef}
              src="/logo.png"
              alt="NoRiskClient Logo"
              className="w-40 h-40 object-contain mb-2"
            />
            <p className="text-xl font-minecraft text-white/70 lowercase">
              Updater
            </p>
          </div>

          <div className="flex items-center justify-center mb-6">
            {status === "uptodate" || status === "finished" ? (
              <div
                className={cn(
                  "flex items-center justify-center gap-3 py-2 px-6",
                  "border-2 border-b-4 rounded-md",
                )}
                style={{
                  backgroundColor: `${accentColor.value}30`,
                  borderColor: `${accentColor.value}80`,
                  borderBottomColor: accentColor.value,
                }}
              >
                <Icon
                  icon="solar:check-circle-bold"
                  className="w-6 h-6 text-green-400"
                />
                <span className="font-minecraft text-2xl text-white">
                  Update Complete
                </span>
              </div>
            ) : status === "error" ? (
              <div
                className={cn(
                  "flex items-center justify-center gap-3 py-2 px-6",
                  "border-2 border-b-4 rounded-md",
                )}
                style={{
                  backgroundColor: "#ef444430",
                  borderColor: "#ef444480",
                  borderBottomColor: "#ef4444",
                }}
              >
                <Icon
                  icon="solar:danger-triangle-bold"
                  className="w-6 h-6 text-red-400"
                />
                <span className="font-minecraft text-2xl text-white">
                  {statusMessage}
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center gap-3 py-2 px-6",
                  "border-2 border-b-4 rounded-md",
                )}
                style={{
                  backgroundColor: `${accentColor.value}30`,
                  borderColor: `${accentColor.value}80`,
                  borderBottomColor: accentColor.value,
                }}
              >
                {getStatusIcon()}
                <span className="font-minecraft text-2xl text-white">
                  {statusMessage}
                </span>
              </div>
            )}
          </div>

          {progress !== null && (
            <div
              className="w-3/4 h-3 rounded-md overflow-hidden mb-6 border-2"
              style={{
                backgroundColor: `${accentColor.value}15`,
                borderColor: `${accentColor.value}50`,
              }}
            >
              <div
                ref={progressRef}
                className="h-full rounded-sm"
                style={{
                  width: `${progress}%`,
                  backgroundColor: accentColor.value,
                }}
              />
            </div>
          )}
        </div>

        <div className="w-full p-8 flex justify-center">
          {status === "error" && (
            <Button
              variant="destructive"
              size="md"
              onClick={handleManualClose}
              icon={<Icon icon="solar:close-circle-bold" className="w-5 h-5" />}
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
