"use client";

import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
import { EmptyState } from "../ui/EmptyState";

export function SettingsTab() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader title="Settings" icon="pixel:cog-solid" />
      <TabContent>
        <EmptyState icon="pixel:cog-solid" message="Settings Coming Soon" />
      </TabContent>
    </div>
  );
}
