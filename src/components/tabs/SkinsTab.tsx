"use client";

import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
import { EmptyState } from "../ui/EmptyState";

export function SkinsTab() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader title="Skins" icon="pixel:user-solid" />
      <TabContent>
        <EmptyState
          icon="pixel:user-solid"
          message="Skin Management Coming Soon"
        />
      </TabContent>
    </div>
  );
}
