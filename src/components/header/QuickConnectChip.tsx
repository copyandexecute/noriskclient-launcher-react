"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface ServerInfo {
  name: string;
  address: string;
  icon?: string;
  playerCount?: number;
}

interface QuickConnectChipProps {
  servers: ServerInfo[];
  className?: string;
  onServerSelect?: (server: ServerInfo) => void;
}

export function QuickConnectChip({
  servers,
  className,
  onServerSelect,
}: QuickConnectChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayedServers = servers.slice(0, 3);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(chipRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      ctx.revert();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleServerClick = (server: ServerInfo) => {
    setSelectedServer(server);
    if (onServerSelect) {
      onServerSelect(server);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <div
        ref={chipRef}
        className={cn(
          "flex items-center gap-3 bg-black/50 border-2 border-white/30 hover:border-white/50 transition-colors duration-300 cursor-pointer backdrop-blur-md",
          "h-10 px-4 py-1 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(0,0,0,0.4)]",
          selectedServer ? "border-t-4 border-t-white" : "",
        )}
        onClick={toggleDropdown}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <Icon icon="pixel:external-link-solid" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-white font-minecraft uppercase text-shadow-sm">
              {selectedServer ? selectedServer.name : "Quick Connect"}
            </span>
            {selectedServer && (
              <span className="text-xs text-white/70 font-minecraft text-shadow-sm">
                {selectedServer.address}
              </span>
            )}
          </div>
        </div>

        {!selectedServer && (
          <div className="flex -space-x-2">
            {displayedServers.map((server, index) => (
              <div
                key={index}
                className="w-7 h-7 bg-black/40 border border-white/30 flex items-center justify-center"
                title={server.name}
              >
                {server.icon ? (
                  <img
                    src={server.icon}
                    alt={server.name}
                    className="w-5 h-5"
                  />
                ) : (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Icon
                      icon="pixel:external-link-solid"
                      className="w-4 h-4"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="w-5 h-5 text-white/70">
          <Icon
            icon={
              isOpen ? "pixel:chevron-up-solid" : "pixel:chevron-down-solid"
            }
            className="w-4 h-4"
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-black/70 backdrop-blur-md border-2 border-white/30 shadow-[0_0_20px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
          <div className="p-3 border-b-2 border-white/30">
            <h3 className="text-sm font-minecraft text-white/80 uppercase">
              RECENT SERVERS
            </h3>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {servers.map((server, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 hover:bg-white/15 cursor-pointer transition-colors",
                  selectedServer?.name === server.name
                    ? "bg-white/25 border-l-4 border-l-white"
                    : "",
                )}
                onClick={() => handleServerClick(server)}
              >
                <div className="w-10 h-10 bg-black/40 flex items-center justify-center border-2 border-white/30">
                  {server.icon ? (
                    <img
                      src={server.icon || "/placeholder.svg"}
                      alt={server.name}
                      className="w-7 h-7"
                    />
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Icon
                        icon="pixel:external-link-solid"
                        className="w-5 h-5"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-minecraft text-white truncate uppercase">
                    {server.name}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {server.address}
                  </div>
                </div>
                {server.playerCount !== undefined && (
                  <div className="text-xs text-white/80 font-minecraft flex items-center gap-1">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Icon icon="pixel:user-solid" className="w-4 h-4" />
                    </div>
                    <span>{server.playerCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t-2 border-white/30">
            <button className="w-full py-2 px-3 bg-black/50 hover:bg-black/70 text-white text-sm font-minecraft transition-colors border-2 border-white/30 backdrop-blur-md shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(0,0,0,0.4)] uppercase">
              ADD SERVER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
