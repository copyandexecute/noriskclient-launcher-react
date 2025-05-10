"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import * as ProcessService from "../../services/process-service";
import type { ProcessMetadata } from "../../types/processState";
import { timeAgo } from "../../utils/time-utils";
import { Button } from "../ui/./buttons/Button";
import { IconButton } from "../ui/./buttons/IconButton";
import { Label } from "../ui/./Label";
import { Dropdown } from "../ui/./dropdown/Dropdown";
import { DropdownHeader } from "../ui/./dropdown/DropdownHeader";
import { DropdownDivider } from "../ui/./dropdown/DropdownDivider";
import { DropdownFooter } from "../ui/./dropdown/DropdownFooter";
import { useThemeStore } from "../../store/useThemeStore";
import { gsap } from "gsap";

interface RunningInstancesIndicatorProps {
  className?: string;
}

export function RunningInstancesIndicator({
  className,
}: RunningInstancesIndicatorProps) {
  const [processes, setProcesses] = useState<ProcessMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const notificationRef = useRef<HTMLDivElement>(null);
  const prevInstanceCount = useRef<number>(0);

  const fetchProcesses = useCallback(async () => {
    setError(null);
    try {
      const fetchedProcesses = await ProcessService.getRunningProcesses();

      if (
        fetchedProcesses.length > prevInstanceCount.current &&
        prevInstanceCount.current > 0
      ) {
        if (notificationRef.current) {
          gsap.fromTo(
            notificationRef.current,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.3,
              ease: "back.out(1.7)",
            },
          );

          setTimeout(() => {
            if (notificationRef.current) {
              gsap.to(notificationRef.current, {
                scale: 0,
                opacity: 0,
                duration: 0.2,
                ease: "power2.in",
              });
            }
          }, 3000);
        }
      }

      prevInstanceCount.current = fetchedProcesses.length;
      setProcesses(fetchedProcesses);
    } catch (err) {
      setError("Failed to fetch processes");
      console.error(err);
      setProcesses([]);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchProcesses();

    const intervalId = setInterval(fetchProcesses, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchProcesses]);

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleStopProcess = async (processId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStoppingId(processId);
    try {
      await ProcessService.stopProcess(processId);
      console.log("Process stopped successfully.");
      await fetchProcesses();
    } catch (err) {
      console.error(`Failed to stop process: ${err}`);
    } finally {
      setStoppingId(null);
    }
  };

  const handleViewLogs = async (processId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingLogsId(processId);
    try {
      await ProcessService.openLogWindow(processId);
    } catch (err) {
      console.error(
        `Failed to open log window for process ID ${processId}:`,
        err,
      );
    } finally {
      setTimeout(() => setViewingLogsId(null), 1000);
    }
  };

  const handleStopAll = async () => {
    try {
      for (const process of processes) {
        await ProcessService.stopProcess(process.id);
      }
      await fetchProcesses();
      handleCloseDropdown();
    } catch (err) {
      console.error(`Failed to stop all processes: ${err}`);
    }
  };

  const instanceCount = processes.length;
  const hasInstances = instanceCount > 0;

  return (
    <div className={cn("relative", className)}>
      <div ref={buttonRef} className="relative">
        <Button
          variant={hasInstances ? "success" : "default"}
          size="sm"
          onClick={handleToggleDropdown}
          icon={<Icon icon="solar:monitor-bold" className="w-4 h-4" />}
          className="h-10"
        >
          {isLoading && instanceCount === 0
            ? "Loading..."
            : instanceCount === 0
              ? "No instances"
              : `${instanceCount} Instance${instanceCount !== 1 ? "s" : ""}`}
        </Button>

        <div
          ref={notificationRef}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded-md shadow-lg opacity-0 scale-0 pointer-events-none"
          style={{
            boxShadow:
              "0 4px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
            zIndex: 100,
          }}
        >
          <div className="flex items-center gap-2">
            <Icon icon="solar:bell-bold" className="w-4 h-4" />
            <span className="text-sm font-minecraft">
              New instance started!
            </span>
          </div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-green-500"></div>
        </div>
      </div>

      <Dropdown
        isOpen={isDropdownOpen}
        onClose={handleCloseDropdown}
        triggerRef={buttonRef}
        width={350}
      >
        <DropdownHeader title="Running Instances">
          <button
            onClick={handleCloseDropdown}
            className="text-white/70 hover:text-white transition-colors"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        </DropdownHeader>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading && processes.length === 0 ? (
            <div className="p-6 text-center">
              <Icon
                icon="solar:spinner-bold"
                className="w-6 h-6 animate-spin mx-auto text-white/70 mb-2"
              />
              <p className="text-white/70 font-minecraft text-xl">
                Loading instances...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <Icon
                icon="solar:danger-triangle-bold"
                className="w-6 h-6 mx-auto text-red-400 mb-2"
              />
              <p className="text-red-400 font-minecraft text-xl">
                Error: {error}
              </p>
            </div>
          ) : processes.length === 0 ? (
            <div className="p-6 text-center">
              <Icon
                icon="solar:monitor-slash-bold"
                className="w-8 h-8 mx-auto text-white/50 mb-3"
              />
              <p className="text-white/60 font-minecraft text-xl">
                No instances running
              </p>
              <p className="text-white/40 font-minecraft text-lg mt-2">
                Launch a profile to start playing
              </p>
            </div>
          ) : (
            <div className="py-2">
              {processes.map((process) => (
                <div
                  key={process.id}
                  className="px-4 py-3 hover:bg-white/10 transition-colors duration-200"
                  style={{
                    borderLeft:
                      typeof process.state === "object" &&
                      "Crashed" in process.state
                        ? "4px solid #ef4444"
                        : typeof process.state === "string" &&
                            process.state !== "Running"
                          ? "4px solid #f59e0b"
                          : "4px solid #10b981",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${accentColor.value}30`,
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderColor: `${accentColor.value}60`,
                          }}
                        >
                          <Icon
                            icon="solar:widget-bold"
                            className="w-4 h-4 text-white"
                          />
                        </div>
                        <div>
                          <p
                            className="text-xl font-minecraft text-white truncate"
                            title={process.profile_name || process.profile_id}
                          >
                            {process.profile_name ||
                              `Profile ${process.profile_id.substring(0, 6)}...`}
                          </p>
                          <div className="flex items-center text-lg text-white/60 mt-0.5 font-minecraft">
                            <Icon
                              icon="solar:clock-circle-bold"
                              className="w-3.5 h-3.5 mr-1.5"
                            />
                            {timeAgo(new Date(process.start_time).getTime())}
                            {typeof process.state === "object" &&
                              "Crashed" in process.state && (
                                <Label
                                  variant="destructive"
                                  size="xs"
                                  className="ml-2"
                                >
                                  Crashed
                                </Label>
                              )}
                            {typeof process.state === "string" &&
                              process.state !== "Running" && (
                                <Label
                                  variant="warning"
                                  size="xs"
                                  className="ml-2"
                                >
                                  {process.state}
                                </Label>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {process.id && (
                        <IconButton
                          onClick={(e) => handleViewLogs(process.id, e)}
                          variant="info"
                          size="sm"
                          icon={
                            viewingLogsId === process.id ? (
                              <Icon
                                icon="solar:spinner-bold"
                                className="w-4 h-4 animate-spin"
                              />
                            ) : (
                              <Icon
                                icon="solar:document-bold"
                                className="w-4 h-4"
                              />
                            )
                          }
                          aria-label="View Logs"
                        />
                      )}
                      <IconButton
                        onClick={(e) => handleStopProcess(process.id, e)}
                        disabled={stoppingId === process.id}
                        variant="destructive"
                        size="sm"
                        icon={
                          stoppingId === process.id ? (
                            <Icon
                              icon="solar:spinner-bold"
                              className="w-4 h-4 animate-spin"
                            />
                          ) : (
                            <Icon icon="solar:stop-bold" className="w-4 h-4" />
                          )
                        }
                        aria-label="Stop Process"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {processes.length > 0 && (
          <>
            <DropdownDivider />
            <DropdownFooter>
              <div className="flex items-center justify-between w-full">
                <Label
                  variant="success"
                  size="sm"
                  icon={
                    <Icon icon="solar:play-circle-bold" className="w-4 h-4" />
                  }
                >
                  {processes.length} instance{processes.length !== 1 ? "s" : ""}{" "}
                  running
                </Label>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={handleStopAll}
                  icon={
                    <Icon icon="solar:stop-circle-bold" className="w-4 h-4" />
                  }
                >
                  Stop All
                </Button>
              </div>
            </DropdownFooter>
          </>
        )}
      </Dropdown>
    </div>
  );
}
