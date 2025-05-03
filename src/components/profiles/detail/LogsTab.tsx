"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { EmptyState } from "./common/EmptyState";

interface LogsTabProps {
  profile: Profile;
}

export function LogsTab({}: LogsTabProps) {
  const [activeLogType, setActiveLogType] = useState<string>("latest");

  const logTypes = [
    { id: "latest", label: "latest.log", icon: "pixel:file-text" },
    { id: "debug", label: "debug.log", icon: "pixel:file-code" },
    {
      id: "crash",
      label: "crash reports",
      icon: "pixel:exclamation-triangle-solid",
    },
  ];

  return (
    <div className="h-full flex select-none">
      <div className="w-72 border-r-2 border-white/20 pr-5">
        <h3 className="text-white font-minecraft text-lg mb-5 lowercase tracking-wide">
          log files
        </h3>
        <div className="space-y-2">
          {logTypes.map((logType) => (
            <button
              key={logType.id}
              className={`w-full text-left py-3 px-4 font-minecraft text-base lowercase flex items-center gap-3 transition-colors ${
                activeLogType === logType.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveLogType(logType.id)}
            >
              <Icon icon={logType.icon} className="w-5 h-5" />
              <span>{logType.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pl-5">
        <EmptyState icon="pixel:file-text" message="log viewer" />
      </div>
    </div>
  );
}
