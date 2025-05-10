"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@iconify/react";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { ColorPicker } from "../ColorPicker";
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";

export function SettingsTab() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance">(
    "general",
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  const { accentColor } = useThemeStore();
  const { currentEffect, setCurrentEffect } = useBackgroundEffectStore();

  const backgroundOptions = [
    {
      id: BACKGROUND_EFFECTS.MATRIX_RAIN,
      name: "Matrix Rain",
      icon: "solar:cube-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES,
      name: "Enchantment Table",
      icon: "solar:magic-stick-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_WAVES,
      name: "Accent Waves",
      icon: "solar:wave-linear",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_PARTICLES,
      name: "Accent Particles",
      icon: "solar:star-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_GRID,
      name: "Accent Grid",
      icon: "solar:square-academic-cap-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_VOXELS,
      name: "Accent Voxels",
      icon: "solar:cube-3d-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_LIGHTNING,
      name: "Accent Lightning",
      icon: "solar:bolt-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ACCENT_LIQUID_CHROME,
      name: "Liquid Chrome",
      icon: "solar:liquid-bold",
    },
  ];

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const loadedConfig = await ConfigService.getLauncherConfig();
      setConfig(loadedConfig);
      setTempConfig({ ...loadedConfig });
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

  useEffect(() => {
    if (tabRef.current) {
      gsap.fromTo(
        tabRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab]);

  const saveConfig = useCallback(async () => {
    if (!tempConfig) return;

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const updatedConfig = await ConfigService.setLauncherConfig(tempConfig);
      setConfig(updatedConfig);
      setTempConfig({ ...updatedConfig });
      console.log("Configuration saved successfully:", updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save configuration:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [tempConfig]);

  const handleConcurrentDownloadsChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!tempConfig) return;
    const value = Number.parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setTempConfig({ ...tempConfig, concurrent_downloads: value });
    }
  };

  const resetChanges = () => {
    if (config) {
      setTempConfig({ ...config });
      setError(null);
      setSaveSuccess(false);
    }
  };

  const hasChanges =
    config &&
    tempConfig &&
    JSON.stringify(config) !== JSON.stringify(tempConfig);

  const cardStyle = {
    borderColor: `${accentColor.value}80`,
    borderBottomColor: accentColor.value,
    boxShadow:
      "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
    backgroundColor: `${accentColor.value}10`,
  };

  const settingItemStyle = {
    borderColor: `${accentColor.value}40`,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 p-6 rounded-md",
          "border-2 border-b-4",
          "bg-black/20 backdrop-blur-md",
        )}
        style={cardStyle}
      >
        <div className="mb-4">
          <Label
            size="lg"
            className="mb-2"
            icon={<Icon icon="solar:settings-bold" />}
          >
            Launcher Settings
          </Label>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Configure basic launcher settings
          </p>
        </div>

        <div className="space-y-4 mt-6">
          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-black/30 transition-colors"
            style={settingItemStyle}
          >
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Experimental Mode
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.is_experimental || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({ ...tempConfig, is_experimental: checked })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-black/30 transition-colors"
            style={settingItemStyle}
          >
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Auto Updates
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.auto_check_updates || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({ ...tempConfig, auto_check_updates: checked })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-black/30 transition-colors"
            style={settingItemStyle}
          >
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Discord Presence
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.enable_discord_presence || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  enable_discord_presence: checked,
                })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-black/30 transition-colors"
            style={settingItemStyle}
          >
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Beta Updates
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.check_beta_channel || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({ ...tempConfig, check_beta_channel: checked })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-black/30 transition-colors"
            style={settingItemStyle}
          >
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Concurrent Downloads
              </h5>
            </div>
            <div className="flex items-center">
              <Input
                type="number"
                id="concurrent_downloads"
                min="1"
                max="10"
                value={tempConfig?.concurrent_downloads || 3}
                onChange={handleConcurrentDownloadsChange}
                disabled={saving}
                className="w-24"
                icon={<Icon icon="solar:sort-by-time-bold" />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 p-6 rounded-md",
          "border-2 border-b-4",
          "bg-black/20 backdrop-blur-md",
        )}
        style={cardStyle}
      >
        <div className="mb-4">
          <Label
            size="lg"
            className="mb-2"
            icon={<Icon icon="solar:palette-bold" />}
          >
            Accent Color
          </Label>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Choose your preferred accent color for the launcher
          </p>
        </div>

        <div className="mt-6">
          <ColorPicker shape="square" size="md" showCustomOption={true} />
        </div>

        <div className="mt-6 p-4 rounded-lg border" style={settingItemStyle}>
          <Label
            size="md"
            className="mb-3"
            icon={<Icon icon="solar:eye-bold" />}
          >
            Preview
          </Label>
          <div className="flex flex-wrap gap-4 mt-3">
            <Button icon={<Icon icon="solar:play-bold" />} size="md">
              Play Game
            </Button>
            <Button
              variant="secondary"
              icon={<Icon icon="solar:settings-bold" />}
              size="md"
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              icon={<Icon icon="solar:download-bold" />}
              size="md"
            >
              Download
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 p-6 rounded-md",
          "border-2 border-b-4",
          "bg-black/20 backdrop-blur-md",
        )}
        style={cardStyle}
      >
        <div className="mb-4">
          <Label
            size="lg"
            className="mb-2"
            icon={<Icon icon="solar:stars-bold" />}
          >
            Background Effect
          </Label>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Choose a background effect for the launcher
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {backgroundOptions.map((option) => (
            <button
              key={option.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 p-3 rounded-md",
                "border-2 border-b-4",
                "bg-black/20 backdrop-blur-md",
                currentEffect === option.id
                  ? "ring-2 ring-white/30"
                  : "hover:bg-black/40",
              )}
              style={{
                borderColor:
                  currentEffect === option.id
                    ? accentColor.value
                    : `${accentColor.value}40`,
                borderBottomColor:
                  currentEffect === option.id
                    ? accentColor.value
                    : `${accentColor.value}60`,
                boxShadow:
                  "0 4px 0 rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
                backgroundColor:
                  currentEffect === option.id
                    ? `${accentColor.value}20`
                    : "rgba(0, 0, 0, 0.2)",
              }}
              onClick={() => setCurrentEffect(option.id)}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon icon={option.icon} className="w-8 h-8 text-white" />
                <h5 className="font-minecraft text-xl lowercase text-white text-center">
                  {option.name}
                </h5>
              </div>

              {currentEffect === option.id && (
                <div className="absolute top-2 right-2">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon
              icon="solar:refresh-bold"
              className="w-10 h-10 text-white/70 animate-spin mx-auto mb-4"
            />
            <p className="text-2xl text-white/70 font-minecraft">
              Loading Settings...
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/30 border-2 border-red-700/50 rounded-lg p-6 my-4">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:danger-triangle-bold"
              className="w-8 h-8 text-red-400 flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="text-2xl text-red-300 font-minecraft mb-2">
                Error Loading Settings
              </h3>
              <p className="text-xl text-red-200/80 font-minecraft mb-4">
                {error}
              </p>
              <Button
                onClick={loadConfig}
                variant="secondary"
                size="sm"
                icon={<Icon icon="solar:refresh-bold" className="w-5 h-5" />}
                disabled={loading}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!config || !tempConfig) {
      return (
        <div className="text-center p-8">
          <p className="text-2xl text-white/70 font-minecraft">
            Could not load configuration.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "general":
        return renderGeneralTab();
      case "appearance":
        return renderAppearanceTab();
      default:
        return null;
    }
  };

  return (
    <div ref={tabRef} className="flex flex-col h-full overflow-hidden">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b-2 sticky top-0 z-10"
        style={{
          backgroundColor: `${accentColor.value}15`,
          borderColor: `${accentColor.value}60`,
          boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Label
            variant={activeTab === "general" ? "default" : "ghost"}
            size="sm"
            className="cursor-pointer"
            onClick={() => setActiveTab("general")}
            icon={
              <Icon icon="solar:settings-bold" className="w-4 h-4 text-white" />
            }
          >
            general
          </Label>
          <Label
            variant={activeTab === "appearance" ? "default" : "ghost"}
            size="sm"
            className="cursor-pointer"
            onClick={() => setActiveTab("appearance")}
            icon={
              <Icon icon="solar:brush-bold" className="w-4 h-4 text-white" />
            }
          >
            appearance
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={resetChanges}
            disabled={saving || !hasChanges}
            variant="secondary"
            size="sm"
            icon={<Icon icon="solar:refresh-bold" className="w-4 h-4" />}
          >
            Reset
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            variant="default"
            size="sm"
            icon={<Icon icon="solar:disk-bold" className="w-4 h-4" />}
          >
            {saving ? (
              <>
                <Icon
                  icon="solar:refresh-bold"
                  className="w-4 h-4 animate-spin"
                />
                <span>Saving...</span>
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar">
        <div ref={contentRef}>
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-4 py-3 rounded-md mb-4">
              <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
              <span className="text-xl font-minecraft">Settings saved!</span>
            </div>
          )}

          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
