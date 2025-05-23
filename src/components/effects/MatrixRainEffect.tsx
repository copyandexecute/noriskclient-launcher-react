"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface MatrixRainEffectProps {
  opacity?: number;
  speed?: number;
  className?: string;
  forceEnable?: boolean;
}
export function MatrixRainEffect({
  opacity = 0.15,
  speed = 1,
  className,
  forceEnable = false,
}: MatrixRainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const staticBackground = useThemeStore((state) => state.staticBackground);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);
  const [isPausedByFocus, setIsPausedByFocus] = useState(false);
  const isAnimating = forceEnable || !staticBackground;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(canvas);

    const FONT_SIZE = 16;
    const CHARACTERS =
      "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charactersArray = CHARACTERS.split("");
    const RAINDROP_SPAWN_RATE = 0.99;

    const qualityMultiplier =
      qualityLevel === "low" ? 0.3 : qualityLevel === "high" ? 0.8 : 0.5;
    const adjustedSpeed = speed * qualityMultiplier;
    const targetFps =
      qualityLevel === "low" ? 20 : qualityLevel === "high" ? 30 : 24;
    const frameInterval = 1000 / targetFps;

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
    let lastFrameTime = 0;

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
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.scale(dpr, dpr);

      columns = Math.floor(canvas.width / FONT_SIZE);
      drops = Array(columns)
        .fill(null)
        .map((_, i) => ({
          x: i * FONT_SIZE,
          y: staticBackground
            ? Math.random() * canvas.height
            : Math.random() * -100,
          trail: Math.floor(
            Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
          ),
          speed: (Math.random() * 1 + 0.5) * adjustedSpeed,
          ticksLeft: 0,
          brightness: Math.random() * 0.5 + 0.5,
          pulse: Math.random(),
          pulseFactor: Math.random() * 0.02 + 0.005,
        }));
    };

    resize();
    window.addEventListener("resize", resize);
    context.font = `${FONT_SIZE}px monospace`;

    const handleBlur = () => {
      if (isAnimating) {
        setIsPausedByFocus(true);
      }
    };

    const handleFocus = () => {
      if (isAnimating) {
        setIsPausedByFocus(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    let animationFrameId: number;

    const draw = (timestamp: number) => {
      if (!isVisible || isPausedByFocus) {
        animationFrameId = window.requestAnimationFrame(draw);
        return;
      }

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationFrameId = window.requestAnimationFrame(draw);
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);

      const rgb = hexToRgb(accentColor.value);

      context.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 40;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

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

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];

        drop.pulse += drop.pulseFactor;
        if (drop.pulse > 1) drop.pulse = 0;

        const pulseBrightness = 0.5 + 0.5 * Math.sin(Math.PI * 2 * drop.pulse);
        const colorAlpha = drop.brightness * pulseBrightness * opacity * 2;

        const headChar =
          charactersArray[Math.floor(Math.random() * charactersArray.length)];
        context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, colorAlpha * 3)})`;
        context.fillText(headChar, drop.x, drop.y);

        for (let j = 1; j < drop.trail; j++) {
          if (drop.y - j * FONT_SIZE < 0) continue;

          const trailChar =
            charactersArray[Math.floor(Math.random() * charactersArray.length)];
          const trailOpacity = colorAlpha * (1 - j / drop.trail);

          context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${trailOpacity})`;
          context.fillText(trailChar, drop.x, drop.y - j * FONT_SIZE);
        }

        drop.y += drop.speed;

        if (drop.y > canvas.height && Math.random() > RAINDROP_SPAWN_RATE) {
          drops[i] = {
            x: i * FONT_SIZE,
            y: staticBackground
              ? Math.random() * canvas.height
              : Math.random() * -100,
            trail: Math.floor(
              Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
            ),
            speed: (Math.random() * 1 + 0.5) * adjustedSpeed,
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

    // Initial draw call
    animationFrameId = window.requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [
    opacity,
    speed,
    accentColor.value,
    qualityLevel,
    isAnimating,
    staticBackground,
    isPausedByFocus,
    isVisible,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  );
}
