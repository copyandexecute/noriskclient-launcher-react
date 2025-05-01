"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { EmptyState } from "./common/EmptyState";

interface LogsTabProps {
  profile: Profile;
}
// @ts-ignore
export function LogsTab({ profile }: LogsTabProps) {
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
    <div className="h-full flex">
      <div className="w-64 border-r-2 border-white/20 pr-4">
        <h3 className="text-white font-minecraft text-base mb-4 lowercase">
          Log Files
        </h3>
        <div className="space-y-2">
          {logTypes.map((logType) => (
            <button
              key={logType.id}
              className={`w-full text-left py-2 px-3 font-minecraft text-sm lowercase flex items-center gap-2 ${
                activeLogType === logType.id
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveLogType(logType.id)}
            >
              <Icon icon={logType.icon} className="w-4 h-4" />
              <span>{logType.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pl-4">
        <EmptyState
          icon="pixel:file-text"
          title="Log Viewer"
          description="Coming soon"
          // @ts-ignore
          actionLabel={null}
        />
      </div>
    </div>
  );
}
