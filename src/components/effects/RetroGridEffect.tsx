import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface RetroGridEffectProps {
  className?: string;
  style?: React.CSSProperties;
  renderMode?: "top" | "bottom" | "both";
  perspective?: string;
  gridBackgroundColor?: string;
  customGridLineColor?: string;
  isAnimationEnabled?: boolean;
}

export function RetroGridEffect({
  className,
  style,
  renderMode = "both",
  perspective = "150px",
  gridBackgroundColor,
  customGridLineColor,
  isAnimationEnabled = true,
}: RetroGridEffectProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateTime = useRef<number>(0);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const now = Date.now();
      if (now - lastUpdateTime.current < 100) return;
      lastUpdateTime.current = now;

      const isIntersecting = entries[0].isIntersecting;
      if (isVisible !== isIntersecting) {
        setIsVisible(isIntersecting);
      }
    },
    [isVisible],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "50px",
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [handleIntersection]);

  const gridLineColor = useMemo(
    () => customGridLineColor || `${accentColor.value}80`,
    [customGridLineColor, accentColor.value],
  );

  const effectiveGridBackgroundColor = useMemo(() => {
    if (gridBackgroundColor !== undefined) return gridBackgroundColor;
    const r = Number.parseInt(accentColor.value.slice(1, 3), 16);
    const g = Number.parseInt(accentColor.value.slice(3, 5), 16);
    const b = Number.parseInt(accentColor.value.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0)`;
  }, [gridBackgroundColor, accentColor.value]);

  const gridSize = useMemo(
    () =>
      qualityLevel === "low"
        ? "80px 40px"
        : qualityLevel === "high"
          ? "40px 20px"
          : "60px 30px",
    [qualityLevel],
  );

  const animationDuration = useMemo(
    () =>
      qualityLevel === "low" ? "20s" : qualityLevel === "high" ? "12s" : "15s",
    [qualityLevel],
  );

  const baseGridStyles: React.CSSProperties = useMemo(
    () => ({
      width: "150%",
      height: "60%",
      backgroundImage: `
      linear-gradient(to right, ${gridLineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)
    `,
      backgroundSize: gridSize,
      position: "absolute",
      left: "-25%",
      pointerEvents: "none",
      willChange: "transform", // GPU hint
      backfaceVisibility: "hidden", // GPU hint
      transform: "translate3d(0,0,0)", // Force GPU acceleration
    }),
    [gridLineColor, gridSize],
  );

  const bottomGridStyle: React.CSSProperties = useMemo(
    () => ({
      ...baseGridStyles,
      transform: "translate3d(0,0,0) rotateX(140deg)",
      bottom: "-10%",
      animation:
        isAnimationEnabled && isVisible
          ? `moveGrid ${animationDuration} linear infinite`
          : "none",
      WebkitMaskImage:
        "linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
      maskImage:
        "linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
    }),
    [baseGridStyles, isAnimationEnabled, isVisible, animationDuration],
  );

  const topGridStyle: React.CSSProperties = useMemo(
    () => ({
      ...baseGridStyles,
      transform: "translate3d(0,0,0) rotateX(-140deg)",
      top: "-10%",
      animation:
        isAnimationEnabled && isVisible
          ? `moveGridReverse ${animationDuration} linear infinite`
          : "none",
      WebkitMaskImage:
        "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
      maskImage:
        "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 60%)",
    }),
    [baseGridStyles, isAnimationEnabled, isVisible, animationDuration],
  );

  const keyframes = `
    @keyframes moveGrid {
      0% { transform: translate3d(0,0,0) rotateX(140deg); background-position-y: 0; }
      100% { transform: translate3d(0,0,0) rotateX(140deg); background-position-y: -200px; }
    }
    @keyframes moveGridReverse {
      0% { transform: translate3d(0,0,0) rotateX(-140deg); background-position-y: -200px; }
      100% { transform: translate3d(0,0,0) rotateX(-140deg); background-position-y: 0; }
    }
  `;

  if (qualityLevel === "low" && !isAnimationEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: effectiveGridBackgroundColor,
        perspective: perspective,
        zIndex: 0,
        willChange: "transform",
        backfaceVisibility: "hidden",
        transform: "translate3d(0,0,0)",
        ...style,
      }}
    >
      <style>{keyframes}</style>
      {(renderMode === "top" || renderMode === "both") && (
        <div style={topGridStyle}></div>
      )}
      {(renderMode === "bottom" || renderMode === "both") && (
        <div style={bottomGridStyle}></div>
      )}
    </div>
  );
}
