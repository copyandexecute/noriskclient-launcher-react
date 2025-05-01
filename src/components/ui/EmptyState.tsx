import { Icon } from "@iconify/react";

interface EmptyStateProps {
  message: string;
  icon?: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center select-none">
      {icon && <Icon icon={icon} className="w-16 h-16 text-white/30 mb-6" />}
      <p className="text-2xl text-white/70 font-minecraft mb-6 tracking-wide lowercase">
        {message}
      </p>
      {action}
    </div>
  );
}
