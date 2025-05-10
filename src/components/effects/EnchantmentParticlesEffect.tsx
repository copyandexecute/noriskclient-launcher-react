"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";

interface EnchantmentParticlesEffectProps {
  opacity?: number;
  className?: string;
  particleCount?: number;
  interactive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  character: string;
}

const EnchantmentParticlesEffect: React.FC<EnchantmentParticlesEffectProps> = ({
  opacity = 0.5,
  className,
  particleCount = 150,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accentColor } = useThemeStore();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const animationFrameRef = useRef<number>();

  const hexToRgba = (hex: string, alpha: number) => {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const enchantmentChars = [
      "⍑",
      "⌇",
      "⎓",
      "⊣",
      "⊢",
      "⋮",
      "⫎",
      "⟒",
      "⟓",
      "⍊",
      "⌰",
      "⏃",
      "⏚",
      "⌿",
      "⍀",
      "⌇",
      "⏁",
      "⎍",
      "⎐",
      "⍙",
      "⍡",
      "⊬",
      "⋮",
      "⋮",
      "⟊",
      "⟋",
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        createParticle(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          true,
        );
      }
    };

    const createParticle = (x: number, y: number, randomVelocity = false) => {
      const maxLife = Math.random() * 100 + 50;
      const char =
        enchantmentChars[Math.floor(Math.random() * enchantmentChars.length)];

      const particle: Particle = {
        x,
        y,
        vx: randomVelocity ? (Math.random() - 0.5) * 0.5 : 0,
        vy: randomVelocity ? -Math.random() * 1 - 0.5 : -1 - Math.random(),
        size: Math.random() * 12 + 8,
        alpha: Math.random() * 0.6 + 0.2,
        color: hexToRgba(accentColor.value, 1),
        life: 0,
        maxLife,
        character: char,
      };

      particlesRef.current.push(particle);
      return particle;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (Math.random() > 0.8) {
        createParticle(mouseRef.current.x, mouseRef.current.y);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = `rgba(0, 0, 0, ${opacity / 2})`;
      context.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.life++;

        const fadeInFactor = Math.min(1, particle.life / 20);
        const fadeOutFactor = Math.max(
          0,
          1 - (particle.life - (particle.maxLife - 20)) / 20,
        );
        const currentAlpha = particle.alpha * fadeInFactor * fadeOutFactor;

        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.x += Math.sin(particle.life * 0.05) * 0.2;

        particle.vy *= 0.99;

        context.save();
        context.font = `${particle.size}px "Times New Roman", serif`;
        context.fillStyle = hexToRgba(
          accentColor.value,
          currentAlpha * opacity,
        );
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(particle.character, particle.x, particle.y);
        context.restore();

        return particle.life < particle.maxLife;
      });

      if (Math.random() > 0.9) {
        createParticle(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
        );
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [accentColor.value, opacity, particleCount, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
};

export default EnchantmentParticlesEffect;
