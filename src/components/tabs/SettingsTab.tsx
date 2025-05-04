"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
// Assuming the type definition exists here, adjust if necessary
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service"; // Import the new service

export function SettingsTab() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false); // Reset save success message on reload
    try {
      // Use the service function
      const loadedConfig = await ConfigService.getLauncherConfig(); 
      setConfig(loadedConfig);
      setTempConfig({ ...loadedConfig }); // Create a mutable copy for edits
      console.log("Loaded launcher config:", loadedConfig);
    } catch (err) {
      console.error("Failed to load launcher config:", err);
      setError(err instanceof Error ? err.message : String(err));
      setConfig(null);
      setTempConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async () => {
    if (!tempConfig) return;

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      // Use the service function, passing the temporary config
      const updatedConfig = await ConfigService.setLauncherConfig(tempConfig); 
      setConfig(updatedConfig); // Update original config with saved version
      setTempConfig({ ...updatedConfig }); // Update temp copy as well
      console.log("Configuration saved successfully:", updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide message after 3s
    } catch (err) {
      console.error("Failed to save configuration:", err);
      setError(err instanceof Error ? err.message : String(err));
      // Don't automatically revert changes on save failure, let the user decide
    } finally {
      setSaving(false);
    }
  }, [tempConfig]);

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    if (!tempConfig) return;
    setTempConfig({ ...tempConfig, [id]: checked });
  };

  const handleConcurrentDownloadsChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!tempConfig) return;
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setTempConfig({ ...tempConfig, concurrent_downloads: value });
    }
  };

  const resetChanges = () => {
    if (config) {
      setTempConfig({ ...config });
      setError(null); // Clear potential save error on reset
      setSaveSuccess(false); // Clear save success message
    }
  };

  const hasChanges = config && tempConfig && JSON.stringify(config) !== JSON.stringify(tempConfig);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader title="Settings" icon="pixel:cog-solid" />
      <TabContent>
        <div className="overflow-y-auto">
          {loading && <p className="text-center text-white/70 p-4">Loading Settings...</p>}
          
          {error && (
            <div className="mb-4 p-4 rounded bg-red-900/50 border border-red-700">
              <p className="text-red-300 mb-3">
                Error: {error}
              </p>
              <button
                onClick={loadConfig}
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm cursor-pointer hover:enabled:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && config && tempConfig && (
            <div className="bg-black/10 rounded-lg p-6 shadow-md">
              <h3 className="text-5xl font-semibold mb-6 text-white/90">Launcher Settings</h3>
              <div className="flex flex-col gap-5 mb-6">
                {/* Experimental Mode */}
                <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                  <div className="w-1/3 min-w-[200px]">
                    <label htmlFor="is_experimental" className="font-minecraft text-3xl lowercase text-white/90 block">
                      Experimental Mode
                    </label>
                    <span className="font-minecraft-ten text-white/70 text-base block mt-1">
                      Enable experimental NoRisk Client features
                    </span>
                  </div>
                  <div className="flex-1 flex items-center pt-1">
                    <input
                      type="checkbox"
                      id="is_experimental"
                      checked={tempConfig.is_experimental}
                      onChange={handleCheckboxChange}
                      disabled={saving}
                      className="w-5 h-5 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    />
                  </div>
                </div>

                {/* Auto Updates */}
                <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                  <div className="w-1/3 min-w-[200px]">
                    <label htmlFor="auto_check_updates" className="font-minecraft text-3xl lowercase text-white/90 block">
                      Automatic Updates
                    </label>
                    <span className="font-minecraft-ten text-white/70 text-base block mt-1">
                      Automatically check for updates
                    </span>
                  </div>
                  <div className="flex-1 flex items-center pt-1">
                    <input
                      type="checkbox"
                      id="auto_check_updates"
                      checked={tempConfig.auto_check_updates}
                      onChange={handleCheckboxChange}
                      disabled={saving}
                      className="w-5 h-5 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    />
                  </div>
                </div>

                {/* Discord Presence */}
                <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                  <div className="w-1/3 min-w-[200px]">
                    <label htmlFor="enable_discord_presence" className="font-minecraft text-3xl lowercase text-white/90 block">
                      Discord Rich Presence
                    </label>
                    <span className="font-minecraft-ten text-white/70 text-base block mt-1">
                      Show your NoRisk Client status on Discord
                    </span>
                  </div>
                  <div className="flex-1 flex items-center pt-1">
                    <input
                      type="checkbox"
                      id="enable_discord_presence"
                      checked={tempConfig.enable_discord_presence}
                      onChange={handleCheckboxChange}
                      disabled={saving}
                      className="w-5 h-5 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    />
                  </div>
                </div>

                {/* Concurrent Downloads */}
                <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                  <div className="w-1/3 min-w-[200px]">
                    <label htmlFor="concurrent_downloads" className="font-minecraft text-3xl lowercase text-white/90 block">
                      Concurrent Downloads
                    </label>
                    <span className="font-minecraft-ten text-white/70 text-base block mt-1">
                      Number of concurrent downloads (1-10)
                    </span>
                  </div>
                  <div className="flex-1 flex items-center pt-1">
                    <input
                      type="number"
                      id="concurrent_downloads"
                      min="1"
                      max="10"
                      value={tempConfig.concurrent_downloads}
                      onChange={handleConcurrentDownloadsChange}
                      disabled={saving}
                      className="w-20 p-1.5 border border-white/20 rounded bg-black/20 text-white/90 disabled:cursor-not-allowed disabled:bg-black/10 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={saveConfig}
                  disabled={saving || !hasChanges}
                  className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:enabled:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
                <button
                  onClick={resetChanges}
                  disabled={saving || !hasChanges}
                  className="bg-gray-500 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:enabled:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Reset Changes
                </button>
              </div>

              {saving && (
                <p className="mt-4 p-2 rounded text-center bg-blue-900/50 text-blue-300 text-sm">
                  Saving settings...
                </p>
              )}
              {saveSuccess && (
                <p className="mt-4 p-2 rounded text-center bg-green-900/50 text-green-300 text-sm">
                  Settings saved successfully!
                </p>
              )}
               <div className="mt-5 text-xs text-white/50 text-right">
                Configuration Version: {config.version}
              </div>
            </div>
          )}
          
           {!loading && !error && !config && (
             <p className="text-center text-white/70 p-4">Could not load configuration.</p>
            )}
        </div>
      </TabContent>
    </div>
  );
}
