"use client";

import { Icon } from "@iconify/react";

export function WorldsTab() {
  return (
    <div className="h-full select-none">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white font-minecraft text-xl lowercase tracking-wide">
          worlds
        </h2>
        <button className="bg-black/20 hover:bg-black/30 backdrop-blur-md border-2 border-white/30 px-5 py-2.5 text-white font-minecraft text-base flex items-center gap-3 transition-colors">
          <Icon icon="pixel:refresh-solid" className="w-5 h-5" />
          <span>refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-black/20 border-2 border-white/20 p-5 hover:border-white/30 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-black/30 flex items-center justify-center">
                <Icon icon="pixel:globe" className="w-9 h-9 text-white/50" />
              </div>
              <div>
                <h3 className="text-white font-minecraft text-lg lowercase tracking-wide">
                  world {i}
                </h3>
                <p className="text-white/60 text-base lowercase">
                  survival mode
                </p>
              </div>
            </div>
            <div className="text-white/50 text-base mb-4">
              last played: never
            </div>
            <div className="flex gap-3">
              <button className="bg-black/20 hover:bg-black/30 border-2 border-white/30 px-4 py-1.5 text-white/80 hover:text-white text-base font-minecraft transition-colors">
                play
              </button>
              <button className="bg-black/20 hover:bg-black/30 border-2 border-white/30 px-4 py-1.5 text-white/80 hover:text-white text-base font-minecraft transition-colors">
                edit
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-16">
        <p className="text-white/40 font-minecraft text-lg lowercase drop-shadow">
          world management coming soon
        </p>
      </div>
    </div>
  );
}
