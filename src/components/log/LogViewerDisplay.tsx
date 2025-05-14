"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { LogLevel, ParsedLogLine } from "../../services/log-service";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { SearchInput } from "../ui/SearchInput";
import { Select } from "../ui/Select";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Checkbox } from "../ui/Checkbox";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { Card } from "../ui/Card";

interface LogViewerDisplayProps {
  isLoading: boolean;
  error: string | null;
  displayLines: ParsedLogLine[];
  parsedLogLinesCount: number;
  searchTerm: string;
  levelFilters: Record<LogLevel, boolean>;
  copied: boolean;
  onSearchChange: (value: string) => void;
  onLevelFilterChange: (level: LogLevel, checked: boolean) => void;
  onCopyLog: () => void;
  logLevelsDefinition: readonly LogLevel[];
  scrollableContainerRef?: React.RefObject<HTMLDivElement>;
  isLiveLogs?: boolean;

  isAutoscrollEnabled?: boolean;
  onAutoscrollChange?: (enabled: boolean) => void;
  onOpenFolder?: () => void;
  onUploadLog?: () => Promise<string>;
  uploadUrl?: string | null;
  uploadError?: string | null;
  onOpenUploadUrl?: (url: string) => void;
  logFiles?: string[];
  selectedLogPath?: string | null;
  onLogSelect?: (value: string) => void;
}

function getFilename(path: string | null): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() || path;
}

function getLevelColorClass(level: LogLevel | undefined): string {
  switch (level) {
    case "ERROR":
      return "text-red-400";
    case "WARN":
      return "text-yellow-400";
    case "INFO":
      return "text-blue-400";
    case "DEBUG":
      return "text-cyan-400";
    case "TRACE":
      return "text-purple-400";
    default:
      return "text-white/70";
  }
}

export function LogViewerDisplay({
  isLoading,
  error,
  displayLines,
  parsedLogLinesCount,
  searchTerm,
  levelFilters,
  copied,
  onSearchChange,
  onLevelFilterChange,
  onCopyLog,
  logLevelsDefinition,
  isLiveLogs,
  isAutoscrollEnabled,
  onAutoscrollChange,
  scrollableContainerRef,
  onOpenFolder,
  onUploadLog,
  onOpenUploadUrl,
  logFiles = [],
  selectedLogPath = null,
  onLogSelect,
}: LogViewerDisplayProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const controlsRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlsRef.current) {
      gsap.fromTo(
        controlsRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      );
    }

    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.2 },
      );
    }
  }, []);

  const getLevelButtonStyle = (level: LogLevel) => {
    if (!levelFilters[level]) {
      return "secondary";
    }

    switch (level) {
      case "ERROR":
        return "destructive";
      case "WARN":
        return "warning";
      case "INFO":
        return "info";
      case "DEBUG":
        return "success";
      case "TRACE":
        return "purple";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black/30 backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <div className="relative w-12 h-12 mb-3">
            <div className="absolute inset-0 border-3 border-white/10 rounded-full"></div>
            <div
              className="absolute inset-0 border-3 border-t-white/80 rounded-full animate-spin"
              style={{ borderTopColor: accentColor.value }}
            ></div>
          </div>
          <div className="font-minecraft text-xl text-white/80 tracking-wide lowercase">
            Loading logs...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 bg-red-900/30 border-2 border-red-700/50 text-red-300 text-xl max-w-2xl rounded-lg">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:danger-triangle-bold"
              className="w-6 h-6 text-red-400 flex-shrink-0"
            />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!(isLiveLogs && parsedLogLinesCount === 0) && parsedLogLinesCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon
            icon="solar:file-text-bold"
            className="w-12 h-12 text-white/30 mx-auto mb-3"
          />
          <p className="text-white/60 font-minecraft text-xl tracking-wide lowercase select-none">
            No log content available
          </p>
          <p className="text-white/40 font-minecraft text-sm mt-2 tracking-wide lowercase select-none">
            Select a log file to view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="border-b-0 rounded-b-none" ref={controlsRef}>
        <div className="py-4 px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center py-1 gap-1 overflow-x-auto scrollbar-hide">
            {logLevelsDefinition.map((level) => (
              <Button
                key={level}
                onClick={() => onLevelFilterChange(level, !levelFilters[level])}
                disabled={isLoading}
                variant={getLevelButtonStyle(level) as any}
                size="xs"
              >
                {level.toLowerCase()}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Filter lines..."
              className="w-full md:w-44"
            />

            <div className="flex items-center gap-2">
              <IconButton
                onClick={onCopyLog}
                disabled={displayLines.length === 0 || isLoading || copied}
                variant={copied ? "success" : "secondary"}
                size="sm"
                icon={
                  <Icon
                    icon={
                      copied ? "solar:check-circle-bold" : "solar:copy-bold"
                    }
                  />
                }
              />

              {onUploadLog && (
                <IconButton
                  onClick={async () => {
                    if (isSubmittingUpload) return;
                    if (onUploadLog) {
                      setIsSubmittingUpload(true);
                      try {
                        const url = await onUploadLog();
                        let clipboardSuccess = false;
                        try {
                          await writeText(url);
                          clipboardSuccess = true;
                        } catch (copyError) {
                          console.error(
                            "Failed to copy URL to clipboard:",
                            copyError,
                          );
                        }

                        const successMessage = clipboardSuccess
                          ? "Link copied! Click to open."
                          : "Log uploaded (copy failed)! Click to open.";

                        toast.success(
                          (t) => (
                            <span
                              onClick={() => {
                                if (url && onOpenUploadUrl)
                                  onOpenUploadUrl(url);
                                toast.dismiss(t.id);
                              }}
                              className="cursor-pointer hover:underline"
                            >
                              {successMessage}
                            </span>
                          ),
                          { duration: 5000 },
                        );
                      } catch (err: any) {
                        toast.error(`Upload failed: ${err.toString()}`);
                      } finally {
                        setIsSubmittingUpload(false);
                      }
                    }
                  }}
                  disabled={
                    isLoading || parsedLogLinesCount === 0 || isSubmittingUpload
                  }
                  variant="secondary"
                  size="sm"
                  icon={
                    <Icon
                      icon={
                        isSubmittingUpload
                          ? "solar:refresh-circle-bold"
                          : "solar:upload-bold"
                      }
                      className={isSubmittingUpload ? "animate-spin" : ""}
                    />
                  }
                />
              )}

              {onOpenFolder && (
                <IconButton
                  onClick={onOpenFolder}
                  disabled={isLoading}
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon="solar:folder-bold" />}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      <div
        className={cn(
          "flex-1 h-full overflow-y-auto custom-scrollbar",
          "border-2 border-t-0 border-b-0",
          "transition-colors duration-300",
        )}
        ref={scrollableContainerRef}
        style={{
          backgroundColor: `${accentColor.value}10`,
          borderColor: `${accentColor.value}40`,
        }}
      >
        <div ref={contentRef} className="h-full">
          {displayLines.length === 0 ? (
            <div className="p-4 h-full flex items-center justify-center">
              <div className="text-center">
                <Icon
                  icon="solar:filter-bold"
                  className="w-12 h-12 text-white/30 mx-auto mb-3"
                />
                <p className="text-white/60 font-minecraft text-xl tracking-wide lowercase select-none">
                  No log lines match the current filters
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-full p-3 bg-black/60 font-mono text-sm whitespace-pre-wrap">
              {displayLines.map((line, index) => (
                <div
                  key={`${line.id}-${index}`}
                  className="flex flex-nowrap items-start mb-1"
                >
                  {line.timestamp ? (
                    <>
                      <span
                        className={`pr-2 select-none ${getLevelColorClass(line.level)}`}
                      >
                        <span className="opacity-80">[{line.timestamp}]</span>
                        <span className="opacity-80 ml-1">
                          [{line.thread}/{line.level ?? "-"}]
                        </span>
                      </span>
                      <span
                        className={`flex-1 ${
                          line.level === "ERROR" || line.level === "WARN"
                            ? getLevelColorClass(line.level)
                            : "text-white/90"
                        }`}
                      >
                        {line.text}
                      </span>
                    </>
                  ) : (
                    <span
                      className={`flex-1 pl-1 ${
                        line.level === "ERROR" || line.level === "WARN"
                          ? getLevelColorClass(line.level)
                          : "text-white/90"
                      }`}
                    >
                      {line.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Card className="border-t-0 rounded-t-none">
        <div className="py-3 px-6 flex justify-between items-center">
          <div className="text-white/70 font-minecraft text-xl">
            {searchTerm || Object.values(levelFilters).some((v) => !v)
              ? `${displayLines.length} of ${parsedLogLinesCount} lines matching filters`
              : `${parsedLogLinesCount} lines`}
          </div>

          <div className="flex items-center gap-3">
            {isAutoscrollEnabled !== undefined && onAutoscrollChange && (
              <Checkbox
                id="autoscroll-checkbox"
                checked={isAutoscrollEnabled}
                onChange={(e) => onAutoscrollChange(e.target.checked)}
                label="Autoscroll"
                customSize="sm"
              />
            )}

            {logFiles.length > 0 && onLogSelect && (
              <div className="flex items-center gap-2 relative">
                <Select
                  value={selectedLogPath || ""}
                  onChange={onLogSelect}
                  options={[
                    {
                      value: "",
                      label: "-- Select Log --",
                      // @ts-ignore
                      disabled: !!selectedLogPath,
                    },
                    ...logFiles.map((path) => ({
                      value: path,
                      label: getFilename(path),
                    })),
                  ]}
                  className="w-64"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
