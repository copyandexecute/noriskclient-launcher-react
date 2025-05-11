"use client";

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
import { LogViewerDisplay } from "../../log/LogViewerDisplay";

interface LogsTabProps {
  profile: Profile;
}

function getFilename(path: string | null): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() || path;
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
    const linesAfterLevelFilter = parsedLogLines.filter((line) => {
      if (!line.level) return true;
      return levelFilters[line.level];
    });

    const linesAfterSearchFilter = linesAfterLevelFilter.filter((line) => {
      if (!searchTerm) return true;
      return line.raw.toLowerCase().includes(searchTerm.toLowerCase().trim());
    });

    setDisplayLines(linesAfterSearchFilter);
  }, [parsedLogLines, searchTerm, levelFilters]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleLogSelect = useCallback((value: string) => {
    setSelectedLogPath(value || null);
  }, []);

  const handleLevelFilterChange = useCallback(
    (level: LogLevel, checked: boolean) => {
      setLevelFilters((prev) => ({ ...prev, [level]: checked }));
    },
    [],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

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

  const handleOpenUrl = useCallback(async (url: string) => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (err) {
      console.error(`[LogsTab] Failed to open URL ${url}:`, err);
    }
  }, []);

  return (
    <div className="h-full select-none p-4 flex flex-col text-white">
      <div className="border-2 border-b-4 rounded-lg h-full flex flex-col overflow-hidden shadow-lg">
        <LogViewerDisplay
          isLoading={isLoadingList || isLoadingContent}
          error={errorList || errorContent}
          displayLines={displayLines}
          parsedLogLinesCount={parsedLogLines.length}
          searchTerm={searchTerm}
          levelFilters={levelFilters}
          copied={copied}
          onSearchChange={handleSearchChange}
          onLevelFilterChange={handleLevelFilterChange}
          onCopyLog={handleCopyLog}
          logLevelsDefinition={LOG_LEVELS}
          scrollableContainerRef={scrollableContainerRef}
          onOpenFolder={handleOpenLogsFolder}
          onUploadLog={handleUploadLog}
          isUploading={isUploading}
          uploadUrl={uploadUrl}
          uploadError={uploadError}
          onOpenUploadUrl={handleOpenUrl}
          logFiles={logFiles}
          selectedLogPath={selectedLogPath}
          onLogSelect={handleLogSelect}
        />
      </div>
    </div>
  );
}
