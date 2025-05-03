"use client";

import { useEffect, useState } from "react";
import { ProcessService } from "../../services/process-service";
import { Icon } from "@iconify/react";

interface ProcessStatusBadgeProps {
  profileId: string;
  className?: string;
}

export function ProcessStatusBadge({
  profileId,
  className = "",
}: ProcessStatusBadgeProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const running = await ProcessService.isProfileRunning(profileId);
      setIsRunning(running);
    } catch (error) {
      console.error("Error checking process status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileId) return;

    // Check immediately
    checkStatus();

    // Set up interval
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [profileId]);

  if (loading) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${className}`}
      >
        <Icon
          icon="pixel:circle-notch-solid"
          className="animate-spin w-3 h-3 mr-1"
        />
        Checking...
      </span>
    );
  }

  if (isRunning) {
    return (
      <span
        className={`inline-flex items-center bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs ${className}`}
      >
        <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
        Running
      </span>
    );
  }

  return null;
}
