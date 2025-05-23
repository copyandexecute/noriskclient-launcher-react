"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface NebulaGridProps {
  opacity?: number;
  speed?: number;
  gridSize?: number;
  className?: string;
}

export function NebulaGrid({
  opacity = 0.15,
  speed = 1,
  gridSize = 30,
  className = "",
}: NebulaGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(canvas);

    let animationFrameId: number;
    let time = 0;
    let lastFrameTime = 0;

    const qualityMultiplier =
      qualityLevel === "low" ? 0.3 : qualityLevel === "high" ? 0.8 : 0.5;
    const adjustedSpeed = speed * qualityMultiplier;
    const adjustedGridSize =
      qualityLevel === "low"
        ? gridSize * 1.5
        : qualityLevel === "high"
          ? gridSize * 0.7
          : gridSize;
    const targetFps =
      qualityLevel === "low" ? 20 : qualityLevel === "high" ? 30 : 24;
    const frameInterval = 1000 / targetFps;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(accentColor.value);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const renderGrid = (timestamp: number) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(renderGrid);
        return;
      }

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationFrameId = requestAnimationFrame(renderGrid);
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);

      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      const cellSize = adjustedGridSize;
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;

      const offsetX = (time * adjustedSpeed * 0.5) % cellSize;
      const offsetY = (time * adjustedSpeed * 0.3) % cellSize;

      for (let y = 0; y < rows; y++) {
        const posY = y * cellSize - offsetY;
        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(y * 0.1 + time * 0.001));

        ctx.beginPath();
        ctx.moveTo(0, posY);
        ctx.lineTo(width, posY);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x++) {
        const posX = x * cellSize - offsetX;
        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(x * 0.1 + time * 0.001));

        ctx.beginPath();
        ctx.moveTo(posX, 0);
        ctx.lineTo(posX, height);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x += 2) {
        for (let y = 0; y < rows; y += 2) {
          const posX = x * cellSize - offsetX;
          const posY = y * cellSize - offsetY;
          const pulse =
            0.5 +
            0.5 * Math.sin(x * 0.5 + y * 0.5 + time * 0.003 * adjustedSpeed);
          const dotSize = 2 * pulse;
          const dotOpacity = opacity * pulse;

          ctx.beginPath();
          ctx.arc(posX, posY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dotOpacity})`;
          ctx.fill();
        }
      }

      time += 1;
      animationFrameId = requestAnimationFrame(renderGrid);
    };

    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(renderGrid);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, opacity, speed, gridSize, qualityLevel, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
