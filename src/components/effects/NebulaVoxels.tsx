"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface Cube {
  x: number;
  y: number;
  z: number;
  size: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  speedX: number;
  speedY: number;
  speedZ: number;
  opacity: number;
}

interface NebulaVoxelsProps {
  cubeCount?: number;
  opacity?: number;
  speed?: number;
  className?: string;
}

export function NebulaVoxels({
  cubeCount = 30,
  opacity = 0.2,
  speed = 1,
  className = "",
}: NebulaVoxelsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const { qualityLevel } = useQualitySettingsStore();
  const visibleRef = useRef<boolean>(true);
  const animationFrameIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const cubesRef = useRef<Cube[]>([]);
  const isWindowFocused = useWindowFocus();
  
  // Animation should only run if both window is focused AND background animations are enabled
  const shouldAnimate = isWindowFocused && isBackgroundAnimationEnabled;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0].isIntersecting;
      },
      { threshold: 0.1 },
    );

    observer.observe(canvas);

    const qualityMultiplier =
      qualityLevel === "low" ? 0.3 : qualityLevel === "high" ? 0.8 : 0.5;
    const adjustedCubeCount = Math.floor(cubeCount * qualityMultiplier);
    const adjustedSpeed = speed * qualityMultiplier;
    const targetFps =
      qualityLevel === "low" ? 15 : qualityLevel === "high" ? 30 : 24;
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

      if (cubesRef.current.length === 0) {
        initCubes();
      }
    };

    const initCubes = () => {
      const { width, height } = canvas.getBoundingClientRect();
      cubesRef.current = [];

      for (let i = 0; i < adjustedCubeCount; i++) {
        cubesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 500 - 250,
          size: Math.random() * 30 + 10,
          rotationX: Math.random() * Math.PI * 2,
          rotationY: Math.random() * Math.PI * 2,
          rotationZ: Math.random() * Math.PI * 2,
          speedX: (Math.random() - 0.5) * 0.01 * adjustedSpeed,
          speedY: (Math.random() - 0.5) * 0.01 * adjustedSpeed,
          speedZ: (Math.random() - 0.5) * 0.01 * adjustedSpeed,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const drawCube = (cube: Cube) => {
      const halfSize = cube.size / 2;

      const cosX = Math.cos(cube.rotationX);
      const sinX = Math.sin(cube.rotationX);
      const cosY = Math.cos(cube.rotationY);
      const sinY = Math.sin(cube.rotationY);
      const cosZ = Math.cos(cube.rotationZ);
      const sinZ = Math.sin(cube.rotationZ);

      const vertices = [
        { x: -halfSize, y: -halfSize, z: halfSize },
        { x: halfSize, y: -halfSize, z: halfSize },
        { x: halfSize, y: halfSize, z: halfSize },
        { x: -halfSize, y: halfSize, z: halfSize },
        { x: -halfSize, y: -halfSize, z: -halfSize },
        { x: halfSize, y: -halfSize, z: -halfSize },
        { x: halfSize, y: halfSize, z: -halfSize },
        { x: -halfSize, y: halfSize, z: -halfSize },
      ];

      const rotatedVertices = vertices.map((v) => {
        const y1 = v.y * cosX - v.z * sinX;
        const z1 = v.y * sinX + v.z * cosX;

        const x2 = v.x * cosY + z1 * sinY;
        const z2 = -v.x * sinY + z1 * cosY;

        const x3 = x2 * cosZ - y1 * sinZ;
        const y3 = x2 * sinZ + y1 * cosZ;

        const scale = 1000 / (1000 + cube.z);
        return {
          x: cube.x + x3 * scale,
          y: cube.y + y3 * scale,
          z: cube.z + z2,
        };
      });

      const faces = [
        [0, 1, 2, 3],
        [5, 4, 7, 6],
        [4, 0, 3, 7],
        [1, 5, 6, 2],
        [4, 5, 1, 0],
        [3, 2, 6, 7],
      ];

      const faceDepths = faces.map((face) => {
        const avgZ =
          face.reduce((sum, i) => sum + rotatedVertices[i].z, 0) / face.length;
        return { face, avgZ };
      });

      faceDepths.sort((a, b) => a.avgZ - b.avgZ);

      faceDepths.forEach(({ face, avgZ }) => {
        const depthFactor = Math.min(1, Math.max(0, (avgZ + 250) / 500));
        const faceOpacity = cube.opacity * opacity * depthFactor;

        ctx.beginPath();
        ctx.moveTo(rotatedVertices[face[0]].x, rotatedVertices[face[0]].y);
        for (let i = 1; i < face.length; i++) {
          ctx.lineTo(rotatedVertices[face[i]].x, rotatedVertices[face[i]].y);
        }
        ctx.closePath();

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${faceOpacity})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${faceOpacity * 1.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    };

    const updateCubes = () => {
      cubesRef.current.forEach((cube) => {
        cube.rotationX += cube.speedX;
        cube.rotationY += cube.speedY;
        cube.rotationZ += cube.speedZ;

        cube.rotationX %= Math.PI * 2;
        cube.rotationY %= Math.PI * 2;
        cube.rotationZ %= Math.PI * 2;
      });
    };

    const renderCubes = (timestamp: number) => {
      // Only continue animation if should animate
      if (shouldAnimate) {
        animationFrameIdRef.current = requestAnimationFrame(renderCubes);
      }

      if (!visibleRef.current) return;
      
      // If animations are disabled, render static cubes and stop
      if (!shouldAnimate) {
        const { width, height } = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, width, height);
        
        // Create/maintain static cubes if they don't exist
        if (cubesRef.current.length === 0) {
          for (let i = 0; i < Math.floor(adjustedCubeCount * 0.7); i++) {
            cubesRef.current.push({
              x: Math.random() * width,
              y: Math.random() * height,
              z: Math.random() * 200 - 100,
              size: Math.random() * 20 + 8,
              rotationX: Math.random() * Math.PI * 2,
              rotationY: Math.random() * Math.PI * 2,
              rotationZ: Math.random() * Math.PI * 2,
              speedX: 0,
              speedY: 0,
              speedZ: 0,
              opacity: Math.random() * 0.4 + 0.2,
            });
          }
        }
        
        // Render static cubes
        const sortedCubes = [...cubesRef.current].sort((a, b) => a.z - b.z);
        sortedCubes.forEach(drawCube);
        
        return;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < frameInterval) return;

      lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      updateCubes();

      const sortedCubes = [...cubesRef.current].sort((a, b) => a.z - b.z);

      sortedCubes.forEach(drawCube);
    };

    window.addEventListener("resize", resize);
    resize();
    
    // Start animation only if should animate
    if (shouldAnimate) {
      animationFrameIdRef.current = requestAnimationFrame(renderCubes);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [accentColor.value, cubeCount, opacity, speed, qualityLevel, shouldAnimate]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
