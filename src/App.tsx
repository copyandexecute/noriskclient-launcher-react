"use client";
import { useState, useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { PlayTab } from "./components/tabs/PlayTab";
import { SkinsTab } from "./components/tabs/SkinsTab";
import { NewsTab } from "./components/tabs/NewsTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { ProfilesTab } from "./components/tabs/ProfilesTab";
import { StoreTab } from "./components/tabs/StoreTab";
import { ModrinthTab } from "./components/tabs/ModrinthTab";
import { setupToastListeners } from './utils/toast-event';

export function App() {
  const [activeTab, setActiveTab] = useState("play");

  // Toast-Listeners initialisieren
  useEffect(() => {
    // Setup Toast-Listener beim Mounting
    const cleanupToastListeners = setupToastListeners();
    
    // Aufräumen beim Unmounting
    return () => {
      cleanupToastListeners();
    };
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
      <AppLayout activeTab={activeTab} onNavChange={handleNavChange}>
        {renderTabContent()}
      </AppLayout>
    </div>
  );
}
