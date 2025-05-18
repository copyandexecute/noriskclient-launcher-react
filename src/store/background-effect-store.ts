import { create } from "zustand";
import { persist } from "zustand/middleware";

export const BACKGROUND_EFFECTS = {
  MATRIX_RAIN: "matrix_rain",
  ENCHANTMENT_PARTICLES: "enchantment_particles",
  NEBULA_WAVES: "nebula_waves",
  NEBULA_PARTICLES: "nebula_particles",
  NEBULA_GRID: "nebula_grid",
  NEBULA_VOXELS: "nebula_voxels",
  NEBULA_LIGHTNING: "nebula_lightning",
  NEBULA_LIQUID_CHROME: "nebula_liquid_chrome",
  RETRO_GRID: "retro_grid",
};

interface BackgroundEffectState {
  currentEffect: string;
  setCurrentEffect: (effect: string) => void;
}

export const useBackgroundEffectStore = create<BackgroundEffectState>()(
  persist(
    (set) => ({
      currentEffect: BACKGROUND_EFFECTS.MATRIX_RAIN,
      setCurrentEffect: (effect) => set({ currentEffect: effect }),
    }),
    {
      name: "norisk-background-effect-storage",
    },
  ),
);
