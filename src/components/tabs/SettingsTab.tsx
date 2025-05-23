"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@iconify/react";
import { Button } from ".././ui/buttons/Button";
import { Input } from ".././ui/Input";
import { Card } from ".././ui/Card";
import { ToggleSwitch } from ".././ui/ToggleSwitch";
import { ColorPicker } from ".././ColorPicker";
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import {
  type QualityLevel,
  useQualitySettingsStore,
} from "../../store/quality-settings-store";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { toast } from "react-hot-toast";
import { TabLayout } from ".././ui/TabLayout";
import EffectPreviewCard from ".././EffectPreviewCard";

export function SettingsTab() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance">(
    "general",
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef<boolean>(false);

  const { accentColor, isBackgroundAnimationEnabled } = useThemeStore();
  const { currentEffect, setCurrentEffect } = useBackgroundEffectStore();
  const { qualityLevel, setQualityLevel } = useQualitySettingsStore();

  const backgroundOptions = [
    {
      id: BACKGROUND_EFFECTS.MATRIX_RAIN,
      name: "Matrix Rain",
      icon: "solar:code-bold",
    },
    {
      id: BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES,
      name: "Enchantment Table",
      icon: "solar:magic-stick-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_WAVES,
      name: "Nebula Waves",
      icon: "solar:soundwave-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_PARTICLES,
      name: "Nebula Particles",
      icon: "solar:star-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_GRID,
      name: "Nebula Grid",
      icon: "solar:widget-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_VOXELS,
      name: "Nebula Voxels",
      icon: "solar:asteroid-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_LIGHTNING,
      name: "Nebula Lightning",
      icon: "solar:bolt-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_LIQUID_CHROME,
      name: "Liquid Chrome",
      icon: "solar:cloud-waterdrops-bold",
    },
    {
      id: BACKGROUND_EFFECTS.RETRO_GRID,
      name: "Retro Grid",
      icon: "solar:widget-5-bold",
    },
    {
      id: BACKGROUND_EFFECTS.PLAIN_BACKGROUND,
      name: "Plain Color",
      icon: "solar:palette-bold",
    },
  ];

  const qualityOptions: { value: QualityLevel; label: string; icon: string }[] =
    [
      {
        value: "low",
        label: "Low",
        icon: "solar:battery-half-bold",
      },
      {
        value: "medium",
        label: "Medium",
        icon: "solar:battery-full-bold",
      },
      { value: "high", label: "High", icon: "solar:battery-charge-bold" },
    ];

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  const autoSaveConfig = useCallback(async (configToSave: LauncherConfig) => {
    if (isResettingRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updatedConfig =
          await ConfigService.setLauncherConfig(configToSave);
        setConfig(updatedConfig);
        console.log("Configuration auto-saved successfully:", updatedConfig);
        toast.success("Settings auto-saved!", {
          duration: 2000,
          position: "bottom-right",
        });
      } catch (err) {
        console.error("Failed to auto-save configuration:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Auto-save failed: ${errorMessage}`);
      } finally {
        setSaving(false);
      }
    }, 0);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (tabRef.current && isBackgroundAnimationEnabled) {
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
  }, [isBackgroundAnimationEnabled]);

  useEffect(() => {
    if (contentRef.current && isBackgroundAnimationEnabled) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab, isBackgroundAnimationEnabled]);

  useEffect(() => {
    if (
      tempConfig &&
      config &&
      JSON.stringify(config) !== JSON.stringify(tempConfig)
    ) {
      autoSaveConfig(tempConfig);
    }
  }, [tempConfig, config, autoSaveConfig]);

  const handleConcurrentDownloadsChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!tempConfig) return;
    const value = Number.parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setTempConfig({ ...tempConfig, concurrent_downloads: value });
    }
  };

  const handleConcurrentIoLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!tempConfig) return;
    const value = Number.parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 20) {
      setTempConfig({ ...tempConfig, concurrent_io_limit: value });
    }
  };

  const resetChanges = () => {
    if (config) {
      isResettingRef.current = true;
      setTempConfig({ ...config });
      setError(null);
      toast.success("Settings reset to saved values");

      setTimeout(() => {
        isResettingRef.current = false;
      }, 100);
    }
  };

  const hasChanges =
    config &&
    tempConfig &&
    JSON.stringify(config) !== JSON.stringify(tempConfig);

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:settings-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Launcher Settings
            </h3>
          </div>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Configure basic launcher settings
          </p>
        </div>

        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Experimental Mode
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.is_experimental || false}
              onChange={(newCheckedState) => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    is_experimental: newCheckedState,
                  });
                }
              }}
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
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

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
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

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
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

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Open Logs After Starting
              </h5>
            </div>
            <ToggleSwitch
              checked={tempConfig?.open_logs_after_starting || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  open_logs_after_starting: checked,
                })
              }
              disabled={saving}
              size="lg"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
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
                icon={<Icon icon="solar:multiple-forward-right-bold" />}
                variant="flat"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
            <div>
              <h5 className="font-minecraft text-2xl lowercase text-white">
                Concurrent I/O Operations
              </h5>
            </div>
            <div className="flex items-center">
              <Input
                type="number"
                id="concurrent_io_limit"
                min="1"
                max="20"
                value={tempConfig?.concurrent_io_limit || 10}
                onChange={handleConcurrentIoLimitChange}
                disabled={saving}
                className="w-24"
                icon={<Icon icon="solar:server-bold" />}
                variant="flat"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:palette-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Accent Color
            </h3>
          </div>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Choose your preferred accent color for the launcher
          </p>
        </div>

        <div className="mt-6">
          <ColorPicker shape="square" size="md" showCustomOption={false} />
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20]">
          <div className="flex items-center gap-2 mb-3">
            <Icon icon="solar:eye-bold" className="w-5 h-5 text-white" />
            <h4 className="text-2xl font-minecraft text-white lowercase">
              Preview
            </h4>
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            <Button
              icon={<Icon icon="solar:play-bold" />}
              size="md"
              variant="flat"
            >
              Play Game
            </Button>
            <Button
              variant="flat-secondary"
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

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20] bg-black/10">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:lock-bold" className="w-5 h-5 text-white/50" />
            <h4 className="text-xl font-minecraft text-white/50 lowercase">
              Custom Colors
            </h4>
          </div>
          <p className="text-sm text-white/40 font-minecraft">
            Custom color selection is currently disabled
          </p>
        </div>
      </Card>

      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon
              icon="solar:speedometer-medium-bold"
              className="w-6 h-6 text-white"
            />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Visual Quality
            </h3>
          </div>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Adjust visual quality for all effects
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {qualityOptions.map((option) => (
            <Card
              key={option.value}
              variant="flat"
              className={cn(
                "relative cursor-pointer transition-all duration-300 p-4",
                qualityLevel === option.value
                  ? "ring-2 ring-white/30"
                  : "hover:bg-black/40",
              )}
              onClick={() => setQualityLevel(option.value)}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon icon={option.icon} className="w-8 h-8 text-white" />
                <h5 className="font-minecraft text-xl lowercase text-white text-center">
                  {option.label}
                </h5>
              </div>
              {qualityLevel === option.value && (
                <div className="absolute top-2 right-2">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg border border-[#ffffff20]">
          <p className="text-sm text-white/70 font-minecraft">
            {qualityLevel === "low" &&
              "Low quality reduces particle count and detail for better performance."}
            {qualityLevel === "medium" &&
              "Medium quality provides a balanced experience for most systems."}
            {qualityLevel === "high" &&
              "High quality increases visual fidelity but may impact performance on older systems."}
          </p>
        </div>
      </Card>

      <Card variant="flat" className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:stars-bold" className="w-6 h-6 text-white" />
            <h3 className="text-3xl font-minecraft text-white lowercase">
              Background Effect
            </h3>
          </div>
          <p className="text-xl text-white/70 font-minecraft mt-2">
            Choose a background effect for the launcher
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {backgroundOptions.map((option) => (
            <EffectPreviewCard
              key={option.id}
              effectId={option.id}
              name={option.name}
              icon={option.icon}
              isActive={currentEffect === option.id}
              onClick={() => setCurrentEffect(option.id)}
            />
          ))}
        </div>
      </Card>
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

  const settingsActions = <div className="flex items-center gap-3"></div>;

  return (
    <div ref={tabRef} className="flex flex-col h-full overflow-hidden">
      <TabLayout
        title="Settings"
        icon="solar:settings-bold"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant={activeTab === "general" ? "flat" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("general")}
              icon={
                <Icon
                  icon="solar:settings-bold"
                  className="w-4 h-4 text-white"
                />
              }
            >
              general
            </Button>
            <Button
              variant={activeTab === "appearance" ? "flat" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("appearance")}
              icon={
                <Icon
                  icon="solar:palette-bold"
                  className="w-4 h-4 text-white"
                />
              }
            >
              appearance
            </Button>
            {settingsActions}
          </div>
        }
      >
        <div ref={contentRef}>{renderTabContent()}</div>
      </TabLayout>
    </div>
  );
}
