"use client";

import React from "react";
import { Icon } from "@iconify/react";
import type { LogLevel, ParsedLogLine } from "../../services/log-service";

interface LogViewerDisplayProps {
  isLoading: boolean;
  error: string | null;
  displayLines: ParsedLogLine[];
  parsedLogLinesCount: number;
  searchTerm: string;
  levelFilters: Record<LogLevel, boolean>;
  copied: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLevelFilterChange: (level: LogLevel, checked: boolean) => void;
  onCopyLog: () => void;
  logLevelsDefinition: readonly LogLevel[];
  isAutoscrollEnabled: boolean;
  onAutoscrollChange: (enabled: boolean) => void;
  scrollableContainerRef?: React.RefObject<HTMLDivElement>;
  onOpenFolder?: () => void;
  onUploadLog?: () => void;
  isUploading?: boolean;
  uploadUrl?: string | null;
  uploadError?: string | null;
  onOpenUploadUrl?: (url: string) => void;
  logFiles?: string[];
  selectedLogPath?: string | null;
  onLogSelect?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const getLevelColorClass = (level?: LogLevel): string => {
  switch (level) {
    case "ERROR":
      return "text-red-400 font-semibold";
    case "WARN":
      return "text-yellow-400 font-semibold";
    case "INFO":
      return "text-blue-400";
    case "DEBUG":
      return "text-cyan-400";
    case "TRACE":
      return "text-purple-400";
    default:
      return "text-gray-400";
  }
};

function getFilename(path: string | null): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() || path;
}

// Update the LogViewerDisplay component to match the WorldsTab styling
// Replace the FilterButton component with this updated version

const FilterButton = React.memo(
  ({
    level,
    isActive,
    onClick,
    disabled,
  }: {
    level: LogLevel;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
  }) => {
    // Define styles based on level and active state
    const getButtonStyle = () => {
      const baseStyle = "px-4 py-2 font-minecraft text-xl";

      if (!isActive) {
        return `${baseStyle} bg-black/20 text-white/60 hover:text-white border-2 border-white/20`;
      }

      switch (level) {
        case "ERROR":
          return `${baseStyle} bg-red-900/40 text-red-300 border-2 border-red-700/50`;
        case "WARN":
          return `${baseStyle} bg-yellow-900/40 text-yellow-300 border-2 border-yellow-700/50`;
        case "INFO":
          return `${baseStyle} bg-blue-900/40 text-blue-300 border-2 border-blue-700/50`;
        case "DEBUG":
          return `${baseStyle} bg-cyan-900/40 text-cyan-300 border-2 border-cyan-700/50`;
        case "TRACE":
          return `${baseStyle} bg-purple-900/40 text-purple-300 border-2 border-purple-700/50`;
        default:
          return `${baseStyle} bg-white/10 text-white border-2 border-white/20`;
      }
    };

    return (
      <button
        className={getButtonStyle()}
        onClick={onClick}
        disabled={disabled}
        style={{ transition: "none" }}
      >
        {level.toLowerCase()}
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.disabled === nextProps.disabled
    );
  },
);

FilterButton.displayName = "FilterButton";

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
  // Update the LogHeader component
  const LogHeader = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {logLevelsDefinition.map((level) => (
          <FilterButton
            key={level}
            level={level}
            isActive={levelFilters[level]}
            onClick={() => onLevelFilterChange(level, !levelFilters[level])}
            disabled={isLoading}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Filter lines..."
            value={searchTerm}
            onChange={onSearchChange}
            disabled={isLoading}
            className="w-full bg-black/20 backdrop-blur-md border-2 border-white/10 px-3 py-2 text-white font-minecraft text-xl shadow-sm tracking-wide"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
              onClick={() =>
                onSearchChange({
                  target: { value: "" },
                } as React.ChangeEvent<HTMLInputElement>)
              }
            >
              <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onCopyLog}
          disabled={displayLines.length === 0 || isLoading || copied}
          className={`bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 ${
            copied ? "border-green-500/30 text-green-400" : "border-white/30"
          } px-5 py-2 font-minecraft text-xl flex items-center gap-2 transition-colors`}
        >
          <Icon
            icon={copied ? "pixel:check" : "pixel:copy"}
            className="w-5 h-5"
          />
          <span>{copied ? "copied" : "copy"}</span>
        </button>

        {onUploadLog && (
          <button
            onClick={onUploadLog}
            disabled={parsedLogLinesCount === 0 || isLoading || isUploading}
            className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 border-white/30 px-5 py-2 font-minecraft text-xl flex items-center gap-2 transition-colors"
          >
            {isUploading ? (
              <Icon
                icon="pixel:spinner-solid"
                className="w-5 h-5 animate-spin"
              />
            ) : (
              <Icon icon="pixel:upload" className="w-5 h-5" />
            )}
            <span>{isUploading ? "uploading..." : "upload"}</span>
          </button>
        )}
      </div>
    </div>
  );

  // Update the LogFooter component
  const LogFooter = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <div className="text-white/70 font-minecraft text-xl">
          {displayLines.length} of {parsedLogLinesCount} lines
        </div>

        {isAutoscrollEnabled !== undefined && (
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
      </div>

      <div className="flex items-center gap-3">
        {onLogSelect && logFiles && logFiles.length > 0 && (
          <div className="flex items-center gap-2 relative">
            <select
              value={selectedLogPath ?? ""}
              onChange={onLogSelect}
              disabled={isLoading}
              className="bg-black/20 backdrop-blur-md border-2 border-white/10 px-4 py-2 text-white font-minecraft text-xl shadow-sm appearance-none pr-12 tracking-wide"
            >
              <option value="" disabled={!!selectedLogPath}>
                -- Select Log --
              </option>
              {logFiles.map((path) => (
                <option key={path} value={path} className="text-xl">
                  {getFilename(path)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white">
              <Icon icon="pixel:chevron-down" className="w-6 h-6" />
            </div>
          </div>
        )}

        {onOpenFolder && (
          <button
            onClick={onOpenFolder}
            disabled={isLoading}
            className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 border-white/30 px-5 py-2 font-minecraft text-xl flex items-center gap-2 transition-colors"
          >
            <Icon icon="pixel:folder-open-solid" className="w-5 h-5" />
            <span>logs folder</span>
          </button>
        )}
      </div>
    </div>
  );

  // Update the main return statement for the component
  // Replace the entire return statement with this updated version

  if (isLoading) {
    return (
      <div className="h-full flex justify-center items-center bg-black/20 backdrop-blur-md border-2 border-white/30">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white/80 rounded-full animate-spin"></div>
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
      <div className="h-full flex justify-center items-center bg-black/20 backdrop-blur-md border-2 border-white/30 p-4">
        <div className="p-6 bg-red-900/30 border-2 border-red-700/50 text-red-300 text-2xl max-w-2xl">
          Error loading content: {error}
        </div>
      </div>
    );
  }

  if (parsedLogLinesCount === 0) {
    return (
      <div className="h-full bg-black/20 backdrop-blur-md border-2 border-white/30 flex justify-center items-center">
        <div className="text-center">
          <Icon
            icon="pixel:file-text"
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

  if (displayLines.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-black/20 backdrop-blur-md border-2 border-white/10 w-full p-3">
          <LogHeader />
        </div>
        <div className="flex-grow bg-black/20 backdrop-blur-md border-2 border-white/30 flex justify-center items-center">
          <div className="text-center">
            <Icon
              icon="pixel:filter"
              className="w-16 h-16 text-white/30 mx-auto mb-4"
            />
            <p className="text-white/60 font-minecraft text-2xl tracking-wide lowercase select-none">
              No log lines match the current filters
            </p>
          </div>
        </div>
        <div className="bg-black/30 border-t-2 border-white/30 py-3 px-4 mt-2">
          <LogFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-black/20 backdrop-blur-md border-2 border-white/10 w-full p-3">
        <LogHeader />
      </div>

      <div className="flex-grow border-2 border-white/30 flex flex-col overflow-hidden">
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          ref={scrollableContainerRef}
        >
          <div className="p-4 font-mono text-lg whitespace-pre-wrap">
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
        </div>

        <div className="bg-black/30 border-t-2 border-white/30 py-3 px-4">
          <LogFooter />
        </div>
      </div>

      {uploadUrl && onOpenUploadUrl && (
        <div className="mt-4 flex items-center gap-2 bg-black/20 backdrop-blur-md border-2 border-white/10 p-3">
          <span className="text-white/70 font-minecraft text-xl">
            Log uploaded:
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onOpenUploadUrl(uploadUrl);
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
        <div className="mt-4 flex items-center gap-2 bg-red-900/30 border-2 border-red-700/50 p-3">
          <Icon
            icon="pixel:exclamation-triangle-solid"
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
