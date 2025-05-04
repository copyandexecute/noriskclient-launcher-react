"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LogViewerDisplay } from './LogViewerDisplay'; // Import the reusable display component
import * as ProcessService from '../../services/process-service'; // Import process service
import { parseLogLinesFromString, type ParsedLogLine, type LogLevel, LOG_LEVELS } from '../../services/log-service'; // Import log service utilities
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

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

  // 2. Fetch initial logs when processId is set
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
      }
    };

    fetchInitialLogs();

    // TODO: Implement log streaming/updates via Tauri events
    // Example placeholder:
    // const unlisten = await listen(`log-update-${processId}`, (event) => {
    //   const newLogChunk = event.payload as string;
    //   const newLines = parseLogLinesFromString(newLogChunk); // Or adapt parsing
    //   setParsedLogLines(prev => [...prev, ...newLines]);
    //   setRawLogContentForCopy(prev => prev + '\n' + newLogChunk);
    // });
    // return () => { unlisten(); };

  }, [processId]);

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

  const handleLevelFilterChange = useCallback((level: LogLevel, checked: boolean) => {
    setLevelFilters(prev => ({ ...prev, [level]: checked }));
  }, []);

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
        logLevelsDefinition={LOG_LEVELS} // Pass the defined levels
      />
    </div>
  );
} 