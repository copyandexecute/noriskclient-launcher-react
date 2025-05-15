"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";

interface MatrixRainEffectProps {
  opacity?: number;
  speed?: number;
  className?: string;
}

export default function MatrixRainEffect({
  opacity = 0.15,
  speed = 1,
  className,
}: MatrixRainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );

  useEffect(() => {
    if (!isBackgroundAnimationEnabled) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const FONT_SIZE = 16;
    const CHARACTERS =
      "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charactersArray = CHARACTERS.split("");
    const RAINDROP_SPAWN_RATE = 0.99;

    let columns: number;
    let drops: {
      x: number;
      y: number;
      trail: number;
      speed: number;
      ticksLeft: number;
      brightness: number;
      pulse: number;
      pulseFactor: number;
    }[];
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

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.scale(dpr, dpr);

      columns = Math.floor(canvas.width / FONT_SIZE);
      drops = Array(columns)
        .fill(null)
        .map((_, i) => ({
          x: i * FONT_SIZE,
          y: Math.random() * -100,
          trail: Math.floor(
            Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
          ),
          speed: (Math.random() * 1 + 0.5) * speed,
          ticksLeft: 0,
          brightness: Math.random() * 0.5 + 0.5,
          pulse: Math.random(),
          pulseFactor: Math.random() * 0.02 + 0.005,
        }));
    };

    resize();
    window.addEventListener("resize", resize);
    context.font = `${FONT_SIZE}px monospace`;

    let animationFrameId: number;

    const draw = () => {
      const rgb = hexToRgb(accentColor.value);

      context.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 40;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

      // Draw subtle grid lines
      for (let y = 0; y < rows; y++) {
        const posY = y * gridSize;
        const lineOpacity =
          opacity * 0.2 * (0.3 + 0.7 * Math.sin(y * 0.1 + time * 0.001));

        context.beginPath();
        context.moveTo(0, posY);
        context.lineTo(canvas.width, posY);
        context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        context.lineWidth = 0.5;
        context.stroke();
      }

      for (let x = 0; x < cols; x++) {
        const posX = x * gridSize;
        const lineOpacity =
          opacity * 0.2 * (0.3 + 0.7 * Math.sin(x * 0.1 + time * 0.001));

        context.beginPath();
        context.moveTo(posX, 0);
        context.lineTo(posX, canvas.height);
        context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        context.lineWidth = 0.5;
        context.stroke();
      }

      // Draw matrix characters
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];

        // Update pulse
        drop.pulse += drop.pulseFactor;
        if (drop.pulse > 1) drop.pulse = 0;

        const pulseBrightness = 0.5 + 0.5 * Math.sin(Math.PI * 2 * drop.pulse);
        const colorAlpha = drop.brightness * pulseBrightness * opacity * 2;

        // Draw head character with brighter color
        const headChar =
          charactersArray[Math.floor(Math.random() * charactersArray.length)];
        context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, colorAlpha * 3)})`;
        context.fillText(headChar, drop.x, drop.y);

        // Draw trail characters with fading opacity
        for (let j = 1; j < drop.trail; j++) {
          if (drop.y - j * FONT_SIZE < 0) continue;

          const trailChar =
            charactersArray[Math.floor(Math.random() * charactersArray.length)];
          const trailOpacity = colorAlpha * (1 - j / drop.trail);

          context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${trailOpacity})`;
          context.fillText(trailChar, drop.x, drop.y - j * FONT_SIZE);
        }

        // Move drop
        drop.y += drop.speed;

        // Reset drop when it reaches bottom
        if (drop.y > canvas.height && Math.random() > RAINDROP_SPAWN_RATE) {
          drops[i] = {
            x: i * FONT_SIZE,
            y: Math.random() * -100,
            trail: Math.floor(
              Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
            ),
            speed: (Math.random() * 1 + 0.5) * speed,
            ticksLeft: 0,
            brightness: Math.random() * 0.5 + 0.5,
            pulse: Math.random(),
            pulseFactor: Math.random() * 0.02 + 0.005,
          };
        }
      }

      time += 1;
      animationFrameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [opacity, speed, accentColor.value, isBackgroundAnimationEnabled]);

  if (!isBackgroundAnimationEnabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  );
}