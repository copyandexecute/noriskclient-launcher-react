import { Icon } from "@iconify/react";

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({
  message,
  icon = "pixel:grid-solid",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Icon icon={icon} className="w-16 h-16 text-white/30 mb-3" />
      <p className="text-white/60 font-minecraft text-lg text-center">
        {message}
      </p>
    </div>
  );
}
