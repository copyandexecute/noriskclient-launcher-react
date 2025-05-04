"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { EmptyState } from "./common/EmptyState";
import { LoadingSpinner } from "../../ui/LoadingSpinner";
// Import from the new service
import {
    type LogLevel,
    type ParsedLogLine,
    LOG_LEVELS,
    parseLogLinesFromString,
    getProfileLogFiles,
    getLogFileContent,
    uploadLogToMclogs,
    openLogFileDirectory,
} from "../../../services/log-service";
// Import the new reusable component
import { LogViewerDisplay } from "../../log/LogViewerDisplay";

interface LogsTabProps {
  profile: Profile;
}

function getFilename(path: string | null): string {
  if (!path) return '';
  return path.split(/[\\\/]/).pop() || path;
}

export function LogsTab({ profile }: LogsTabProps) {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  const [selectedLogPath, setSelectedLogPath] = useState<string | null>(null);
  const [parsedLogLines, setParsedLogLines] = useState<ParsedLogLine[]>([]);
  const [rawLogContentForCopy, setRawLogContentForCopy] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
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
      setSearchTerm('');
      setUploadUrl(null);
      setUploadError(null);
      setCopied(false);

      try {
        const paths = await getProfileLogFiles(profile.id);
        // Sort: latest.log first, then reverse alpha
        paths.sort((a, b) => {
          const aName = getFilename(a).toLowerCase();
          const bName = getFilename(b).toLowerCase();
          if (aName === 'latest.log') return -1;
          if (bName === 'latest.log') return 1;
          if (typeof aName === 'string' && typeof bName === 'string') {
            return bName.localeCompare(aName);
          }
          return 0;
        });
        setLogFiles(paths);
        console.log(`[LogsTab] Found ${paths.length} log files.`);

        // Automatically select latest.log or the first log if available
        if (paths.length > 0) {
          setSelectedLogPath(paths[0]); 
          console.log(`[LogsTab] Automatically selected log: ${paths[0]}`);
        } else {
            setSelectedLogPath(null); // Ensure it's null if no logs found
        }

      } catch (err: any) {
        console.error('[LogsTab] Error fetching log files:', err);
        setErrorList(err?.message ?? 'Failed to load log files');
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

        try {
          const rawContent = await getLogFileContent(selectedLogPath);
          setRawLogContentForCopy(rawContent);

          // Call the new parsing function
          const processedLines = parseLogLinesFromString(rawContent);

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

  }, [selectedLogPath]);

  useEffect(() => {
    const filteredLines = parsedLogLines.filter(line => {
      const levelMatch = !line.level || (levelFilters[line.level] && line.level !== 'TRACE');
      const searchMatch = !searchTerm || line.raw.toLowerCase().includes(searchTerm.toLowerCase().trim());
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
    if (displayLines.length === 0) return; 
    
    const filteredLogContent = displayLines.map(line => line.raw).join('\n');

    try {
      await writeText(filteredLogContent);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => { setCopied(false); }, 2000);
    } catch (err) {
      console.error('[LogsTab] Failed to copy log to clipboard:', err);
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
      setUploadError(err?.message ?? 'Failed to upload log');
    } finally {
      setIsUploading(false);
    }
  }, [rawLogContentForCopy, selectedLogPath]);

  const handleOpenLogsFolder = useCallback(async () => {
    const path_to_open = logFiles.find(p => getFilename(p).toLowerCase() === 'latest.log') || logFiles[0];
    if (!path_to_open) {
      setErrorList('No log files found to determine folder path.');
      return;
    }
    try {
      console.log(`[LogsTab] Requesting to open directory for file: ${path_to_open}`);
      await openLogFileDirectory(path_to_open);
    } catch (err: any) {
      console.error('[LogsTab] Error opening logs folder:', err);
      setErrorList(err?.message ?? 'Failed to open logs folder');
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
    <div className="h-full flex flex-col select-none text-sm">

      <div className="flex justify-between items-center mb-3 flex-shrink-0 px-1">
        <div className="flex items-center gap-3">
            <h3 className="text-white font-minecraft text-lg lowercase tracking-wide">
                Log Files
            </h3>
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
        </div>
        
        <div className="flex items-center gap-2">
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

      {!isLoadingList && !errorList && (
         <div className="flex flex-col flex-grow min-h-0">
           {selectedLogPath ? (
                 <LogViewerDisplay 
                     isLoading={isLoadingContent}
                     error={errorContent}
                     displayLines={displayLines}
                     parsedLogLinesCount={parsedLogLines.length}
                     searchTerm={searchTerm}
                     levelFilters={levelFilters}
                     copied={copied}
                     onSearchChange={handleSearchChange}
                     onLevelFilterChange={handleLevelFilterChange}
                     onCopyLog={handleCopyLog}
                     logLevelsDefinition={LOG_LEVELS}
                 />
             ) : (
                  // Show placeholder if no log file is selected 
                  <div className="flex-grow bg-black/50 rounded overflow-hidden relative border border-white/10">
                      <EmptyState
                          icon="pixelarticons:folder-open"
                          message="Select a log file above to view its content."
                      />
                  </div>
             )}
         </div>
      )}
    </div>
  );
}
