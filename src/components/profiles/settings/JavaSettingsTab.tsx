"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { StatusMessage } from "../../ui/StatusMessage";
import { Button } from "../../ui/buttons/Button";
import { useThemeStore } from "../../../store/useThemeStore";
import { RangeSlider } from "../../ui/RangeSlider";
import { Input } from "../../ui/Input";
import { TextArea } from "../../ui/TextArea";
import { Checkbox } from "../../ui/Checkbox";
import { Card } from "../../ui/Card";
import { gsap } from "gsap";

interface JavaSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  systemRam: number;
}

export function JavaSettingsTab({
  editedProfile,
  updateProfile,
  systemRam,
}: JavaSettingsTabProps) {
  const [error] = useState<string | null>(null);
  const [useCustomJava, setUseCustomJava] = useState(
    !!editedProfile.settings?.java_path,
  );
  const [useCustomArgs, setUseCustomArgs] = useState(
    (editedProfile.settings?.custom_jvm_args?.length || 0) > 0,
  );
  const accentColor = useThemeStore((state) => state.accentColor);
  const tabRef = useRef<HTMLDivElement>(null);
  const javaInstallRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  const argsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabRef.current) {
      gsap.fromTo(
        tabRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" },
      );
    }

    const elements = [
      javaInstallRef.current,
      memoryRef.current,
      argsRef.current,
    ].filter(Boolean);

    gsap.fromTo(
      elements,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.2,
      },
    );
  }, []);

  const recommendedMaxRam = Math.min(Math.floor(systemRam / 2), 16384);
  const memory = editedProfile.settings?.memory || {
    min: 1024,
    max: recommendedMaxRam,
  };

  const handleMemoryChange = (value: number) => {
    const newSettings = { ...editedProfile.settings };
    if (!newSettings.memory) {
      newSettings.memory = {
        min: 1024,
        max: value,
      };
    } else {
      newSettings.memory.max = value;
    }
    updateProfile({ settings: newSettings });
  };

  const handleJavaPathChange = (path: string) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.java_path = path;
    updateProfile({ settings: newSettings });
  };

  const handleJavaArgsChange = (args: string) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.custom_jvm_args = args;
    updateProfile({ settings: newSettings });
  };

  const handleCustomJavaToggle = (checked: boolean) => {
    setUseCustomJava(checked);
    const newSettings = { ...editedProfile.settings };
    if (checked) {
      newSettings.java_path = "";
    } else {
      newSettings.java_path = null;
    }
    updateProfile({ settings: newSettings });

    if (checked) {
      const inputContainer =
        javaInstallRef.current?.querySelector(".custom-java-input");
      if (inputContainer) {
        gsap.fromTo(
          inputContainer,
          { opacity: 0, height: 0 },
          {
            opacity: 1,
            height: "auto",
            duration: 0.3,
            ease: "power2.out",
          },
        );
      }
    }
  };

  const handleCustomArgsToggle = (checked: boolean) => {
    setUseCustomArgs(checked);
    const newSettings = { ...editedProfile.settings };
    if (checked) {
      newSettings.custom_jvm_args = [
        "-XX:+UseG1GC",
        "-XX:+ParallelRefProcEnabled",
        "-XX:MaxGCPauseMillis=200",
      ].join(" ");
    } else {
      newSettings.custom_jvm_args = null;
    }
    updateProfile({ settings: newSettings });

    if (checked) {
      const textareaContainer = argsRef.current?.querySelector(
        ".custom-args-textarea",
      );
      if (textareaContainer) {
        gsap.fromTo(
          textareaContainer,
          { opacity: 0, height: 0 },
          {
            opacity: 1,
            height: "auto",
            duration: 0.3,
            ease: "power2.out",
          },
        );
      }
    }
  };

  return (
    <div ref={tabRef} className="space-y-6 select-none">
      {error && <StatusMessage type="error" message={error} />}

      <div ref={javaInstallRef} className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            java installation
          </h3>
          <div className="mb-3">
            <Checkbox
              checked={useCustomJava}
              onChange={(e) => handleCustomJavaToggle(e.target.checked)}
              label="custom java installation"
              className="text-2xl"
            />
          </div>

          {!useCustomJava && (
            <Card variant="default" className="p-4 mt-3">
              <div className="text-2xl text-white font-minecraft mb-2 lowercase tracking-wide select-none">
                using default java 21 installation:
              </div>
              <div className="text-xl text-white/70 font-minecraft break-all lowercase tracking-wide select-none">
                c:\users\username\appdata\roaming\noriskclient\meta\java_versions\zulu21.38.21-ca-jre21.0.5-win_x64\bin\javaw.exe
              </div>
            </Card>
          )}

          {useCustomJava && (
            <div className="flex gap-3 mt-3 custom-java-input">
              <Input
                value={editedProfile.settings?.java_path || ""}
                onChange={(e) => handleJavaPathChange(e.target.value)}
                placeholder="path to java executable"
                className="flex-1 text-2xl py-3"
              />
              <Button
                variant="secondary"
                size="md"
                icon={
                  <Icon
                    icon="solar:folder-with-files-bold"
                    className="w-5 h-5 text-white"
                  />
                }
                className="text-2xl"
              >
                browse
              </Button>
            </div>
          )}
        </div>
      </div>

      <div ref={memoryRef} className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            memory allocated
          </h3>
          <Card variant="default" className="p-4">
            <RangeSlider
              value={memory.max}
              onChange={handleMemoryChange}
              min={512}
              max={systemRam}
              step={512}
              valueLabel={`${memory.max} MB (${(memory.max / 1024).toFixed(1)} GB)`}
              minLabel="512 MB"
              maxLabel={`${systemRam} MB`}
            />

            <div className="mt-3 text-xl text-white/70 tracking-wide select-none">
              recommended: {recommendedMaxRam} MB (
              {(recommendedMaxRam / 1024).toFixed(1)} GB)
            </div>
          </Card>
        </div>
      </div>

      <div ref={argsRef} className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            java arguments
          </h3>
          <div className="mb-3">
            <Checkbox
              checked={useCustomArgs}
              onChange={(e) => handleCustomArgsToggle(e.target.checked)}
              label="custom java arguments"
              className="text-2xl"
            />
          </div>

          {useCustomArgs && (
            <div className="custom-args-textarea">
              <TextArea
                value={editedProfile.settings?.custom_jvm_args || ""}
                onChange={(e) => handleJavaArgsChange(e.target.value)}
                placeholder="enter java arguments..."
                className="w-full min-h-[100px] text-2xl"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
