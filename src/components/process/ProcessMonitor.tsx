"use client";

import { useEffect, useState } from "react";
import { ProcessService } from "../../services/process-service";
import type { ProcessMetadata } from "../../types/processState";
import { Icon } from "@iconify/react";

interface ProcessMonitorProps {
  profileId?: string;
  onProcessStateChange?: (isRunning: boolean) => void;
}

export function ProcessMonitor({
  profileId,
  onProcessStateChange,
}: ProcessMonitorProps) {
  const [processes, setProcesses] = useState<ProcessMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkProcesses = async () => {
    if (!profileId) return;

    setLoading(true);
    setError(null);

    try {
      // Make sure to pass the profileId as an object with the correct key
      const profileProcesses =
        await ProcessService.getProcessesByProfile(profileId);
      setProcesses(profileProcesses);

      // Notify parent component if process state changed
      const isRunning = profileProcesses.some(
        (process) =>
          process.state === "Running" || process.state === "Starting",
      );

      if (onProcessStateChange) {
        onProcessStateChange(isRunning);
      }
    } catch (err) {
      console.error("Error checking processes:", err);
      setError(
        `Error checking processes: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileId) return;

    // Check processes immediately
    checkProcesses();

    // Set up interval to check processes
    const interval = setInterval(checkProcesses, 5000);

    return () => clearInterval(interval);
  }, [profileId]);

  const handleStopProcess = async (processId: string) => {
    try {
      await ProcessService.stopProcess(processId);
      // Refresh the process list
      checkProcesses();
    } catch (err) {
      console.error("Error stopping process:", err);
      setError(
        `Error stopping process: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleViewLog = async (processId: string) => {
    try {
      await ProcessService.openLogWindow();
    } catch (err) {
      console.error("Error opening log window:", err);
      setError(
        `Error opening log window: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  if (loading && processes.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-white/70">
        <Icon
          icon="pixel:circle-notch-solid"
          className="animate-spin w-5 h-5 mr-2"
        />
        <span>Checking processes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700/50 text-white p-3 rounded">
        <div className="flex items-center gap-2">
          <Icon
            icon="pixel:exclamation-triangle-solid"
            className="w-5 h-5 text-red-400"
          />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (processes.length === 0) {
    return null; // No processes to show
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded p-4 mb-4">
      <h3 className="text-white font-minecraft text-2xl mb-3 tracking-wide lowercase select-none">
        Running Processes
      </h3>

      <div className="space-y-3">
        {processes.map((process) => (
          <div
            key={process.id}
            className="bg-black/20 border border-white/10 p-3 rounded"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white font-minecraft text-xl tracking-wide lowercase select-none">
                  {process.profile_name || "Minecraft"}
                </div>
                <div className="text-white/70 text-sm">
                  {process.minecraft_version && process.modloader && (
                    <span>
                      MC {process.minecraft_version} • {process.modloader}
                      {process.modloader_version &&
                        ` ${process.modloader_version}`}
                    </span>
                  )}
                  {process.account_name && (
                    <span className="ml-2">• {process.account_name}</span>
                  )}
                </div>
                <div className="flex items-center mt-1">
                  <StatusIndicator state={process.state} />
                  <span className="text-white/60 text-xs ml-2">
                    PID: {process.pid} • Started:{" "}
                    {new Date(process.start_time).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewLog(process.id)}
                  className="bg-black/30 hover:bg-black/50 text-white/80 hover:text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                >
                  <Icon icon="pixel:file-text-solid" className="w-4 h-4" />
                  <span>View Log</span>
                </button>

                <button
                  onClick={() => handleStopProcess(process.id)}
                  className="bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                  disabled={
                    process.state === "Stopping" || process.state === "Stopped"
                  }
                >
                  <Icon icon="pixel:stop-circle-solid" className="w-4 h-4" />
                  <span>
                    {process.state === "Stopping" ? "Stopping..." : "Stop"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIndicator({ state }: { state: ProcessMetadata["state"] }) {
  if (state === "Running") {
    return (
      <span className="flex items-center text-green-400">
        <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
        Running
      </span>
    );
  }

  if (state === "Starting") {
    return (
      <span className="flex items-center text-blue-400">
        <Icon
          icon="pixel:circle-notch-solid"
          className="animate-spin w-3 h-3 mr-1"
        />
        Starting
      </span>
    );
  }

  if (state === "Stopping") {
    return (
      <span className="flex items-center text-yellow-400">
        <Icon
          icon="pixel:circle-notch-solid"
          className="animate-spin w-3 h-3 mr-1"
        />
        Stopping
      </span>
    );
  }

  if (state === "Stopped") {
    return (
      <span className="flex items-center text-gray-400">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
        Stopped
      </span>
    );
  }

  // Handle crashed state
  if (typeof state === "object" && "Crashed" in state) {
    return (
      <span className="flex items-center text-red-400">
        <Icon
          icon="pixel:exclamation-triangle-solid"
          className="w-3 h-3 mr-1"
        />
        Crashed: {state.Crashed}
      </span>
    );
  }

  return null;
}
