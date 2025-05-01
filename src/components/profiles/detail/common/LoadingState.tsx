import { Icon } from "@iconify/react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin mr-2">
        <Icon icon="pixel:loading-solid" className="w-6 h-6 text-white" />
      </div>
      <span className="text-white font-minecraft">{message}</span>
    </div>
  );
}
