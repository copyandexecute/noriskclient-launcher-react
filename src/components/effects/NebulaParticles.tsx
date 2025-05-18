"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface NebulaParticlesProps {
  particleCount?: number;
  opacity?: number;
  speed?: number;
  className?: string;
}

export function NebulaParticles({
  particleCount = 50,
  opacity = 0.3,
  speed = 1,
  className = "",
}: NebulaParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { qualityLevel } = useQualitySettingsStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const qualityMultiplier =
      qualityLevel === "low" ? 0.5 : qualityLevel === "high" ? 1.5 : 1;
    const adjustedParticleCount = Math.floor(particleCount * qualityMultiplier);
    const adjustedSpeed = speed * qualityMultiplier;

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

      initParticles();
    };

    const initParticles = () => {
      const { width, height } = canvas.getBoundingClientRect();
      particles = [];

      for (let i = 0; i < adjustedParticleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 4 + 1,
          speedX: (Math.random() - 0.5) * 0.5 * adjustedSpeed,
          speedY: (Math.random() - 0.5) * 0.5 * adjustedSpeed,
          opacity: Math.random() * 0.5 + 0.1,
          life: 0,
          maxLife: Math.random() * 100 + 50,
        });
      }
    };

    const updateParticles = () => {
      const { width, height } = canvas.getBoundingClientRect();

      particles.forEach((p, index) => {
        p.x += p.speedX;
        p.y += p.speedY;

        p.life += 1;

        if (
          p.x < 0 ||
          p.x > width ||
          p.y < 0 ||
          p.y > height ||
          p.life > p.maxLife
        ) {
          if (Math.random() > 0.5) {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) {
              p.x = Math.random() * width;
              p.y = 0;
              p.speedY = Math.abs(p.speedY);
            } else if (edge === 1) {
              p.x = width;
              p.y = Math.random() * height;
              p.speedX = -Math.abs(p.speedX);
            } else if (edge === 2) {
              p.x = Math.random() * width;
              p.y = height;
              p.speedY = -Math.abs(p.speedY);
            } else {
              p.x = 0;
              p.y = Math.random() * height;
              p.speedX = Math.abs(p.speedX);
            }
          } else {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
          }

          p.size = Math.random() * 4 + 1;
          p.opacity = Math.random() * 0.5 + 0.1;
          p.life = 0;
          p.maxLife = Math.random() * 100 + 50;
        }
      });
    };

    const renderParticles = () => {
      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      updateParticles();

      particles.forEach((p) => {
        const fadeIn = Math.min(1, p.life / 20);
        const fadeOut = Math.max(0, 1 - p.life / p.maxLife);
        const particleOpacity = p.opacity * fadeIn * fadeOut * opacity;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particleOpacity})`;
        ctx.fill();

        const glow = p.size * 2;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        gradient.addColorStop(
          0,
          `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particleOpacity * 0.5})`,
        );
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(renderParticles);
    };

    window.addEventListener("resize", resize);
    resize();
    initParticles();
    renderParticles();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, particleCount, opacity, speed, qualityLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
