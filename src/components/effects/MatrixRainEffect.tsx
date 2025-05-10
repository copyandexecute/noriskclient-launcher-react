"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";

interface MatrixRainEffectProps {
  opacity?: number;
  className?: string;
}

const MatrixRainEffect: React.FC<MatrixRainEffectProps> = ({
  opacity = 0.05,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accentColor } = useThemeStore();

  useEffect(() => {
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
      y: number;
      trail: number;
      speed: number;
      ticksLeft: number;
      brightness: number;
    }[];

    const hexToRgba = (hex: string, alpha: number) => {
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / FONT_SIZE);
      drops = Array(columns)
        .fill(null)
        .map(() => ({
          y: 1,
          trail: Math.floor(
            Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
          ),
          speed: Math.random() * 1 + 0.5,
          ticksLeft: 0,
          brightness: Math.random() * 0.5 + 0.5,
        }));
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    context.font = `${FONT_SIZE}px monospace`;

    let animationFrameId: number;

    const draw = () => {
      context.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const text =
          charactersArray[Math.floor(Math.random() * charactersArray.length)];

        const colorAlpha = drop.brightness * 0.8;
        context.fillStyle = hexToRgba(accentColor.value, colorAlpha);

        context.fillText(text, i * FONT_SIZE, drop.y * FONT_SIZE);

        if (
          drop.y * FONT_SIZE > canvas.height &&
          Math.random() > RAINDROP_SPAWN_RATE
        ) {
          drops[i] = {
            y: 0,
            trail: Math.floor(
              Math.random() * ((canvas.height / FONT_SIZE) * 0.8) + 5,
            ),
            speed: Math.random() * 1 + 0.5,
            ticksLeft: 0,
            brightness: Math.random() * 0.5 + 0.5,
          };
        }
        drops[i].y += drop.speed * 0.2;
      }
      animationFrameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [opacity, accentColor.value]);

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

export default MatrixRainEffect;
