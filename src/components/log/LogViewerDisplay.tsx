"use client";

import React from "react";
import { Icon } from "@iconify/react";
import type { LogLevel, ParsedLogLine } from "../../services/log-service";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { SearchInput } from "../ui/SearchInput";
import { Select } from "../ui/Select";
import { useThemeStore } from "../../store/useThemeStore";

interface LogViewerDisplayProps {
  // Required props
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
  
  // Optional props
  isAutoscrollEnabled?: boolean;
  onAutoscrollChange?: (enabled: boolean) => void;
  onOpenFolder?: () => void;
  onUploadLog?: () => void;
  isUploading?: boolean;
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
  isAutoscrollEnabled,
  onAutoscrollChange,
  scrollableContainerRef,
  onOpenFolder,
  onUploadLog,
  isUploading,
  uploadUrl,
  uploadError,
  onOpenUploadUrl,
  logFiles = [],
  selectedLogPath = null,
  onLogSelect,
}: LogViewerDisplayProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

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
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div
              className="absolute inset-0 border-4 border-t-white/80 rounded-full animate-spin"
              style={{ borderTopColor: accentColor.value }}
            ></div>
          </div>
          <div className="font-minecraft text-2xl text-white/80 tracking-wide lowercase">
            Loading logs...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="p-6 bg-red-900/30 border-2 border-red-700/50 text-red-300 text-2xl max-w-2xl rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (parsedLogLinesCount === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="solar:file-text-bold"
            className="w-16 h-16 text-white/30 mx-auto mb-4"
          />
          <p className="text-white/60 font-minecraft text-2xl tracking-wide lowercase select-none">
            No log content available
          </p>
          <p className="text-white/40 font-minecraft text-lg mt-2 tracking-wide lowercase select-none">
            Select a log file to view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="border-b-2 py-6 px-4 flex items-center justify-between"
        style={{
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}40`,
        }}
      >
        <div className="flex items-center py-1 gap-2 overflow-x-auto scrollbar-hide">
          {logLevelsDefinition.map((level) => (
            <Button
              key={level}
              onClick={() => onLevelFilterChange(level, !levelFilters[level])}
              disabled={isLoading}
              variant={getLevelButtonStyle(level) as any}
              size="sm"
            >
              {level.toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Filter lines..."
            className="w-44"
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
                onClick={onUploadLog}
                disabled={isLoading || isUploading || parsedLogLinesCount === 0}
                variant="secondary"
                size="sm"
                icon={
                  <Icon
                    icon={
                      isUploading
                        ? "solar:refresh-circle-bold"
                        : "solar:upload-bold"
                    }
                    className={isUploading ? "animate-spin" : ""}
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

      <div
        className="flex-1 h-full overflow-y-auto custom-scrollbar"
        ref={scrollableContainerRef}
        style={{
          backgroundColor: `${accentColor.value}10`,
        }}
      >
        {displayLines.length === 0 ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <Icon
                icon="solar:filter-bold"
                className="w-16 h-16 text-white/30 mx-auto mb-4"
              />
              <p className="text-white/60 font-minecraft text-2xl tracking-wide lowercase select-none">
                No log lines match the current filters
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-black/60 font-mono text-sm whitespace-pre-wrap">
            {displayLines.map((line) => (
              <div key={line.id} className="flex flex-nowrap items-start mb-1">
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

      <div
        className="border-t-2 py-3 px-4 flex justify-between items-center"
        style={{
          backgroundColor: `${accentColor.value}20`,
          borderColor: `${accentColor.value}40`,
        }}
      >
        <div className="text-white/70 font-minecraft text-xl">
          {searchTerm || Object.values(levelFilters).some(v => !v)
            ? `${displayLines.length} of ${parsedLogLinesCount} lines matching filters`
            : `${parsedLogLinesCount} lines`}
        </div>

        <div className="flex items-center gap-3">
          {isAutoscrollEnabled !== undefined && onAutoscrollChange && (
            <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white font-minecraft text-xl">
              <input
                type="checkbox"
                checked={isAutoscrollEnabled}
                onChange={(e) => onAutoscrollChange(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              autoscroll
            </label>
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

      {uploadUrl && onOpenUploadUrl && (
        <div
          className="mt-4 flex items-center gap-2 p-3 rounded-lg"
          style={{
            backgroundColor: `${accentColor.value}20`,
            borderColor: `${accentColor.value}40`,
          }}
        >
          <span className="text-white/70 font-minecraft text-xl">
            Log uploaded:
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenUploadUrl) onOpenUploadUrl(uploadUrl);
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 underline text-xl font-minecraft"
            title={`Open ${uploadUrl}`}
          >
            {uploadUrl}
          </a>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 flex items-center gap-2 bg-red-900/30 border-2 border-red-700/50 p-3 rounded-lg">
          <Icon
            icon="solar:danger-triangle-bold"
            className="w-5 h-5 text-red-400"
          />
          <span
            className="text-red-400 text-xl font-minecraft"
            title={uploadError}
          >
            Upload Failed: {uploadError}
          </span>
        </div>
      )}
    </div>
  );
}
