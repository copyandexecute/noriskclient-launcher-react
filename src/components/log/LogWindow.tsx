"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogViewerDisplay } from "./LogViewerDisplay";
import * as ProcessService from "../../services/process-service";
import {
  getProfileLogFiles,
  LOG_LEVELS,
  type LogLevel,
  openLogFileDirectory,
  type ParsedLogLine,
  parseLogLinesFromString,
  uploadLogToMclogs,
} from "../../services/log-service";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";
import { EventType, type MinecraftXmlLogEntryPayload } from "../../types/events";

interface MinecraftOutputPayload {
  event_type: "minecraft_output";
  target_id: string;
  message: string;
}

type StateEventPayload =
  | MinecraftOutputPayload
  | { event_type: string; [key: string]: any };

const MAX_LOG_LINES = 1000;

export function LogWindow() {
  const [processId, setProcessId] = useState<string | null>(null);
  const [parsedLogLines, setParsedLogLines] = useState<ParsedLogLine[]>([]);
  const [rawLogContentForCopy, setRawLogContentForCopy] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveLogs, setIsLiveLogs] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    TRACE: false,
  });

  const [displayLines, setDisplayLines] = useState<ParsedLogLine[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logListenerRef = useRef<UnlistenFn | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] =
    useState<boolean>(false);
  const [isAutoscrollEnabled, setIsAutoscrollEnabled] = useState<boolean>(true);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadCompleteRef = useRef(initialLoadComplete);

  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("processId");
    const liveLogs = params.get("isLiveLogs") === "true";
    
    if (id) {
      console.log(`[LogWindow] Detected processId: ${id}`);
      setProcessId(id);
      
      if (liveLogs) {
        console.log(`[LogWindow] Live logs mode detected, skipping initial log fetch`);
        setIsLiveLogs(true);
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    } else {
      console.error("[LogWindow] No processId found in URL parameters.");
      setError("No process ID specified.");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialLoadCompleteRef.current = initialLoadComplete;
  }, [initialLoadComplete]);

  const scrollToBottom = useCallback(() => {
    if (scrollableContainerRef.current) {
      const element = scrollableContainerRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!processId) return;

    const fetchInitialLogs = async () => {
      console.log(
        `[LogWindow] Fetching initial logs for processId: ${processId}`,
      );
      setIsLoading(true);
      setError(null);
      setParsedLogLines([]);
      setRawLogContentForCopy(null);

      try {
        const rawContent =
          await ProcessService.getLogContentForProcess(processId);
        setRawLogContentForCopy(rawContent);
        const lines = parseLogLinesFromString(rawContent);
        setParsedLogLines(lines);
        console.log(`[LogWindow] Loaded ${lines.length} initial log lines.`);
      } catch (err: any) {
        console.error("[LogWindow] Failed to fetch initial logs:", err);
        setError(err?.message ?? "Failed to load initial logs.");
        setParsedLogLines([]);
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
        if (isAutoscrollEnabled) {
          setTimeout(scrollToBottom, 0);
        }
      }
    };

    if (!initialLoadComplete) {
      if (isLiveLogs) {
        console.log(`[LogWindow] Skipping initial log fetch due to live logs mode`);
        setInitialLoadComplete(true);
      } else {
        fetchInitialLogs();
      }
    }

    let isSubscribed = true;
    const setupListener = async () => {
      try {
        logListenerRef.current = await listen<StateEventPayload>(
          "state_event",
          (event) => {
            if (!isSubscribed || !initialLoadCompleteRef.current) return;

            const payload = event.payload;

            if (payload.target_id !== processId) {
              // console.trace(`[LogWindow] Ignoring event for different target: ${payload.target_id}, current: ${processId}`);
              return;
            }

            let linesToAdd: ParsedLogLine[] = [];
            let rawLineForCopy: string | null = null; // To accumulate raw lines for copy-pasting if needed

            if (isLiveLogs) {
              if (payload.event_type === EventType.MinecraftXmlLogEntry) {
                try {
                  const xmlEntry = JSON.parse(payload.message) as MinecraftXmlLogEntryPayload;
                  const newId = parsedLogLines.length; // Use current length for unique ID

                  linesToAdd.push({
                    id: newId,
                    raw: xmlEntry.raw_xml || `[XML Log] ${xmlEntry.message}`, // Fallback for raw line
                    timestamp: xmlEntry.timestamp,
                    thread: xmlEntry.thread_name,
                    level: xmlEntry.level.toUpperCase() as LogLevel, // Ensure uppercase for LogLevel type
                    text: xmlEntry.message,
                  });
                  rawLineForCopy = xmlEntry.raw_xml || xmlEntry.message;
                  console.log("[LogWindow] Parsed XML Log Entry:", xmlEntry);
                } catch (e) {
                  console.error("[LogWindow] Failed to parse MinecraftXmlLogEntryPayload:", e, payload.message);
                  // Optionally, add the raw message as an unparsed line
                  // linesToAdd.push(parseLogLinesFromString(`[ERROR Parsing XML Entry] ${payload.message}`, parsedLogLines.length));
                }
              }
              // In live logs mode, we now prioritize MinecraftXmlLogEntry.
              // We might still want to see raw stdout/stderr if the XML parser in backend fails to emit an XML entry for some lines.
              // For now, MinecraftStdout/Stderr events are no longer directly creating visible lines here
              // as the backend XmlLogParser is expected to handle them or they are non-XML.
              // If backend emits non-XML lines via a different event (e.g. MinecraftOutput again, or a new one), handle here.
               else if (
                 payload.event_type === EventType.MinecraftStdout ||
                 payload.event_type === EventType.MinecraftStderr
               ) {
                 // These are now processed by the backend parser.
                 // If the backend parser decides to FORWARD some raw lines under these event types,
                 // (e.g. if they are not XML), then we might want to parse them here.
                 // But the current backend parser design tries to emit MinecraftXmlLogEntry for XML,
                 // and implicitly drops non-XML lines it can't form into a block.
                 // console.log(`[LogWindow] Received raw ${payload.event_type}, expecting backend to parse as XML or handle as non-XML.`);
                 return; // Or parse as raw if backend might send non-XML this way
               } else if (payload.event_type === EventType.MinecraftOutput) {
                 // console.log("[LogWindow] Live mode: Ignoring MinecraftOutput event, relying on Stdout/Stderr pipes via backend parser.");
                 return;
               }
            } else {
              if (payload.event_type === EventType.MinecraftOutput) {
                rawLineForCopy = payload.message;
                linesToAdd = parseLogLinesFromString(rawLineForCopy, parsedLogLines.length);
              }
            }

            if (linesToAdd.length > 0) {
              setParsedLogLines((prevLines) => {
                const updatedLines = [...prevLines, ...linesToAdd];
                if (updatedLines.length > MAX_LOG_LINES) {
                  return updatedLines.slice(
                    updatedLines.length - MAX_LOG_LINES,
                  );
                }
                return updatedLines;
              });

              if (rawLineForCopy) {
                setRawLogContentForCopy((prevRaw) =>
                  prevRaw ? prevRaw + "\n" + rawLineForCopy : rawLineForCopy,
                );
              }

              if (isAutoscrollEnabled) {
                setTimeout(scrollToBottom, 0);
              }
            }
          },
        );
        console.log(
          `[LogWindow] Listening for 'state_event' for processId: ${processId}`,
        );
      } catch (err) {
        console.error(
          "[LogWindow] Failed to set up state_event listener:",
          err,
        );
        setError(
          (prev) =>
            prev ||
            (err instanceof Error
              ? err.message
              : "Failed to listen for log updates."),
        );
      }
    };

    setupListener();

    return () => {
      isSubscribed = false;
      if (logListenerRef.current) {
        console.log(
          `[LogWindow] Unsubscribing from 'state_event' for processId: ${processId}`,
        );
        logListenerRef.current();
        logListenerRef.current = null;
      }
      setInitialLoadComplete(false);
    };
  }, [processId, isAutoscrollEnabled, scrollToBottom]);

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

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleOpenFolderForProcess = useCallback(async () => {
    if (!processId) return;

    console.log(`[LogWindow] Opening folder for process: ${processId}`);
    setError(null);

    try {
      const processes = await ProcessService.getRunningProcesses();
      const currentProcess = processes.find((p) => p.id === processId);

      if (!currentProcess) {
        throw new Error(`Process ${processId} not found.`);
      }

      const profileId = currentProcess.profile_id;
      const logFiles = await getProfileLogFiles(profileId);

      if (logFiles.length === 0) {
        throw new Error(`No log files found for profile ${profileId}.`);
      }

      const filePathToOpen =
        logFiles.find((p) => p.toLowerCase().endsWith("latest.log")) ||
        logFiles[0];

      await openLogFileDirectory(filePathToOpen);
    } catch (err: any) {
      console.error("[LogWindow] Error opening logs folder:", err);
      setError(err?.message ?? "Failed to open logs folder");
    }
  }, [processId]);

  const handleLevelFilterChange = useCallback(
    (level: LogLevel, checked: boolean) => {
      setLevelFilters((prev) => ({ ...prev, [level]: checked }));
    },
    [],
  );

  const handleAutoscrollChange = useCallback(
    (enabled: boolean) => {
      setIsAutoscrollEnabled(enabled);
      if (enabled) {
        setTimeout(scrollToBottom, 0);
      }
    },
    [scrollToBottom],
  );

  const handleCopyLog = useCallback(async () => {
    if (displayLines.length === 0) return;
    const filteredLogContent = displayLines.map((line) => line.raw).join("\n");

    try {
      await writeText(filteredLogContent);
      toast.success("Log content copied to clipboard!");
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("[LogWindow] Failed to copy log to clipboard:", err);
      toast.error("Failed to copy log content.");
    }
  }, [displayLines]);

  const handleOpenUploadUrl = useCallback(async (url: string) => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (err) {
      console.error(`[LogWindow] Failed to open URL ${url}:`, err);
      setError(err instanceof Error ? err.message : "Failed to open URL");
    }
  }, []);

  const handleUploadLogForProcess = useCallback(async (): Promise<string> => {
    if (!rawLogContentForCopy) {
      throw new Error("No log content available to upload.");
    }
    console.log(`[LogWindow] Uploading log content for process: ${processId}`);
    setError(null);
    return uploadLogToMclogs(rawLogContentForCopy);
  }, [rawLogContentForCopy, processId]);

  return (
    <div 
      className="flex flex-col h-full text-white font-minecraft"
      style={{ backgroundColor: `${accentColor.value}10` }}
    >
      <div
        className="border-2 border-b-4 rounded-lg h-full flex flex-col overflow-hidden shadow-lg"
        style={{
          borderColor: `${accentColor.value}40`,
          borderBottomColor: `${accentColor.value}60`,
          backgroundColor: `${accentColor.value}10`,
        }}
      >
        <LogViewerDisplay
          isLoading={isLoading}
          error={error}
          displayLines={displayLines}
          parsedLogLinesCount={parsedLogLines.length}
          searchTerm={searchTerm}
          levelFilters={levelFilters}
          copied={copied}
          onSearchChange={handleSearchChange}
          onLevelFilterChange={handleLevelFilterChange}
          onCopyLog={handleCopyLog}
          logLevelsDefinition={LOG_LEVELS}
          onOpenFolder={handleOpenFolderForProcess}
          onUploadLog={handleUploadLogForProcess}
          onOpenUploadUrl={handleOpenUploadUrl}
          isAutoscrollEnabled={isAutoscrollEnabled}
          onAutoscrollChange={handleAutoscrollChange}
          scrollableContainerRef={scrollableContainerRef}
        />
      </div>
    </div>
  );
}
