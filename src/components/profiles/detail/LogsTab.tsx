"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Profile } from "../../../types/profile";
import {
  getLogFileContent,
  getProfileLogFiles,
  LOG_LEVELS,
  type LogLevel,
  openLogFileDirectory,
  type ParsedLogLine,
  parseLogLinesFromString,
  uploadLogToMclogs,
} from "../../../services/log-service";
import { Icon } from "@iconify/react";

interface LogsTabProps {
  profile: Profile;
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

export function LogsTab({ profile }: LogsTabProps) {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  const [selectedLogPath, setSelectedLogPath] = useState<string | null>(null);
  const [parsedLogLines, setParsedLogLines] = useState<ParsedLogLine[]>([]);
  const [rawLogContentForCopy, setRawLogContentForCopy] = useState<
    string | null
  >(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    TRACE: true,
  });

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [displayLines, setDisplayLines] = useState<ParsedLogLine[]>([]);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const loadFiles = async () => {
      console.log(`[LogsTab] Fetching logs for profile: ${profile.id}`);
      setIsLoadingList(true);
      setErrorList(null);
      setLogFiles([]);
      setSelectedLogPath(null);
      setParsedLogLines([]);
      setRawLogContentForCopy(null);
      setErrorContent(null);
      setSearchTerm("");
      setUploadUrl(null);
      setUploadError(null);
      setCopied(false);

      try {
        const paths = await getProfileLogFiles(profile.id);
        paths.sort((a, b) => {
          const aName = getFilename(a).toLowerCase();
          const bName = getFilename(b).toLowerCase();
          if (aName === "latest.log") return -1;
          if (bName === "latest.log") return 1;
          if (typeof aName === "string" && typeof bName === "string") {
            return bName.localeCompare(aName);
          }
          return 0;
        });
        setLogFiles(paths);
        console.log(`[LogsTab] Found ${paths.length} log files.`);

        if (paths.length > 0) {
          setSelectedLogPath(paths[0]);
          console.log(`[LogsTab] Automatically selected log: ${paths[0]}`);
        } else {
          setSelectedLogPath(null);
        }
      } catch (err: any) {
        console.error("[LogsTab] Error fetching log files:", err);
        setErrorList(err?.message ?? "Failed to load log files");
      } finally {
        setIsLoadingList(false);
      }
    };

    loadFiles();
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedLogPath) {
      setParsedLogLines([]);
      setRawLogContentForCopy(null);
      setErrorContent(null);
      setUploadUrl(null);
      setUploadError(null);
      setCopied(false);
      setSearchTerm("");
      setIsLoadingContent(false);
      return;
    }

    const loadContent = async () => {
      console.log(`[LogsTab] Fetching content for log: ${selectedLogPath}`);
      setIsLoadingContent(true);
      setErrorContent(null);
      setParsedLogLines([]);
      setRawLogContentForCopy(null);
      setUploadUrl(null);
      setUploadError(null);
      setCopied(false);

      try {
        const rawContent = await getLogFileContent(selectedLogPath);
        setRawLogContentForCopy(rawContent);

        const processedLines = parseLogLinesFromString(rawContent);

        setParsedLogLines(processedLines);
        console.log(
          `[LogsTab] Loaded and parsed ${processedLines.length} lines for ${selectedLogPath}`,
        );
      } catch (err: any) {
        console.error(
          `[LogsTab] Error fetching/parsing log content for ${selectedLogPath}:`,
          err,
        );
        setErrorContent(err?.message ?? "Failed to load log content");
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [selectedLogPath]);

  useEffect(() => {
    const filteredLines = parsedLogLines.filter((line) => {
      const levelMatch =
        !line.level || (levelFilters[line.level] && line.level !== "TRACE");
      const searchMatch =
        !searchTerm ||
        line.raw.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return levelMatch && searchMatch;
    });
    setDisplayLines(filteredLines);
  }, [parsedLogLines, searchTerm, levelFilters]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleLogSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedLogPath(event.target.value || null);
    },
    [],
  );

  const handleLevelFilterChange = useCallback(
    (level: LogLevel, checked: boolean) => {
      setLevelFilters((prev) => ({ ...prev, [level]: checked }));
    },
    [],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    [],
  );

  const handleCopyLog = useCallback(async () => {
    if (displayLines.length === 0) return;

    const filteredLogContent = displayLines.map((line) => line.raw).join("\n");

    try {
      await writeText(filteredLogContent);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("[LogsTab] Failed to copy log to clipboard:", err);
    }
  }, [displayLines]);

  const handleUploadLog = useCallback(async () => {
    if (!rawLogContentForCopy || !selectedLogPath) return;

    setIsUploading(true);
    setUploadUrl(null);
    setUploadError(null);

    try {
      console.log(`[LogsTab] Uploading log: ${getFilename(selectedLogPath)}`);
      const resultUrl = await uploadLogToMclogs(rawLogContentForCopy);
      setUploadUrl(resultUrl);
      console.log(`[LogsTab] Upload successful: ${resultUrl}`);
    } catch (err: any) {
      console.error(`[LogsTab] Error uploading log:`, err);
      setUploadError(err?.message ?? "Failed to upload log");
    } finally {
      setIsUploading(false);
    }
  }, [rawLogContentForCopy, selectedLogPath]);

  const handleOpenLogsFolder = useCallback(async () => {
    const path_to_open =
      logFiles.find((p) => getFilename(p).toLowerCase() === "latest.log") ||
      logFiles[0];
    if (!path_to_open) {
      setErrorList("No log files found to determine folder path.");
      return;
    }
    console.log(
      `[LogsTab] Requesting to open directory for file: ${path_to_open}`,
    );
    try {
      await openLogFileDirectory(path_to_open);
    } catch (err: any) {
      console.error("[LogsTab] Error opening logs folder:", err);
      setErrorList(err?.message ?? "Failed to open logs folder");
    }
  }, [logFiles]);

  const handleOpenUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (err) {
      console.error(`[LogsTab] Failed to open URL ${url}:`, err);
    }
  }, []);

  return (
    <div className="h-full select-none flex flex-col text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 flex-shrink-0">
        <h2 className="font-minecraft text-3xl lowercase tracking-wide">
          log viewer
        </h2>
      </div>

      {/* Main container with border */}
      <div className="border-2 border-white/30 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-black/30 border-b-2 border-white/30 py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Level filters */}
            <div className="flex items-center gap-2">
              {LOG_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    handleLevelFilterChange(level, !levelFilters[level])
                  }
                  disabled={isLoadingContent}
                  className={`px-4 py-2 font-minecraft text-xl ${
                    levelFilters[level]
                      ? level === "ERROR"
                        ? "bg-red-900/40 text-red-300 border-2 border-red-700/50"
                        : level === "WARN"
                          ? "bg-yellow-900/40 text-yellow-300 border-2 border-yellow-700/50"
                          : level === "INFO"
                            ? "bg-blue-900/40 text-blue-300 border-2 border-blue-700/50"
                            : level === "DEBUG"
                              ? "bg-cyan-900/40 text-cyan-300 border-2 border-cyan-700/50"
                              : "bg-purple-900/40 text-purple-300 border-2 border-purple-700/50"
                      : "bg-black/20 text-white/60 hover:text-white border-2 border-white/20"
                  }`}
                >
                  {level.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Filter lines..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoadingContent}
                className="w-full bg-black/20 backdrop-blur-md border-2 border-white/10 px-3 py-2 text-white font-minecraft text-xl shadow-sm tracking-wide"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={() => setSearchTerm("")}
                >
                  <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopyLog}
              disabled={displayLines.length === 0 || isLoadingContent || copied}
              className={`bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 ${
                copied
                  ? "border-green-500/30 text-green-400"
                  : "border-white/30"
              } px-5 py-2 font-minecraft text-xl flex items-center gap-2 transition-colors`}
            >
              <Icon
                icon={copied ? "pixel:check" : "pixel:copy"}
                className="w-5 h-5"
              />
              <span>{copied ? "copied" : "copy"}</span>
            </button>

            {/* Upload button */}
            {rawLogContentForCopy && (
              <button
                onClick={handleUploadLog}
                disabled={isLoadingContent || isUploading}
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

            {/* Open folder button */}
            {logFiles.length > 0 && (
              <button
                onClick={handleOpenLogsFolder}
                disabled={isLoadingList}
                className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-md border-2 border-white/30 px-5 py-2 font-minecraft text-xl flex items-center gap-2 transition-colors"
              >
                <Icon icon="pixel:folder-open-solid" className="w-5 h-5" />
                <span>logs folder</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Only this part scrolls */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          {isLoadingList || isLoadingContent ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
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
          ) : errorList || errorContent ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-6 bg-red-900/30 border-2 border-red-700/50 text-red-300 text-2xl max-w-2xl">
                Error: {errorList || errorContent}
              </div>
            </div>
          ) : parsedLogLines.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
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
          ) : displayLines.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
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
          ) : (
            <div
              className="h-full overflow-y-auto custom-scrollbar"
              ref={scrollableContainerRef}
            >
              <div className="p-4 bg-black/60 font-mono text-lg whitespace-pre-wrap">
                {displayLines.map((line) => (
                  <div
                    key={line.id}
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/30 border-t-2 border-white/30 py-3 px-4 flex justify-between items-center">
          <div className="text-white/70 font-minecraft text-xl">
            {displayLines.length > 0 ? (
              <>
                {displayLines.length} of {parsedLogLines.length} lines
              </>
            ) : (
              <span>No lines to display</span>
            )}
          </div>

          {/* Log file selector in the footer */}
          <div className="flex items-center gap-3">
            {logFiles.length > 0 && (
              <div className="flex items-center gap-2 relative">
                <select
                  value={selectedLogPath ?? ""}
                  onChange={handleLogSelect}
                  disabled={isLoadingList}
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
          </div>
        </div>
      </div>

      {/* Upload URL notification */}
      {uploadUrl && (
        <div className="mt-4 flex items-center gap-2 bg-black/20 backdrop-blur-md border-2 border-white/10 p-3">
          <span className="text-white/70 font-minecraft text-xl">
            Log uploaded:
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleOpenUrl(uploadUrl);
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

      {/* Upload error notification */}
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
