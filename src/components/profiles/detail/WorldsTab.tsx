"use client";

import { Icon } from "@iconify/react";

export function WorldsTab() {
  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-minecraft text-lg lowercase">Worlds</h2>
        <button className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-4 py-2 text-white font-minecraft text-sm flex items-center gap-2">
          <Icon icon="pixel:refresh-solid" className="w-4 h-4" />
          <span>refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-black/20 border-2 border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-black/30 flex items-center justify-center">
                <Icon icon="pixel:globe" className="w-8 h-8 text-white/50" />
              </div>
              <div>
                <h3 className="text-white font-minecraft text-base">
                  World {i}
                </h3>
                <p className="text-white/60 text-sm">Survival Mode</p>
              </div>
            </div>
            <div className="text-white/50 text-sm mb-3">Last played: Never</div>
            <div className="flex gap-2">
              <button className="bg-black/20 hover:bg-black/30 border border-white/30 px-3 py-1 text-white/80 text-xs font-minecraft">
                Play
              </button>
              <button className="bg-black/20 hover:bg-black/30 border border-white/30 px-3 py-1 text-white/80 text-xs font-minecraft">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-12">
        <p className="text-white/40 font-minecraft text-base lowercase drop-shadow">
          World management coming soon
        </p>
      </div>
    </div>
  );
}
