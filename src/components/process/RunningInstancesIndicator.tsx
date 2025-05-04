"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import * as ProcessService from "../../services/process-service";
import type { ProcessMetadata } from "../../types/processState"; // Use actual type
import { timeAgo } from "../../utils/time-utils"; // For display
import { createPortal } from 'react-dom'; // Import createPortal

interface RunningInstancesIndicatorProps {
  className?: string;
}

export function RunningInstancesIndicator({
  className,
}: RunningInstancesIndicatorProps) {
  const [processes, setProcesses] = useState<ProcessMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null); // Track which process is being stopped
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false); // State to track mount
  // State for dynamic positioning
  const [dropdownTop, setDropdownTop] = useState<number>(0);
  const [dropdownRight, setDropdownRight] = useState<number>(0);

  const fetchProcesses = useCallback(async () => {
    // Don't set loading true on background refresh
    // setIsLoading(true); 
    setError(null);
    try {
      const fetchedProcesses = await ProcessService.getRunningProcesses();
      setProcesses(fetchedProcesses);
    } catch (err) { 
      setError("Failed to fetch processes");
      console.error(err);
      setProcesses([]); 
    } finally {
        // Only set loading false on initial load
        if (isLoading) setIsLoading(false);
    }
  }, [isLoading]); // Depend on isLoading to only set false once

  // Fetch on mount and set up polling
  useEffect(() => {
    setIsMounted(true); // Set mounted state
    fetchProcesses(); // Initial fetch
    
    const intervalId = setInterval(fetchProcesses, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [fetchProcesses]);

  // Handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleIndicatorClick = () => {
    if (!isDropdownOpen && buttonRef.current) {
      // Calculate position only when opening
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 8); // Position below button + margin
      setDropdownRight(window.innerWidth - rect.right); // Align to the right edge
      // TODO: Add resize/scroll listener to update position if needed
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const handleStopProcess = async (processId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    setStoppingId(processId);
    try {
      await ProcessService.stopProcess(processId);
      console.log("Process stopped successfully."); // Added console log as replacement
      await fetchProcesses(); // Refresh the list after stopping
    } catch (err) {
      console.error(`Failed to stop process: ${err}`); // Added console log as replacement
    } finally {
      setStoppingId(null);
    }
  };

  const handleViewLogs = async (pid: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    try {
      await ProcessService.openLogWindow(pid);
    } catch (err) {
      console.error(`Failed to open log window for PID ${pid}:`, err);
      // Optionally show a user-facing error message here
    }
  };

  const instanceCount = processes.length;

  return (
    <div className={cn("relative", className)}>
      {/* Indicator Button */}
      <div
        ref={buttonRef}
        className={cn(
          "flex items-center gap-2 bg-black/50 h-10 px-3 py-1 backdrop-blur-md cursor-pointer",
          "border-2 border-white/30 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:border-white/50 transition-colors",
          instanceCount > 0 ? "border-emerald-500/50 hover:border-emerald-500/80" : "",
        )}
        onClick={handleIndicatorClick}
        title={`${instanceCount} instance${instanceCount !== 1 ? 's' : ''} running`}
      >
        <Icon icon="pixel:monitor" className={cn("w-5 h-5", instanceCount > 0 ? "text-emerald-400" : "text-white/50")} />
        <span className={cn(
             "text-sm font-minecraft", 
             instanceCount > 0 ? "text-white" : "text-white/60",
             "whitespace-nowrap" // Prevent wrapping
        )}>
           {isLoading && instanceCount === 0 
            ? "Loading..."
            : instanceCount === 0
            ? "No instances running"
            : `${instanceCount} Instance${instanceCount !== 1 ? 's' : ''} Running`
           }
        </span>
      </div>

      {/* Dropdown List - Rendered via Portal */}
      {isMounted && isDropdownOpen && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
             // Change to fixed positioning, remove relative positioning classes
             "fixed w-72 bg-black/80 backdrop-blur-lg border-2 border-white/30 shadow-lg z-50 max-h-80 overflow-y-auto custom-scrollbar",
             // Remove top-full, right-0, mt-2 as style is now dynamic
          )}
          style={{
            top: `${dropdownTop}px`,
            right: `${dropdownRight}px`,
          }}
        >
          <div className="p-3 border-b border-white/10">
            <h4 className="font-minecraft text-white text-lg">Running Instances</h4>
          </div>
          {isLoading && processes.length === 0 ? (
             <div className="p-4 text-center text-white/70">Loading...</div>
          ) : error ? (
             <div className="p-4 text-red-400">Error: {error}</div>
          ) : processes.length === 0 ? (
            <div className="p-4 text-center text-white/60">No instances running.</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {processes.map((process) => (
                <li key={process.id} className="p-3 flex items-center justify-between gap-2 hover:bg-white/5">
                  <div className="min-w-0">
                     <p className="text-sm font-minecraft text-white truncate" title={process.profile_name || process.profile_id}>
                       {process.profile_name || `Profile ${process.profile_id.substring(0, 6)}...`}
                     </p>
                     <p className="text-xs text-white/60 mt-0.5">
                       Started: {timeAgo(new Date(process.start_time).getTime())} 
                       {/* Display state if not Running? */}
                       {typeof process.state === 'object' && 'Crashed' in process.state && 
                         <span className="text-red-500 ml-1">(Crashed)</span>}
                       {typeof process.state === 'string' && process.state !== 'Running' && 
                         <span className="text-yellow-500 ml-1">({process.state})</span>}
                     </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* View Logs Button - Use process.pid */} 
                    {process.pid && (
                      <button
                        onClick={(e) => handleViewLogs(process.pid!, e)} // Pass process.pid
                        className="p-1.5 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 rounded text-blue-300 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="View Logs"
                        aria-label="View Logs"
                      >
                        <Icon icon="pixel:document-alt-stroke" className="w-4 h-4" /> 
                      </button>
                    )}
                    <button
                      onClick={(e) => handleStopProcess(process.id, e)}
                      disabled={stoppingId === process.id}
                      className="p-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 rounded text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Stop Process"
                      aria-label="Stop Process"
                    >
                       {stoppingId === process.id ? (
                          <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
                       ) : (
                          <Icon icon="pixel:square" className="w-4 h-4" /> // Stop Icon
                       )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body // Target the document body
      )}
    </div>
  );
}

// Removed placeholder positioning function 