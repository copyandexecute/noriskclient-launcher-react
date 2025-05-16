"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { PlayTab } from "./components/tabs/PlayTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { ScrollbarProvider } from "./components/ui/ScrollbarProvider";
import { NewsSection } from "./components/news/NewsSection";
import { ProfilesTab } from "./components/tabs/ProfilesTab.tsx";
// import ModrinthTab from "./components/tabs/ModrinthTab.tsx"; // Ensure this line is removed or commented out
import ModrinthTabV2 from "./components/tabs/ModrinthTabV2.tsx";
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
import {SkinsTab} from "./components/tabs/SkinsTab.tsx";
import { refreshNrcDataOnMount } from "./services/nrc-service";
import { NewsTab } from "./components/tabs/NewsTab.tsx";
import { StoreTab } from "./components/tabs/StoreTab.tsx";
import { getLauncherConfig, setProfileGroupingPreference } from "./services/launcher-config-service";

export function App() {
  const [activeTab, setActiveTab] = useState("play");
  const { openCrashModal } = useCrashModalStore();
  // State for the CURRENT grouping criterion, managed by App.tsx
  const [currentProfilesGrouping, setCurrentProfilesGrouping] = useState<string | undefined>(undefined);

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
          if (!exitPayload.success) {
            const crashMsg = `Minecraft crashed (Exit Code: ${exitPayload.exit_code ?? 'N/A'}). See crash report for details.`;
            toast.error(crashMsg, { duration: 10000 }); 
            openCrashModal(exitPayload); 
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

  // Effect to refresh Norisk packs and standard versions on mount
  useEffect(() => {
    refreshNrcDataOnMount();
  }, []); // Empty dependency array ensures this runs only on mount

  // Effect to fetch initial grouping criterion for ProfilesTab
  useEffect(() => {
    getLauncherConfig()
      .then(config => {
        if (config && config.profile_grouping_criterion) {
          setCurrentProfilesGrouping(config.profile_grouping_criterion);
        } else {
          setCurrentProfilesGrouping("none"); // Default if not found or no config
        }
      })
      .catch(err => {
        console.error("Failed to get initial profile grouping from config:", err);
        setCurrentProfilesGrouping("none"); // Default on error
      });
  }, []);

  // Handler for when grouping changes in ProfilesTab
  const handleProfileGroupingChange = async (newCriterion: string) => {
    setCurrentProfilesGrouping(newCriterion);
    try {
      await setProfileGroupingPreference(newCriterion);
      console.log("[App.tsx] Grouping preference saved successfully.");
    } catch (error) {
      console.error("[App.tsx] Failed to save grouping preference:", error);
      toast.error("Failed to save grouping preference."); // Toast can be here or handled by ProfilesTab if preferred
    }
  };

  const handleNavChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "play":
        return <PlayTab />;
      case "profiles":
        return currentProfilesGrouping !== undefined ? (
          <ProfilesTab 
            currentGroupingCriterion={currentProfilesGrouping} 
            onGroupingChange={handleProfileGroupingChange} 
          />
        ) : null; // Or a loading indicator
      case "mods":
        return <ModrinthTabV2 />;
      case "skins":
        return <SkinsTab />;
      case "store":
        return <StoreTab />;
      case "news":
        return <NewsTab />;
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
