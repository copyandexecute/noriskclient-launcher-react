"use client";

import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
import { EmptyState } from "../ui/EmptyState";

export function StoreTab() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabHeader title="Store" icon="pixel:shopping-cart-solid" />
      <TabContent>
        <EmptyState
          icon="pixel:shopping-cart-solid"
          message="Store Coming Soon"
        />
      </TabContent>
    </div>
  );
}
