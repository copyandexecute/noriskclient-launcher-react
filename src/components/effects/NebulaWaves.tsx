"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface NebulaWavesProps {
  opacity?: number;
  speed?: number;
  className?: string;
  particleCount?: number;
}

export function NebulaWaves({
  opacity = 0.15,
  speed = 1,
  className = "",
  particleCount = 100,
}: NebulaWavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { qualityLevel } = useQualitySettingsStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const qualityMultiplier =
      qualityLevel === "low" ? 0.5 : qualityLevel === "high" ? 1.5 : 1;
    const adjustedSpeed = speed * qualityMultiplier;
    const waveCount =
      qualityLevel === "low" ? 2 : qualityLevel === "high" ? 4 : 3;

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
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const renderWaves = () => {
      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      const baseAmplitude = height / 6;

      for (let i = 0; i < waveCount; i++) {
        const amplitude = baseAmplitude * (1 - i * 0.2);
        const frequency = 0.005 + i * 0.002;
        const speed =
          0.0015 * (i + 1) * window.devicePixelRatio * adjustedSpeed;
        const yOffset = height * 0.5 + i * 20;

        ctx.beginPath();

        const waveOpacity = opacity * (1 - i * 0.2);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${waveOpacity})`;
        ctx.lineWidth = 3 - i * 0.5;

        for (let x = 0; x <= width; x += 5) {
          const y =
            Math.sin(x * frequency + time * speed) * amplitude + yOffset;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      time += adjustedSpeed;
      animationFrameId = requestAnimationFrame(renderWaves);
    };

    window.addEventListener("resize", resize);
    resize();
    renderWaves();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, opacity, speed, qualityLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ opacity }}
    />
  );
}
