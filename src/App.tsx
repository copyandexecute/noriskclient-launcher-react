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

export function App() {
  const [activeTab, setActiveTab] = useState("play");

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
      <AppLayout activeTab={activeTab} onNavChange={handleNavChange}>
        {renderTabContent()}
      </AppLayout>
    </div>
  );
}
