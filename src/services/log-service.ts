import { invoke } from "@tauri-apps/api/core";

export const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export interface ParsedLogLine {
  id: number;
  raw: string;
  timestamp?: string;
  thread?: string;
  level?: LogLevel;
  text: string;
}

// Standard format: [HH:MM:SS] [Thread/Level]: Text
const logLineRegexStandard = /^\s*\[(\d{2}:\d{2}:\d{2})\]\s+\[([^/]+)\/([^\]]+)\]:\s*(.*)$/;
// NeoForge format with source: [Timestamp] [Thread/Level] [Source]: Text
const logLineRegexNeoForgeSource = /^\s*\[([^\]]+)\]\s+\[([^/]+)\/([^\]]+)\]\s+\[[^\]]+\]:\s*(.*)$/;
// NeoForge format without source: [Timestamp] [Thread/Level]: Text
const logLineRegexNeoForgeNoSource = /^\s*\[([^\]]+)\]\s+\[([^/]+)\/([^\]]+)\]:\s*(.*)$/;

// Log4j2 XML format: <log4j:Event timestamp="ms" level="LEVEL" thread="ThreadName"><log4j:Message><![CDATA[Message]]></log4j:Message></log4j:Event>
const logLineRegexLog4jXML = /<log4j:Event.*?timestamp="(\d+)".*?level="([^"]+)".*?thread="([^"]+?)".*?>.*?<log4j:Message><!\[CDATA\[(.*?)]]><\/log4j:Message>.*?<\/log4j:Event>/is;

/**
 * Helper function to format Unix milliseconds timestamp to HH:MM:SS.
 * @param unixTimestampMs The timestamp in milliseconds since epoch.
 * @returns Formatted time string HH:MM:SS.
 */
function formatUnixMsToHHMMSS(unixTimestampMs: number): string {
  const date = new Date(unixTimestampMs);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Parses a raw log string into an array of structured log lines.
 * Handles standard Minecraft/Fabric, NeoForge, and Log4j XML log formats.
 * Inherits log levels for lines that don't match known formats (e.g., stack traces).
 * @param rawContent The raw log content as a single string.
 * @param idOffset An offset to add to the generated IDs, ensuring uniqueness across multiple calls.
 * @returns An array of ParsedLogLine objects.
 */
export function parseLogLinesFromString(rawContent: string, idOffset: number = 0): ParsedLogLine[] {
    console.log(`[parseLogLinesFromString] Input rawContent: "${rawContent}", idOffset: ${idOffset}`);
    const linesArray = rawContent.split(/\r?\n/);
    const processedLines: ParsedLogLine[] = [];
    let lastKnownLevel: LogLevel | undefined = undefined;
  
    for (let i = 0; i < linesArray.length; i++) {
      const line = linesArray[i];
      if (line.trim() === '') { // Skip empty or whitespace-only lines
        if (processedLines.length === 0 && linesArray.length === 1) {
          // If it's the *only* line and it's empty, add it as a raw empty line.
          // This handles the case where a single empty string is passed.
           processedLines.push({
             id: i + idOffset,
             raw: line,
             timestamp: undefined,
             thread: undefined,
             level: undefined,
             text: line,
           });
        }
        continue;
      }

      let match: RegExpMatchArray | null = null;
      let timestamp: string | undefined = undefined;
      let thread: string | undefined = undefined;
      let level: LogLevel | undefined = undefined;
      let text: string = line.trimEnd(); // Default text, trim end
  
      console.log(`[parseLogLinesFromString] Processing line ${i + idOffset}: "${line}"`);
  
      // Try matching standard format
      console.log(`[parseLogLinesFromString] Attempting standard regex...`);
      match = line.match(logLineRegexStandard);
      if (match) {
        console.log(`[parseLogLinesFromString] Standard regex MATCHED:`, match);
        timestamp = match[1];
        thread = match[2];
        const levelUpper = match[3].toUpperCase() as LogLevel;
        level = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
        text = match[4].trim(); // Full trim for captured text
        console.log(`[parseLogLinesFromString] Extracted (Standard): ts=${timestamp}, th=${thread}, lvl=${level}, txt=${text}`);
      } else {
        console.log(`[parseLogLinesFromString] Standard regex NO MATCH.`);
        // Try matching NeoForge with source format
        console.log(`[parseLogLinesFromString] Attempting NeoForge (source) regex...`);
        match = line.match(logLineRegexNeoForgeSource);
        if (match) {
          console.log(`[parseLogLinesFromString] NeoForge (source) regex MATCHED:`, match);
          timestamp = match[1];
          thread = match[2];
          const levelUpper = match[3].toUpperCase() as LogLevel;
          level = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
          text = match[4].trim(); // Full trim
          console.log(`[parseLogLinesFromString] Extracted (NeoForge w/ src): ts=${timestamp}, th=${thread}, lvl=${level}, txt=${text}`);
        } else {
          console.log(`[parseLogLinesFromString] NeoForge (source) regex NO MATCH.`);
           // Try matching NeoForge without source format
           console.log(`[parseLogLinesFromString] Attempting NeoForge (no source) regex...`);
           match = line.match(logLineRegexNeoForgeNoSource);
           if (match) {
              console.log(`[parseLogLinesFromString] NeoForge (no source) regex MATCHED:`, match);
              timestamp = match[1];
              thread = match[2];
              const levelUpper = match[3].toUpperCase() as LogLevel;
              level = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
              text = match[4].trim(); // Full trim
              console.log(`[parseLogLinesFromString] Extracted (NeoForge no src): ts=${timestamp}, th=${thread}, lvl=${level}, txt=${text}`);
           } else {
            console.log(`[parseLogLinesFromString] NeoForge (no source) regex NO MATCH.`);
           }
        }
      }
  
      if (!match) { // If no standard/NeoForge format matched, try XML
        console.log(`[parseLogLinesFromString] Attempting Log4j XML regex...`);
        match = line.match(logLineRegexLog4jXML);
        if (match) {
          console.log(`[parseLogLinesFromString] Log4j XML regex MATCHED:`, match);
          const unixTimestamp = parseInt(match[1], 10);
          if (!isNaN(unixTimestamp)) {
            timestamp = formatUnixMsToHHMMSS(unixTimestamp); // Format Unix ms to HH:MM:SS
          }
          const levelUpper = match[2].toUpperCase() as LogLevel;
          level = LOG_LEVELS.includes(levelUpper) ? levelUpper : undefined;
          thread = match[3];
          text = match[4].trim(); // Message from CDATA
          console.log(`[parseLogLinesFromString] Extracted (Log4j XML): ts=${timestamp}, th=${thread}, lvl=${level}, txt=${text}`);
          // Note: The 'match' variable is now the XML match, so subsequent 'if (match)' logic is fine.
        } else {
          console.log(`[parseLogLinesFromString] Log4j XML regex NO MATCH.`);
        }
      }
  
      let parsedLineObj: ParsedLogLine;
      if (match) {
        // We found a structured log line (either standard, NeoForge, or XML)
        parsedLineObj = {
          id: i + idOffset, // Apply offset
          raw: line,
          timestamp: timestamp,
          thread: thread,
          level: level,
          text: text,
        };
        lastKnownLevel = level; // Remember this level
        console.log(`[parseLogLinesFromString] SUCCESSFUL PARSE. Parsed object:`, parsedLineObj);
      } else {
        // Line does NOT match any known format - inherit level
        parsedLineObj = {
          id: i + idOffset, // Apply offset
          raw: line,
          timestamp: undefined,
          thread: undefined,
          level: lastKnownLevel, // Use the last known level
          text: text, // Already trimmed end
        };
        console.log(`[parseLogLinesFromString] NO REGEX MATCH. Inheriting level '${lastKnownLevel}'. Parsed object:`, parsedLineObj);
        // Do not update lastKnownLevel here
      }
      processedLines.push(parsedLineObj);
    }
    console.log(`[parseLogLinesFromString] Finished processing. Returning ${processedLines.length} lines.`);
    return processedLines;
  }

// --- Existing Service Functions ---

/**
 * Fetches the list of log file paths for a given profile.
 * @param profileId The ID of the profile.
 * @returns A promise that resolves to an array of log file paths.
 */
export async function getProfileLogFiles(profileId: string): Promise<string[]> {
    return await invoke<string[]>('get_profile_log_files', { profileId });
}

/**
 * Fetches the raw content of a specific log file.
 * @param logFilePath The full path to the log file.
 * @returns A promise that resolves to the raw string content of the log file.
 */
export async function getLogFileContent(logFilePath: string): Promise<string> {
    return await invoke<string>('get_log_file_content', { logFilePath });
}

/**
 * Uploads log content to mclo.gs.
 * @param logContent The raw log content to upload.
 * @returns A promise that resolves to the URL of the uploaded log.
 */
export async function uploadLogToMclogs(logContent: string): Promise<string> {
    return await invoke<string>('upload_log_to_mclogs_command', { logContent });
}

/**
 * Requests the operating system to open the directory containing the specified file path.
 * @param filePath The path to a file within the directory to open.
 * @returns A promise that resolves when the command has been invoked.
 */
export async function openLogFileDirectory(filePath: string): Promise<void> {
    await invoke('open_file_directory', { filePath });
} 