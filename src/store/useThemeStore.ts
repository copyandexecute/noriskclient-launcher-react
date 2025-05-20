import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setProfileGroupingPreference } from "../services/launcher-config-service";

export type AccentColor = {
  name: string;
  value: string;
  hoverValue: string;
  shadowValue: string;
  light: string;
  dark: string;
  isCustom?: boolean;
};

export const ACCENT_COLORS: Record<string, AccentColor> = {
  blue: {
    name: "Blue",
    value: "#4f8eff",
    hoverValue: "#3a7aff",
    shadowValue: "rgba(79, 142, 255, 0.5)",
    light: "#60a5fa",
    dark: "#2563eb",
  },
  purple: {
    name: "Purple",
    value: "#9c5fff",
    hoverValue: "#8a4aff",
    shadowValue: "rgba(156, 95, 255, 0.5)",
    light: "#a78bfa",
    dark: "#7c3aed",
  },
  green: {
    name: "Green",
    value: "#4caf50",
    hoverValue: "#3d9140",
    shadowValue: "rgba(76, 175, 80, 0.5)",
    light: "#34d399",
    dark: "#059669",
  },
  teal: {
    name: "Teal",
    value: "#26c6da",
    hoverValue: "#21b6c9",
    shadowValue: "rgba(38, 198, 218, 0.5)",
    light: "#2dd4bf",
    dark: "#0d9488",
  },
  orange: {
    name: "Orange",
    value: "#ff9800",
    hoverValue: "#e68900",
    shadowValue: "rgba(255, 152, 0, 0.5)",
    light: "#fb923c",
    dark: "#ea580c",
  },
  red: {
    name: "Red",
    value: "#f44336",
    hoverValue: "#e53935",
    shadowValue: "rgba(244, 67, 54, 0.5)",
    light: "#f87171",
    dark: "#dc2626",
  },
  yellow: {
    name: "Yellow",
    value: "#ffeb3b",
    hoverValue: "#fdd835",
    shadowValue: "rgba(255, 235, 59, 0.5)",
    light: "#fde047",
    dark: "#ca8a04",
  },
  gray: {
    name: "Gray",
    value: "#9e9e9e",
    hoverValue: "#757575",
    shadowValue: "rgba(158, 158, 158, 0.5)",
    light: "#9ca3af",
    dark: "#4b5563",
  },
  dark: {
    name: "Dark",
    value: "#424242",
    hoverValue: "#303030",
    shadowValue: "rgba(66, 66, 66, 0.5)",
    light: "#6b7280",
    dark: "#1f2937",
  },
};

const calculateColorVariants = (baseColor: string): Partial<AccentColor> => {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const darken = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return rgbToHex(
      Math.max(0, Math.floor(rgb.r * (1 - amount))),
      Math.max(0, Math.floor(rgb.g * (1 - amount))),
      Math.max(0, Math.floor(rgb.b * (1 - amount))),
    );
  };

  const lighten = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return rgbToHex(
      Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount)),
      Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount)),
      Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount)),
    );
  };

  const calculateShadow = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(0, 0, 0, 0.5)`;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  };

  return {
    value: baseColor,
    hoverValue: darken(baseColor, 0.1),
    shadowValue: calculateShadow(baseColor),
    light: lighten(baseColor, 0.2),
    dark: darken(baseColor, 0.2),
    isCustom: true,
  };
};

interface ThemeState {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  setCustomAccentColor: (hexColor: string) => void;
  applyAccentColorToDOM: () => void;
  isBackgroundAnimationEnabled: boolean;
  toggleBackgroundAnimation: () => void;
  isDetailViewSidebarOnLeft: boolean;
  toggleDetailViewSidebarPosition: () => void;
  profileGroupingCriterion: string;
  setProfileGroupingCriterion: (criterion: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: ACCENT_COLORS.blue,
      isBackgroundAnimationEnabled: false,
      isDetailViewSidebarOnLeft: true,
      profileGroupingCriterion: "none",

      setAccentColor: (color: AccentColor) => {
        set({ accentColor: color });
        get().applyAccentColorToDOM();
      },

      setCustomAccentColor: (hexColor: string) => {
        const colorVariants = calculateColorVariants(hexColor);
        const customColor: AccentColor = {
          name: "Custom",
          ...colorVariants,
        } as AccentColor;

        set({ accentColor: customColor });
        get().applyAccentColorToDOM();
      },

      toggleBackgroundAnimation: () => {
        set((state) => ({
          isBackgroundAnimationEnabled: !state.isBackgroundAnimationEnabled,
        }));
      },

      toggleDetailViewSidebarPosition: () => {
        set((state) => ({ isDetailViewSidebarOnLeft: !state.isDetailViewSidebarOnLeft }));
      },

      setProfileGroupingCriterion: async (criterion: string) => {
        try {
          await setProfileGroupingPreference(criterion);
          set({ profileGroupingCriterion: criterion });
        } catch (error) {
          console.error("Failed to save grouping preference:", error);
          set({ profileGroupingCriterion: criterion });
          throw error;
        }
      },

      applyAccentColorToDOM: () => {
        const { accentColor } = get();

        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result
            ? `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`
            : null;
        };

        document.documentElement.style.setProperty(
          "--accent",
          accentColor.value,
        );
        document.documentElement.style.setProperty(
          "--accent-hover",
          accentColor.hoverValue,
        );
        document.documentElement.style.setProperty(
          "--accent-shadow",
          accentColor.shadowValue,
        );
        document.documentElement.style.setProperty(
          "--accent-light",
          accentColor.light,
        );
        document.documentElement.style.setProperty(
          "--accent-dark",
          accentColor.dark,
        );

        const rgbValue = hexToRgb(accentColor.value);
        if (rgbValue) {
          document.documentElement.style.setProperty("--accent-rgb", rgbValue);
        }
      },
    }),
    {
      name: "norisk-theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyAccentColorToDOM();
        }
      },
    },
  ),
);
