"use client";

import { Icon } from "@iconify/react";
import type { LogLevel, ParsedLogLine } from "../../services/log-service"; // Assuming types are moved/accessible
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { EmptyState } from "../profiles/detail/common/EmptyState";

// Define props for the reusable component
interface LogViewerDisplayProps {
  isLoading: boolean;
  error: string | null;
  displayLines: ParsedLogLine[]; // Filtered lines to display
  parsedLogLinesCount: number; // Total parsed lines before filtering
  searchTerm: string;
  levelFilters: Record<LogLevel, boolean>;
  copied: boolean; // State for copy button feedback
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLevelFilterChange: (level: LogLevel, checked: boolean) => void;
  onCopyLog: () => void;
  // Pass LOG_LEVELS from service or define locally if preferred
  logLevelsDefinition: readonly LogLevel[];
  isAutoscrollEnabled: boolean;
  onAutoscrollChange: (enabled: boolean) => void;
  // Ref for the scrollable element, forwarded from parent
  scrollableContainerRef?: React.RefObject<HTMLDivElement>;
  // Optional props for folder/upload actions
  onOpenFolder?: () => void;
  onUploadLog?: () => void;
  isUploading?: boolean;
  uploadUrl?: string | null;
  uploadError?: string | null;
  onOpenUploadUrl?: (url: string) => void;
}

// Helper functions moved or redefined here (could also be in a util file)
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

const getLevelBgClass = (level: LogLevel): string => {
  switch (level) {
    case "ERROR":
      return "bg-red-900/50 border-red-700";
    case "WARN":
      return "bg-yellow-900/50 border-yellow-700";
    case "INFO":
      return "bg-blue-900/50 border-blue-700";
    case "DEBUG":
      return "bg-cyan-900/50 border-cyan-700";
    case "TRACE":
      return "bg-purple-900/50 border-purple-700";
    default:
      return "bg-gray-800/50 border-gray-700";
  }
};

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
  // Receive optional props
  onOpenFolder,
  onUploadLog,
  isUploading,
  uploadUrl,
  uploadError,
  onOpenUploadUrl,
}: LogViewerDisplayProps) {
  return (
    <div className="flex flex-col flex-grow min-h-0">
      {" "}
      {/* Container for controls + log area */}
      {/* Controls Area - Conditionally render if needed */}
      {(parsedLogLinesCount > 0 || isLoading) && (
        <div className="flex items-center justify-between gap-4 mb-3 px-1 flex-shrink-0">
          {/* Group Search and Filters */}
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-grow max-w-xs">
              <Icon
                icon="pixelarticons:search"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
              />
              <input
                type="text"
                placeholder="Filter lines..."
                value={searchTerm}
                onChange={onSearchChange}
                disabled={isLoading}
                className="w-full bg-black/30 border border-white/20 rounded pl-8 pr-2 py-1 text-white placeholder:text-white/40 text-2xl font-minecraft focus:outline-none focus:border-white/40"
              />
            </div>

            {/* Level Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/60 font-minecraft text-xs mr-1">
                Levels:
              </span>
              {logLevelsDefinition.map((level) => (
                <label
                  key={level}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border cursor-pointer transition-colors text-xl font-minecraft lowercase ${
                    levelFilters[level]
                      ? `${getLevelBgClass(level)} text-white/90`
                      : "bg-black/20 border-white/20 text-white/50 hover:bg-white/10 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={levelFilters[level]}
                    onChange={(e) =>
                      onLevelFilterChange(level, e.target.checked)
                    }
                    className="hidden"
                  />
                  {level}
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2">
            {/* Open Folder Button (Conditional) */}
            {onOpenFolder && (
              <button
                onClick={onOpenFolder}
                title="Open Logs Folder"
                disabled={isLoading} // Disable while loading initial content?
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="pixelarticons:folder" className="w-5 h-5" />
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={onCopyLog}
              disabled={displayLines.length === 0 || isLoading || copied}
              title="Copy filtered log lines to clipboard"
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-2xl font-minecraft transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                copied
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white/90 hover:text-white"
              }`}
            >
              <Icon
                icon={copied ? "pixelarticons:check" : "pixelarticons:copy"}
                className="w-4 h-4"
              />
              {copied ? "copied!" : "copy log"}
            </button>

            {/* Upload Button & Status (Conditional) */}
            {onUploadLog && onOpenUploadUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onUploadLog}
                  disabled={
                    parsedLogLinesCount === 0 || isLoading || isUploading
                  }
                  title="Upload log to mclo.gs"
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-2xl font-minecraft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon icon="pixelarticons:upload" className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "upload log"}
                </button>
                {uploadUrl && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenUploadUrl(uploadUrl);
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline text-xs font-minecraft"
                    title={`Open ${uploadUrl}`}
                  >
                    mclo.gs link
                  </a>
                )}
                {uploadError && (
                  <span
                    className="text-red-400 text-xs font-minecraft"
                    title={uploadError}
                  >
                    Upload Failed!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Log Content Area */}
      <div className="flex-grow bg-black/50 rounded overflow-hidden relative border border-white/10">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-black/60 z-10">
            <LoadingSpinner />
          </div>
        )}
        {!isLoading && error && (
          <div className="flex justify-center items-center h-full p-4">
            <div className="p-4 text-red-400 font-minecraft text-base bg-red-900/30 rounded">
              Error loading content: {error}
            </div>
          </div>
        )}
        {!isLoading && !error && parsedLogLinesCount === 0 && (
          <EmptyState
            icon="pixelarticons:file"
            message="Log file appears to be empty or no log source provided."
          />
        )}
        {!isLoading &&
          !error &&
          parsedLogLinesCount > 0 &&
          displayLines.length === 0 && (
            <EmptyState
              icon="pixelarticons:filter"
              message="No log lines match the current filters."
            />
          )}
        {!isLoading && !error && displayLines.length > 0 && (
          <div
            ref={scrollableContainerRef}
            className="p-3 font-mono text-xs h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent whitespace-pre-wrap"
          >
            {displayLines.map((line) => (
              <div key={line.id} className="flex flex-nowrap items-start">
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
                      className={`flex-1 ${line.level === "ERROR" || line.level === "WARN" ? getLevelColorClass(line.level) : "text-white/90"}`}
                    >
                      {line.text}
                    </span>
                  </>
                ) : (
                  <span
                    className={`flex-1 pl-1 ${line.level === "ERROR" || line.level === "WARN" ? getLevelColorClass(line.level) : "text-white/90"}`}
                  >
                    {line.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Footer for additional controls like autoscroll */}
      {parsedLogLinesCount > 0 && !isLoading && !error && (
        <div className="flex-shrink-0 pt-2 px-1 flex justify-end items-center">
          <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white text-2xl font-minecraft">
            <input
              type="checkbox"
              checked={isAutoscrollEnabled}
              onChange={(e) => onAutoscrollChange(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            Autoscroll
          </label>
        </div>
      )}
    </div>
  );
}
