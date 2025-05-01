"use client";

import { EmptyState } from "../ui/EmptyState";
import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";

export function NewsTab() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader title="News" icon="pixel:newspaper" />
      <TabContent>
        <EmptyState message="News Comming Soon" icon="pixel:newspaper" />
      </TabContent>
    </div>
  );
}
