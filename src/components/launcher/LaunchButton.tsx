"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { LaunchStatus } from "./LaunchStatus";
import {
  LaunchState,
  useLaunchStateStore,
} from "../../store/launch-state-store";
import { Button } from "../ui/Button";
import { VersionSelector } from "./VersionSelector";

interface Version {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
  profileId?: string;
}

interface LaunchButtonProps {
  versions?: Version[];
  defaultVersion?: string;
  className?: string;
  onVersionChange?: (version: string) => void;
}

export function LaunchButton({
  defaultVersion,
  className,
  onVersionChange,
  versions,
}: LaunchButtonProps) {
  const [selectedVersion, setSelectedVersion] = useState(defaultVersion || "");
  const [showVersions, setShowVersions] = useState(false);
  const [showLaunchStatus, setShowLaunchStatus] = useState(false);
  const [hideStatusTimeoutId, setHideStatusTimeoutId] = useState<number | null>(
    null,
  );

  const {
    initializeProfile,
    getProfileState,
    launchProfile,
    abortProfileLaunch,
  } = useLaunchStateStore();

  const profileState = getProfileState(selectedVersion);
  const { launchState, launchProgress, currentStep, error, logHistory } =
    profileState;

  useEffect(() => {
    if (selectedVersion) {
      initializeProfile(selectedVersion);
    }
  }, [selectedVersion, initializeProfile]);

  useEffect(() => {
    if (defaultVersion && defaultVersion !== selectedVersion) {
      setSelectedVersion(defaultVersion);
    }
  }, [defaultVersion, selectedVersion]);

  useEffect(() => {
    if (launchState === LaunchState.LAUNCHING) {
      setShowLaunchStatus(true);

      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
        setHideStatusTimeoutId(null);
      }
    } else {
      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        setShowLaunchStatus(false);
        setHideStatusTimeoutId(null);
      }, 5000);

      setHideStatusTimeoutId(timeoutId);
    }
  }, [launchState]);

  useEffect(() => {
    return () => {
      if (hideStatusTimeoutId) {
        clearTimeout(hideStatusTimeoutId);
      }
    };
  }, [hideStatusTimeoutId]);

  const handleLaunch = async () => {
    if (!selectedVersion) return;

    if (launchState === LaunchState.LAUNCHING) {
      await abortProfileLaunch(selectedVersion);
      return;
    }

    await launchProfile(selectedVersion);
  };

  const handleVersionChange = (version: string) => {
    if (launchState === LaunchState.LAUNCHING) return;

    setSelectedVersion(version);
    setShowVersions(false);

    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const toggleVersionSelect = () => {
    if (launchState === LaunchState.LAUNCHING) return;

    setShowVersions(!showVersions);
  };

  const getButtonText = () => {
    switch (launchState) {
      case LaunchState.LAUNCHING:
        return "STARTING";
      case LaunchState.ERROR:
        return "ERROR";
      default:
        return "LAUNCH GAME";
    }
  };

  const getButtonVariant = () => {
    switch (launchState) {
      case LaunchState.LAUNCHING:
        return "danger";
      case LaunchState.ERROR:
        return "danger";
      default:
        return "primary";
    }
  };

  const getButtonIcon = () => {
    if (launchState === LaunchState.LAUNCHING) {
      return (
        <Icon
          icon="pixel:spinner-solid"
          className="w-9 h-9 animate-spin text-red-400"
        />
      );
    } else if (launchState === LaunchState.ERROR) {
      return (
        <Icon
          icon="pixel:exclamation-triangle-solid"
          className="w-9 h-9 text-red-400"
        />
      );
    } else {
      return <Icon icon="pixel:startups" className="w-9 h-9" />;
    }
  };

  return (
    <div
      className={cn("relative flex flex-col justify-center w-full", className)}
    >
      {error && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/80 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 max-w-md w-full">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleLaunch}
            disabled={!selectedVersion}
            variant={getButtonVariant()}
            size="lg"
            className="flex-1 py-4 px-12 text-2xl font-bold whitespace-nowrap"
            icon={getButtonIcon()}
          >
            {getButtonText()}
          </Button>

          <Button
            onClick={toggleVersionSelect}
            disabled={launchState === LaunchState.LAUNCHING}
            variant="secondary"
            size="lg"
            className="h-full py-4 px-5"
            icon={<Icon icon="pixel:chevron-down-solid" className="w-8 h-8" />}
          >{``}</Button>
        </div>

        <div className="h-[60px] relative">
          {showLaunchStatus && selectedVersion && (
            <LaunchStatus
              profileId={selectedVersion}
              isLaunching={launchState === LaunchState.LAUNCHING}
              currentStep={currentStep}
              progress={launchProgress}
              logHistory={logHistory}
              onAbort={() => abortProfileLaunch(selectedVersion)}
              className="absolute top-0 left-0 right-0 w-full"
            />
          )}
        </div>
      </div>

      {showVersions && versions && (
        <VersionSelector
          versions={versions}
          selectedVersion={selectedVersion}
          onVersionChange={handleVersionChange}
        />
      )}
    </div>
  );
}
