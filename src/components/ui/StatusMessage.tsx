import { Icon } from "@iconify/react";

type StatusType = "error" | "success" | "warning" | "info";

interface StatusMessageProps {
  type: StatusType;
  message: string;
  className?: string;
}

export function StatusMessage({ type = "info", message }: StatusMessageProps) {
  if (!message) return null;

  const typeConfig = {
    info: {
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-500/40",
      textColor: "text-blue-400",
      icon: "pixel:info-circle-solid",
    },
    success: {
      bgColor: "bg-green-900/20",
      borderColor: "border-green-500/40",
      textColor: "text-green-400",
      icon: "pixel:check-circle-solid",
    },
    warning: {
      bgColor: "bg-yellow-900/20",
      borderColor: "border-yellow-500/40",
      textColor: "text-yellow-400",
      icon: "pixel:exclamation-triangle-solid",
    },
    error: {
      bgColor: "bg-red-900/20",
      borderColor: "border-red-500/40",
      textColor: "text-red-400",
      icon: "pixel:exclamation-circle-solid",
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`p-4 mb-6 ${config.bgColor} border ${config.borderColor} rounded-md flex items-start select-none`}
    >
      <Icon
        icon={config.icon}
        className={`w-6 h-6 ${config.textColor} mr-3 mt-1 flex-shrink-0`}
      />
      <div
        className={`${config.textColor} text-xl font-minecraft tracking-wide`}
      >
        {message}
      </div>
    </div>
  );
}
