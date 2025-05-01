import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

type StatusType = "error" | "success" | "warning" | "info";

interface StatusMessageProps {
  type: StatusType;
  message: string;
  className?: string;
}

export function StatusMessage({
  type,
  message,
  className,
}: StatusMessageProps) {
  const typeConfig = {
    error: {
      bg: "bg-red-500/20",
      border: "border-red-500/40",
      icon: "pixel:warning",
    },
    success: {
      bg: "bg-green-500/20",
      border: "border-green-500/40",
      icon: "pixel:check-circle",
    },
    warning: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/40",
      icon: "pixel:exclamation-triangle",
    },
    info: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/40",
      icon: "pixel:info-circle",
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={cn(
        "mb-6 p-4 text-white border",
        config.bg,
        config.border,
        className,
      )}
    >
      <p className="font-minecraft text-sm flex items-center gap-2">
        <Icon icon={config.icon} className="w-4 h-4" />
        {message}
      </p>
    </div>
  );
}
