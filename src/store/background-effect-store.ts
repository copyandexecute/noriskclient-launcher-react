import { create } from "zustand";

export const BACKGROUND_EFFECTS = {
  MATRIX_RAIN: "matrix_rain",
  ENCHANTMENT_PARTICLES: "enchantment_particles",
  ACCENT_WAVES: "accent_waves",
  ACCENT_PARTICLES: "accent_particles",
  ACCENT_GRID: "accent_grid",
  ACCENT_VOXELS: "accent_voxels",
  ACCENT_LIGHTNING: "accent_lightning",
  ACCENT_LIQUID_CHROME: "accent_liquid_chrome",
};

interface BackgroundEffectState {
  currentEffect: string;
  setCurrentEffect: (effect: string) => void;
}

export const useBackgroundEffectStore = create<BackgroundEffectState>(
  (set) => ({
    currentEffect: BACKGROUND_EFFECTS.MATRIX_RAIN,
    setCurrentEffect: (effect) => set({ currentEffect: effect }),
  }),
);
