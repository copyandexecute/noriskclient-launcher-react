"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LogViewerDisplay } from './LogViewerDisplay'; // Import the reusable display component
import * as ProcessService from '../../services/process-service'; // Import process service
import { 
    parseLogLinesFromString, type ParsedLogLine, type LogLevel, LOG_LEVELS,
    openLogFileDirectory, getProfileLogFiles, // Import getProfileLogFiles
    uploadLogToMclogs // Import upload function
} from '../../services/log-service'; // Import log service utilities
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener'; // Needed for opening mclo.gs link

// Define the expected payload structure (based on Svelte code)
interface MinecraftOutputPayload {
  event_type: 'minecraft_output';
  target_id: string; // Corresponds to processId (Uuid)
  message: string; // The raw log line
}

// Define a general payload type if other events might come through
type StateEventPayload = MinecraftOutputPayload | { event_type: string; [key: string]: any };

const MAX_LOG_LINES = 1000; // Keep more lines than Svelte example?

export function LogWindow() {
  const [processId, setProcessId] = useState<string | null>(null);
  const [parsedLogLines, setParsedLogLines] = useState<ParsedLogLine[]>([]);
  const [rawLogContentForCopy, setRawLogContentForCopy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    TRACE: false, // Default TRACE to off in live view?
  });

  const [displayLines, setDisplayLines] = useState<ParsedLogLine[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logListenerRef = useRef<UnlistenFn | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [isAutoscrollEnabled, setIsAutoscrollEnabled] = useState<boolean>(true);
  const scrollableContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable div
  // Ref to track the current state of initial load for the listener
  const initialLoadCompleteRef = useRef(initialLoadComplete);

  // State for uploads specific to this window
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Read processId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('processId');
    if (id) {
      console.log(`[LogWindow] Detected processId: ${id}`);
      setProcessId(id);
    } else {
      console.error("[LogWindow] No processId found in URL parameters.");
      setError("No process ID specified.");
      setIsLoading(false);
    }
  }, []);

  // Keep the ref updated with the latest state value
  useEffect(() => {
    initialLoadCompleteRef.current = initialLoadComplete;
  }, [initialLoadComplete]);

  // Helper function for scrolling
  const scrollToBottom = useCallback(() => {
    if (scrollableContainerRef.current) {
        const element = scrollableContainerRef.current;
        element.scrollTop = element.scrollHeight;
    }
  }, []);

  // 2. Fetch initial logs & Setup listener when processId is set
  useEffect(() => {
    if (!processId) return;

    const fetchInitialLogs = async () => {
      console.log(`[LogWindow] Fetching initial logs for processId: ${processId}`);
      setIsLoading(true);
      setError(null);
      setParsedLogLines([]);
      setRawLogContentForCopy(null);

      try {
        const rawContent = await ProcessService.getLogContentForProcess(processId);
        setRawLogContentForCopy(rawContent); // Store raw content for potential copy
        const lines = parseLogLinesFromString(rawContent);
        setParsedLogLines(lines);
        console.log(`[LogWindow] Loaded ${lines.length} initial log lines.`);
      } catch (err: any) {
        console.error("[LogWindow] Failed to fetch initial logs:", err);
        setError(err?.message ?? "Failed to load initial logs.");
        setParsedLogLines([]);
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true); // Mark initial load as done
        if (isAutoscrollEnabled) {
          // Use timeout to ensure DOM is updated after fetch
          setTimeout(scrollToBottom, 0); 
        }
      }
    };

    // Only fetch initial logs if not already done for this processId
    if (!initialLoadComplete) {
        fetchInitialLogs();
    }

    // Setup log listener
    let isSubscribed = true; // Flag to prevent state updates after unmount
    const setupListener = async () => {
      try {
        logListenerRef.current = await listen<StateEventPayload>('state_event', (event) => {
          // Use the ref here to get the latest value
          if (!isSubscribed || !initialLoadCompleteRef.current) return; 

          const payload = event.payload;
          if (payload.event_type === 'minecraft_output' && payload.target_id === processId) {
            const rawLine = payload.message;
            const newParsedLines = parseLogLinesFromString(rawLine); // Parse the single incoming line

            setParsedLogLines(prevLines => {
              const updatedLines = [...prevLines, ...newParsedLines];
              // Limit line count
              if (updatedLines.length > MAX_LOG_LINES) {
                return updatedLines.slice(updatedLines.length - MAX_LOG_LINES);
              }
              return updatedLines;
            });

            setRawLogContentForCopy(prevRaw => (prevRaw ? prevRaw + '\n' + rawLine : rawLine));

            // Autoscroll if enabled
            if (isAutoscrollEnabled) {
              // Use timeout to ensure DOM is updated after state change
              setTimeout(scrollToBottom, 0);
            }
          }
        });
        console.log(`[LogWindow] Listening for 'state_event' for processId: ${processId}`);
      } catch (err) {
        console.error("[LogWindow] Failed to set up state_event listener:", err);
        setError(prev => prev || (err instanceof Error ? err.message : "Failed to listen for log updates."));
      }
    };

    setupListener();

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (logListenerRef.current) {
        console.log(`[LogWindow] Unsubscribing from 'state_event' for processId: ${processId}`);
        logListenerRef.current();
        logListenerRef.current = null;
      }
      setInitialLoadComplete(false); // Reset for potential future processId change (though unlikely in same window)
    };
  }, [processId, isAutoscrollEnabled, scrollToBottom]); // Rerun effect if processId changes, or if autoscroll/scroll function changes (less likely)

  // 3. Filter displayed logs based on search term and level filters
  useEffect(() => {
    const filteredLines = parsedLogLines.filter(line => {
      // Ensure level check handles undefined level correctly
      const levelMatch = !line.level || (levelFilters[line.level]); 
      const searchMatch = !searchTerm || line.raw.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return levelMatch && searchMatch;
    });
    setDisplayLines(filteredLines);
  }, [parsedLogLines, searchTerm, levelFilters]);

  // Cleanup copy timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Handlers passed to LogViewerDisplay
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Handler for LogWindow (will not be used as prop won't be passed)
  const handleOpenFolderForProcess = useCallback(async () => {
    if (!processId) return;

    console.log(`[LogWindow] Opening folder for process: ${processId}`);
    setError(null); // Clear previous errors

    try {
      // 1. Get all running processes to find the profileId
      const processes = await ProcessService.getRunningProcesses();
      const currentProcess = processes.find(p => p.id === processId);

      if (!currentProcess) {
        throw new Error(`Process ${processId} not found.`);
      }

      // 2. Get log file paths for the profile
      const profileId = currentProcess.profile_id;
      const logFiles = await getProfileLogFiles(profileId);

      if (logFiles.length === 0) {
          throw new Error(`No log files found for profile ${profileId}.`);
      }

      // 3. Select a file path (e.g., latest.log or first)
      const filePathToOpen = logFiles.find(p => p.toLowerCase().endsWith('latest.log')) || logFiles[0];

      // 4. Call the service with the file path
      await openLogFileDirectory(filePathToOpen);

    } catch (err: any) {
        console.error('[LogWindow] Error opening logs folder:', err);
        setError(err?.message ?? 'Failed to open logs folder');
    }
  }, [processId]);

  const handleLevelFilterChange = useCallback((level: LogLevel, checked: boolean) => {
    setLevelFilters(prev => ({ ...prev, [level]: checked }));
  }, []);

  const handleAutoscrollChange = useCallback((enabled: boolean) => {
    setIsAutoscrollEnabled(enabled);
    if (enabled) {
        // Scroll immediately when enabled
        setTimeout(scrollToBottom, 0); 
    }
  }, [scrollToBottom]);

  const handleCopyLog = useCallback(async () => {
    // Copy currently displayed lines
    if (displayLines.length === 0) return; 
    const filteredLogContent = displayLines.map(line => line.raw).join('\n');

    try {
      await writeText(filteredLogContent);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => { setCopied(false); }, 2000);
    } catch (err) {
      console.error('[LogWindow] Failed to copy log to clipboard:', err);
      // TODO: Show user feedback on copy error?
    }
  }, [displayLines]);

  // Handler to open the uploaded URL
  const handleOpenUploadUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (err) {
      console.error(`[LogWindow] Failed to open URL ${url}:`, err);
      setError(err instanceof Error ? err.message : "Failed to open URL");
    }
  }, []);

  // Handler for uploading logs from this window
  const handleUploadLogForProcess = useCallback(async () => {
    if (!rawLogContentForCopy) {
        setError("No log content available to upload.");
        return;
    }

    console.log(`[LogWindow] Uploading log content for process: ${processId}`);
    setIsUploading(true);
    setUploadUrl(null);
    setUploadError(null);
    setError(null); // Clear general errors

    try {
      const resultUrl = await uploadLogToMclogs(rawLogContentForCopy);
      setUploadUrl(resultUrl);
      console.log(`[LogWindow] Upload successful: ${resultUrl}`);
    } catch (err: any) {
      console.error(`[LogWindow] Error uploading log:`, err);
      setUploadError(err?.message ?? 'Failed to upload log');
    } finally {
      setIsUploading(false);
    }
  }, [rawLogContentForCopy, processId]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200 p-4">
      {/* Pass state and handlers to the reusable display component */} 
      <LogViewerDisplay
        isLoading={isLoading}
        error={error} // Display error within the component
        displayLines={displayLines}
        parsedLogLinesCount={parsedLogLines.length} // Pass total parsed count
        searchTerm={searchTerm}
        levelFilters={levelFilters}
        copied={copied}
        onSearchChange={handleSearchChange}
        onLevelFilterChange={handleLevelFilterChange}
        onCopyLog={handleCopyLog}
        logLevelsDefinition={LOG_LEVELS}
        onOpenFolder={handleOpenFolderForProcess} 
        // Pass upload props
        onUploadLog={handleUploadLogForProcess}
        isUploading={isUploading}
        uploadUrl={uploadUrl}
        uploadError={uploadError}
        onOpenUploadUrl={handleOpenUploadUrl}
        // Autoscroll props
        isAutoscrollEnabled={isAutoscrollEnabled}
        onAutoscrollChange={handleAutoscrollChange}
        scrollableContainerRef={scrollableContainerRef} // Pass the ref
      />
    </div>
  );
} 