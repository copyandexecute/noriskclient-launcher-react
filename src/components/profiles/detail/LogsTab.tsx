"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { EmptyState } from "./common/EmptyState";
import { LoadingSpinner } from "../../ui/LoadingSpinner";

interface LogsTabProps {
  profile: Profile;
}

// --- Types & Constants ---

interface ParsedLogLine {
  id: number; // Unique ID for React key
  raw: string; // Original raw line
  timestamp?: string;
  thread?: string;
  level?: LogLevel; // Use LogLevel type
  text: string;
}

const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;
type LogLevel = typeof LOG_LEVELS[number];

// Regex to parse typical Minecraft/Forge/Fabric log lines
// Example: [15:30:00] [main/INFO]: Loading Minecraft 1.20.1
const logLineRegex = /^\s*\[(\d{2}:\d{2}:\d{2})\]\s+\[([^\[\/\r\n]+)\/([^\]\r\n]+)\]:(.*)$/;


// --- Helper Functions ---

// Get filename from path
function getFilename(path: string | null): string {
  if (!path) return '';
  // Handles both / and \\ separators
  return path.split(/[\\\/]/).pop() || path;
}

// Parse a single log line
function parseLogLine(line: string, id: number): ParsedLogLine {
  const match = line.match(logLineRegex);
  if (match) {
    // Normalize level capitalization for matching
    const levelUpper = match[3].toUpperCase() as LogLevel;
    const level = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
    return {
      id,
      raw: line,
      timestamp: match[1],
      thread: match[2],
      level: level,
      text: match[4].trimEnd(), // Trim potential trailing whitespace
    };
  }
  // Default if no match (e.g., stack trace line)
  return {
    id,
    raw: line,
    text: line.trimEnd(), // Still trim trailing whitespace
  };
}

// --- Component ---

export function LogsTab({ profile }: LogsTabProps) {
  // == State ==
  // Log files list
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  // Selected log file and its content
  const [selectedLogPath, setSelectedLogPath] = useState<string | null>(null);
  const [parsedLogLines, setParsedLogLines] = useState<ParsedLogLine[]>([]);
  const [rawLogContentForCopy, setRawLogContentForCopy] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    TRACE: true,
  });

  // Copy state
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // == Effects and Memos ==

  // Load log file list on profile change
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
      setSearchTerm(''); // Reset search
      setUploadUrl(null); // Reset upload status
      setUploadError(null);
      setCopied(false); // Reset copy status


      try {
        const paths = await invoke<string[]>('get_profile_log_files', { profileId: profile.id });
        // Sort: latest.log first, then reverse alpha
        paths.sort((a, b) => {
          const aName = getFilename(a).toLowerCase();
          const bName = getFilename(b).toLowerCase();
          if (aName === 'latest.log') return -1;
          if (bName === 'latest.log') return 1;
          // Fallback for potentially non-string results from getFilename
          if (typeof aName === 'string' && typeof bName === 'string') {
            return bName.localeCompare(aName);
          }
          return 0; // Should not happen with current getFilename logic
        });
        setLogFiles(paths);
        console.log(`[LogsTab] Found ${paths.length} log files.`);
      } catch (err: any) {
        console.error('[LogsTab] Error fetching log files:', err);
        setErrorList(err?.message ?? 'Failed to load log files');
      } finally {
        setIsLoadingList(false);
      }
    };

    loadFiles();
  }, [profile?.id]);

  // Load and parse log content when selection changes
  useEffect(() => {
    if (!selectedLogPath) {
        setParsedLogLines([]);
        setRawLogContentForCopy(null);
        setErrorContent(null);
        setUploadUrl(null);
        setUploadError(null);
        setCopied(false);
        setSearchTerm('');
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
        // Don't reset search term here - user might want to keep it

        try {
          const rawContent = await invoke<string>('get_log_file_content', { logFilePath: selectedLogPath });
          setRawLogContentForCopy(rawContent);
          
          // --- New Parsing Logic --- 
          const linesArray = rawContent.split(/\r?\n/);
          const processedLines: ParsedLogLine[] = [];
          let lastKnownLevel: LogLevel | undefined = undefined;

          for (let i = 0; i < linesArray.length; i++) {
            const line = linesArray[i];
            const match = line.match(logLineRegex);

            if (match) {
              // Line matches the standard format
              const levelUpper = match[3].toUpperCase() as LogLevel;
              const currentLevel = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
              processedLines.push({
                id: i,
                raw: line,
                timestamp: match[1],
                thread: match[2],
                level: currentLevel,
                text: match[4].trimEnd(),
              });
              lastKnownLevel = currentLevel; // Remember this level
            } else {
              // Line does NOT match - inherit level from previous line
              processedLines.push({
                id: i,
                raw: line,
                timestamp: undefined, // No timestamp/thread info
                thread: undefined,
                level: lastKnownLevel, // Use the last known level
                text: line.trimEnd(),
              });
              // Do not update lastKnownLevel here
            }
          }
          // --- End New Parsing Logic ---

          setParsedLogLines(processedLines);
          console.log(`[LogsTab] Loaded and parsed ${processedLines.length} lines for ${selectedLogPath}`);
        } catch (err: any) {
          console.error(`[LogsTab] Error fetching/parsing log content for ${selectedLogPath}:`, err);
          setErrorContent(err?.message ?? 'Failed to load log content');
        } finally {
          setIsLoadingContent(false);
        }
    };

    loadContent();

  }, [selectedLogPath]); // Dependency on selectedLogPath

  // Calculate displayed lines based on filters
  const displayLines = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    const isSearchActive = searchLower !== '';
    const activeLevelFilters = new Set(
      LOG_LEVELS.filter(level => levelFilters[level])
    );

    return parsedLogLines.filter(line => {
      // Level filter: Pass if line has no level or its level is active
      const levelMatch = !line.level || activeLevelFilters.has(line.level);
      if (!levelMatch) return false;

      // Search filter: Pass if search is inactive or raw line includes term
      const searchMatch = !isSearchActive || line.raw.toLowerCase().includes(searchLower);
      return searchMatch;
    });
  }, [parsedLogLines, searchTerm, levelFilters]);


  // Clear copy feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // == Action Handlers ==

  const handleLogSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLogPath(event.target.value || null);
  }, []);

  const handleLevelFilterChange = useCallback((level: LogLevel, checked: boolean) => {
    setLevelFilters(prev => ({ ...prev, [level]: checked }));
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleCopyLog = useCallback(async () => {
    if (!rawLogContentForCopy) return;
    try {
      await writeText(rawLogContentForCopy);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => { setCopied(false); }, 2000);
    } catch (err) {
      console.error('[LogsTab] Failed to copy log to clipboard:', err);
      // TODO: Maybe show a toast notification?
    }
  }, [rawLogContentForCopy]);

  const handleUploadLog = useCallback(async () => {
    if (!rawLogContentForCopy || !selectedLogPath) return;

    setIsUploading(true);
    setUploadUrl(null);
    setUploadError(null);

    try {
      console.log(`[LogsTab] Uploading log: ${getFilename(selectedLogPath)}`);
      // Ensure this backend command exists and is registered in Rust/Tauri
      const resultUrl = await invoke<string>('upload_log_to_mclogs_command', { logContent: rawLogContentForCopy });
      setUploadUrl(resultUrl);
      console.log(`[LogsTab] Upload successful: ${resultUrl}`);
    } catch (err: any) {
      console.error(`[LogsTab] Error uploading log:`, err);
      setUploadError(err?.message ?? 'Failed to upload log');
    } finally {
      setIsUploading(false);
    }
  }, [rawLogContentForCopy, selectedLogPath]);

  const handleOpenLogsFolder = useCallback(async () => {
    // Try to find latest.log, otherwise use the first log file path
    const path_to_open = logFiles.find(p => getFilename(p).toLowerCase() === 'latest.log') || logFiles[0];
    if (!path_to_open) {
      setErrorList('No log files found to determine folder path.');
      return;
    }
    try {
      console.log(`[LogsTab] Requesting to open directory for file: ${path_to_open}`);
      // Ensure this backend command exists and is registered in Rust/Tauri
      await invoke('open_file_directory', { filePath: path_to_open });
    } catch (err: any) {
      console.error('[LogsTab] Error opening logs folder:', err);
      setErrorList(err?.message ?? 'Failed to open logs folder');
    }
  }, [logFiles]); // Dependency on logFiles

  const handleOpenUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      // Use the correctly imported function
      await openUrl(url);
    } catch (err) {
      console.error(`[LogsTab] Failed to open URL ${url}:`, err);
       // TODO: Maybe show a toast notification?
    }
  }, []); // Removed openUrl from dependency array as it's imported

  // == Dynamic Styling ==
  const getLevelColorClass = (level?: LogLevel): string => {
    switch (level) {
      case 'ERROR': return 'text-red-400 font-semibold';
      case 'WARN': return 'text-yellow-400 font-semibold';
      case 'INFO': return 'text-blue-400';
      case 'DEBUG': return 'text-cyan-400';
      case 'TRACE': return 'text-purple-400';
      default: return 'text-gray-400'; // Default for unknown or no level
    }
  };
  const getLevelBgClass = (level: LogLevel): string => {
     switch (level) {
       case 'ERROR': return 'bg-red-900/50 border-red-700';
       case 'WARN': return 'bg-yellow-900/50 border-yellow-700';
       case 'INFO': return 'bg-blue-900/50 border-blue-700';
       case 'DEBUG': return 'bg-cyan-900/50 border-cyan-700';
       case 'TRACE': return 'bg-purple-900/50 border-purple-700';
       default: return 'bg-gray-800/50 border-gray-700';
     }
   };


  // == Render ==
  return (
    // Use flex-col for overall vertical layout
    <div className="h-full flex flex-col select-none text-sm">

      {/* Header Row: Title, Open Folder, Log Select, Copy, Upload */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0 px-1">
        {/* Left side: Title and Open Folder */}
        <div className="flex items-center gap-4">
            <h3 className="text-white font-minecraft text-lg lowercase tracking-wide">
                Log Files
        </h3>
            {logFiles.length > 0 && (
                <button
                    onClick={handleOpenLogsFolder}
                    title="Open Logs Folder"
                    disabled={isLoadingList}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded text-2xl font-minecraft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon icon="pixelarticons:folder" className="w-4 h-4" />
                    open folder
                </button>
            )}
        </div>
        {/* Right side: Controls */}
        <div className="flex items-center gap-2">
            {/* Log Selector Dropdown */}
            <select
                value={selectedLogPath ?? ''}
                onChange={handleLogSelect}
                disabled={isLoadingList || logFiles.length === 0}
                className="bg-black/30 border border-white/20 rounded px-3 py-1.5 text-white font-minecraft text-2xl lowercase w-48 disabled:opacity-50"
            >
                <option value="" disabled={!!selectedLogPath}>-- Select Log --</option>
                {logFiles.map((path) => (
                    <option key={path} value={path}>{getFilename(path)}</option>
                ))}
            </select>

            {/* Copy Button */}
            <button
                onClick={handleCopyLog}
                disabled={!rawLogContentForCopy || isLoadingContent || copied}
                title="Copy full log content to clipboard"
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-2xl font-minecraft transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    copied
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white/90 hover:text-white'
                }`}
            >
                <Icon icon={copied ? "pixelarticons:check" : "pixelarticons:copy"} className="w-4 h-4" />
                {copied ? 'copied!' : 'copy log'}
            </button>

            {/* Upload Button & Status */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handleUploadLog}
                    disabled={!rawLogContentForCopy || isLoadingContent || isUploading}
                    title="Upload selected log to mclo.gs"
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-2xl font-minecraft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon icon="pixelarticons:upload" className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'upload log'}
                </button>
                {uploadUrl && (
                    <a
                        href={uploadUrl}
                        onClick={(e) => { e.preventDefault(); handleOpenUrl(uploadUrl); }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 underline text-xs font-minecraft"
                        title={`Open ${uploadUrl}`}
                    >
                        mclo.gs link
                    </a>
                )}
                {uploadError && (
                    <span className="text-red-400 text-xs font-minecraft" title={uploadError}>Upload Failed!</span>
                )}
            </div>
        </div>
      </div>

      {/* Loading/Error for List */}
      {isLoadingList && (
        <div className="flex-grow flex justify-center items-center">
          <LoadingSpinner />
        </div>
      )}
      {errorList && !isLoadingList && (
        <div className="flex-grow flex justify-center items-center p-4">
          <div className="p-4 text-red-400 font-minecraft text-base bg-red-900/30 rounded">
            Error loading logs: {errorList}
          </div>
        </div>
      )}

      {/* Main Content Area (Filters + Viewer) - Only show if list loaded ok and no error */}
      {!isLoadingList && !errorList && (
         <div className="flex flex-col flex-grow min-h-0"> {/* Allows content below to scroll */}

           {/* Filter Controls - Only show if a log is selected and parsed */}
           {selectedLogPath && parsedLogLines.length > 0 && (
             <div className="flex items-center gap-4 mb-3 px-1 flex-shrink-0">
                {/* Search Input */}
                <div className="relative flex-grow max-w-xs">
                     <Icon icon="pixelarticons:search" className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"/>
                     <input
                        type="text"
                        placeholder="Filter lines..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        disabled={isLoadingContent}
                        className="w-full bg-black/30 border border-white/20 rounded pl-8 pr-2 py-1 text-white placeholder:text-white/40 text-2xl font-minecraft focus:outline-none focus:border-white/40"
                    />
                </div>
                {/* Level Filters */}
                <div className="flex items-center gap-1.5">
                    <span className="text-white/60 font-minecraft text-xs mr-1">Levels:</span>
                    {LOG_LEVELS.map((level) => (
                        <label
                            key={level}
                             className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border cursor-pointer transition-colors text-2xl font-minecraft lowercase ${
                                levelFilters[level]
                                ? `${getLevelBgClass(level)} text-white/90`
                                : 'bg-black/20 border-white/20 text-white/50 hover:bg-white/10 hover:border-white/30 hover:text-white/70'
                            }`}
                        >
                        <input
                            type="checkbox"
                            checked={levelFilters[level]}
                            onChange={(e) => handleLevelFilterChange(level, e.target.checked)}
                            className="hidden" // Hide checkbox, style label
                        />
                        {level}
                        </label>
                    ))}
                </div>
             </div>
           )}

           {/* Log Viewer Area */}
           <div className="flex-grow bg-black/50 rounded overflow-hidden relative border border-white/10">
             {/* Loading Overlay */}
             {isLoadingContent && (
               <div className="absolute inset-0 flex justify-center items-center bg-black/60 z-10">
                 <LoadingSpinner />
               </div>
             )}
             {/* Default Empty State (No log selected) */}
             {!selectedLogPath && !isLoadingContent && (
               <EmptyState
                 icon="pixelarticons:folder-open"
                 message="Select a log file above to view its content."
               />
             )}
             {/* Content Loading Error */}
             {selectedLogPath && !isLoadingContent && errorContent && (
                 <div className="flex justify-center items-center h-full p-4">
                    <div className="p-4 text-red-400 font-minecraft text-base bg-red-900/30 rounded">
                         Error loading content: {errorContent}
                    </div>
                 </div>
             )}
             {/* Empty Log File */}
             {selectedLogPath && !isLoadingContent && !errorContent && parsedLogLines.length === 0 && (
                <EmptyState
                    icon="pixelarticons:file"
                    message="Log file appears to be empty."
                />
             )}
             {/* No Lines Match Filter */}
             {selectedLogPath && !isLoadingContent && !errorContent && parsedLogLines.length > 0 && displayLines.length === 0 && (
                 <EmptyState
                    icon="pixelarticons:filter"
                    message="No log lines match the current filters."
                />
             )}
             {/* Actual Log Lines */}
             {selectedLogPath && !isLoadingContent && !errorContent && displayLines.length > 0 && (
               <div className="p-3 font-mono text-xs h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent whitespace-pre-wrap">
                 {displayLines.map((line) => (
                   <div key={line.id} className="flex flex-nowrap items-start">
                     {line.timestamp ? (
                       <>
                         <span className={`pr-2 select-none ${getLevelColorClass(line.level)}`}>
                           <span className="opacity-80">[{line.timestamp}]</span>
                           <span className="opacity-80 ml-1">[{line.thread}/{line.level ?? '-'}]</span>
                         </span>
                         {/* Keep main text white, EXCEPT for WARN and ERROR */}
                         <span className={`flex-1 ${(line.level === 'ERROR' || line.level === 'WARN') ? getLevelColorClass(line.level) : 'text-white/90'}`}>
                            {line.text}
                         </span>
                       </>
                     ) : (
                       // Fallback for lines without standard format (e.g., stack traces)
                       <span className={`flex-1 pl-1 ${(line.level === 'ERROR' || line.level === 'WARN') ? getLevelColorClass(line.level) : 'text-white/90'}`}>
                         {line.text}
                       </span>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div> {/* End Log Viewer Area */}
         </div> // End Main Content Area
      )} {/* End Conditional Render */}
    </div> // End Root Div
  );
}
