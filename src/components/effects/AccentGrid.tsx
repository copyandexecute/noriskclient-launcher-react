"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";

interface AccentGridProps {
  opacity?: number;
  speed?: number;
  gridSize?: number;
  className?: string;
}

export default function AccentGrid({
  opacity = 0.15,
  speed = 1,
  gridSize = 30,
  className = "",
}: AccentGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

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

    const renderGrid = () => {
      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      const cellSize = gridSize;
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;

      const offsetX = (time * speed * 0.5) % cellSize;
      const offsetY = (time * speed * 0.3) % cellSize;

      for (let y = 0; y < rows; y++) {
        const posY = y * cellSize - offsetY;

        ctx.beginPath();
        ctx.moveTo(0, posY);
        ctx.lineTo(width, posY);

        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(y * 0.1 + time * 0.001));
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x++) {
        const posX = x * cellSize - offsetX;

        ctx.beginPath();
        ctx.moveTo(posX, 0);
        ctx.lineTo(posX, height);

        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(x * 0.1 + time * 0.001));
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const posX = x * cellSize - offsetX;
          const posY = y * cellSize - offsetY;

          const pulse =
            0.5 + 0.5 * Math.sin(x * 0.5 + y * 0.5 + time * 0.003 * speed);
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
    renderGrid();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, opacity, speed, gridSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
