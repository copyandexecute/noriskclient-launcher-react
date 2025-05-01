"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";
import { StepIndicator } from "./wizard/StepIndicator";
import { GeneralStep } from "./wizard/GeneralStep";
import { VersionStep } from "./wizard/VersionStep";
import { ModLoaderStep } from "./wizard/ModLoaderStep";
import type {
  CreateProfileParams,
  ModLoader,
  Profile,
} from "../../types/profile";
import { useProfileStore } from "../../store/profile-store";
import { invoke } from "@tauri-apps/api/core";
// @ts-ignore
import type { VersionManifest } from "../../types/minecraft";
import { Modal } from ".././ui/Modal";
import { Button } from ".././ui/Button";
import { LoadingSpinner } from ".././ui/LoadingSpinner";
import { StatusMessage } from ".././ui/StatusMessage";

interface ProfileWizardProps {
  onClose: () => void;
  onSave: (profile: Profile) => void;
}

export function ProfileWizard({ onClose, onSave }: ProfileWizardProps) {
  const { createProfile } = useProfileStore();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<Profile>>({
    name: "",
    game_version: "",
    loader: "vanilla" as ModLoader,
    loader_version: null,
    description: null,
    group: null,
    settings: {
      memory: { min: 1024, max: 4096 },
      resolution: { width: 1280, height: 720 },
      fullscreen: false,
      extra_args: [],
      java_path: null,
    },
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minecraftVersions, setMinecraftVersions] =
    useState<VersionManifest | null>(null);
  const [systemRamMb, setSystemRamMb] = useState<number>(8192);
  const contentRef = useRef<HTMLDivElement>(null);

  const totalSteps = 3;
  const stepTitles = ["general", "version", "modloader"];

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const versions = await invoke<VersionManifest>(
          "get_minecraft_versions",
        );
        setMinecraftVersions(versions);

        const latestRelease = versions.versions.find(
          // @ts-ignore
          (v) => v.type === "release",
        );
        if (latestRelease && !profile.game_version) {
          setProfile((prev) => ({ ...prev, game_version: latestRelease.id }));
        }

        try {
          const ramMb = await invoke<number>("get_system_ram_mb");
          setSystemRamMb(ramMb);

          const defaultMaxMemory = Math.min(
            Math.max(Math.floor(ramMb / 4), 2048),
            8192,
          );
          setProfile((prev) => ({
            ...prev,
            settings: {
              ...prev.settings!,
              memory: {
                min: 1024,
                max: defaultMaxMemory,
              },
            },
          }));
        } catch (err) {
          console.error("Failed to get system RAM:", err);
        }
      } catch (err) {
        console.error("Failed to load Minecraft versions:", err);
        setError("Failed to load Minecraft versions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [step]);

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);

      if (!profile.name) {
        setError("Profile name is required");
        setCreating(false);
        return;
      }

      if (!profile.game_version) {
        setError("Minecraft version is required");
        setCreating(false);
        return;
      }

      const createParams: CreateProfileParams = {
        name: profile.name,
        game_version: profile.game_version,
        loader: profile.loader || "vanilla",
        loader_version: profile.loader_version || undefined,
        selected_norisk_pack_id:
          profile.selected_norisk_pack_id || null || undefined,
      };

      const profileId = await createProfile(createParams);

      if (profile.description || profile.group || profile.settings) {
        await useProfileStore.getState().updateProfile(profileId, {
          description: profile.description,
          group: profile.group,
          settings: profile.settings,
        });
      }

      const createdProfile = await useProfileStore
        .getState()
        .getProfile(profileId);
      onSave(createdProfile);
    } catch (err) {
      console.error("Failed to create profile:", err);
      setError(
        `Failed to create profile: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      );
    }

    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div ref={contentRef} className="h-full">
        {step === 1 && (
          <GeneralStep
            profile={profile}
            updateProfile={updateProfile}
            systemRamMb={systemRamMb}
          />
        )}
        {step === 2 && (
          <VersionStep
            profile={profile}
            updateProfile={updateProfile}
            minecraftVersions={minecraftVersions?.versions || []}
          />
        )}
        {step === 3 && (
          <ModLoaderStep profile={profile} updateProfile={updateProfile} />
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex justify-between">
      <div>
        {step > 1 && (
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={creating || loading}
            icon={<Icon icon="pixel:arrow-left-solid" className="w-4 h-4" />}
          >
            back
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={creating || loading}
        >
          cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={creating || loading || (step === 1 && !profile.name)}
        >
          {creating ? (
            <>
              <Icon
                icon="pixel:spinner-solid"
                className="w-4 h-4 animate-spin"
              />
              <span>creating...</span>
            </>
          ) : step < totalSteps ? (
            <>
              <span>next</span>
              <Icon icon="pixel:arrow-right-solid" className="w-4 h-4" />
            </>
          ) : (
            <span>create</span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      title={`create new profile: ${stepTitles[step - 1]}`}
      onClose={onClose}
      width="4xl"
      height="650px"
      footer={renderFooter()}
    >
      <div className="flex flex-col border-b border-white/20">
        <div className="px-4 pb-4">
          <StepIndicator currentStep={step} totalSteps={totalSteps} />
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </Modal>
  );
}
