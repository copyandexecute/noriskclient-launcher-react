"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { PlayTab } from "./components/tabs/PlayTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { ScrollbarProvider } from "./components/ui/ScrollbarProvider";
import { NewsSection } from "./components/news/NewsSection";
import { ProfilesTab } from "./components/tabs/ProfilesTab.tsx";
import ModrinthTab from "./components/tabs/ModrinthTab.tsx";
import { GlobalToaster } from "./components/ui/GlobalToaster";
import { listen, Event as TauriEvent } from "@tauri-apps/api/event";
import { toast } from 'react-hot-toast';
import {
  EventType as FrontendEventType,
  EventPayload as FrontendEventPayload,
  MinecraftProcessExitedPayload
} from "./types/events";
import { GlobalCrashReportModal } from "./components/modals/GlobalCrashReportModal";
import { useCrashModalStore } from "./store/crash-modal-store";

export function App() {
  const [activeTab, setActiveTab] = useState("play");
  const { openCrashModal } = useCrashModalStore();

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("norisk-theme-storage");
    if (storedTheme) {
      try {
        const themeData = JSON.parse(storedTheme);
        if (themeData.state?.accentColor?.value) {
          root.style.setProperty("--accent", themeData.state.accentColor.value);
          root.style.setProperty(
            "--accent-hover",
            themeData.state.accentColor.hoverValue,
          );

          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
              hex,
            );
            return result
              ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
              : null;
          };

          const rgbValue = hexToRgb(themeData.state.accentColor.value);
          if (rgbValue) {
            root.style.setProperty("--accent-rgb", rgbValue);
          }
        }
      } catch (e) {
        console.error("Failed to parse stored theme:", e);
      }
    }
  }, []);

  // Global listener for Minecraft crash events
  useEffect(() => {
    const unlisten = listen<FrontendEventPayload>("state_event", (event: TauriEvent<FrontendEventPayload>) => {
      if (event.payload.event_type === FrontendEventType.MinecraftProcessExited) {
        try {
          const exitPayload: MinecraftProcessExitedPayload = JSON.parse(event.payload.message);
          console.log("[App.tsx] Global MinecraftProcessExited event:", exitPayload);
          // Only show crash report if not successful AND exit code is not 1
          if (!exitPayload.success && exitPayload.exit_code !== 1) {
            const crashMsg = `Minecraft exited unexpectedly (Code: ${exitPayload.exit_code ?? 'N/A'}). See report for details.`;
            toast.error(crashMsg, { duration: 10000 }); 
            openCrashModal(exitPayload); 
          } else if (!exitPayload.success && exitPayload.exit_code === 1) {
            console.log(`[App.tsx] Minecraft process exited with code 1 (profile: ${exitPayload.profile_id}). Considered a normal close, no crash modal.`);
            // Optionally, you could show a more neutral toast here if desired, e.g.:
            // toast.info(`Minecraft (Profile: ${exitPayload.profile_id_or_name}) closed.`, { duration: 3000 });
          }
        } catch (e) {
          console.error("[App.tsx] Failed to parse MinecraftProcessExitedPayload:", e);
          toast.error("Could not globally process Minecraft process status.");
        }
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [openCrashModal]);

  const handleNavChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "play":
        return <PlayTab />;
      case "profiles":
        return <ProfilesTab />;
      case "mods":
        return <ModrinthTab />;
      case "skins":
        return null;
      case "store":
        return null;
      case "news":
        return <NewsSection />;
      case "settings":
        return <SettingsTab />;
      default:
        return <PlayTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ThemeInitializer />
      <ScrollbarProvider />
      <GlobalToaster />
      <GlobalCrashReportModal />
      <AppLayout activeTab={activeTab} onNavChange={handleNavChange}>
        {renderTabContent()}
      </AppLayout>
    </div>
  );
}
