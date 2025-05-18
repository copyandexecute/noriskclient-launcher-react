"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";

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
  const { qualityLevel } = useQualitySettingsStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let cubes: Cube[] = [];

    const qualityMultiplier =
      qualityLevel === "low" ? 0.5 : qualityLevel === "high" ? 1.5 : 1;
    const adjustedCubeCount = Math.floor(cubeCount * qualityMultiplier);
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

      initCubes();
    };

    const initCubes = () => {
      const { width, height } = canvas.getBoundingClientRect();
      cubes = [];

      for (let i = 0; i < adjustedCubeCount; i++) {
        cubes.push({
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
      const { width, height } = canvas.getBoundingClientRect();
      const centerX = width / 2;
      const centerY = height / 2;

      const halfSize = cube.size / 2;
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
        const y1 =
          v.y * Math.cos(cube.rotationX) - v.z * Math.sin(cube.rotationX);
        const z1 =
          v.y * Math.sin(cube.rotationX) + v.z * Math.cos(cube.rotationX);

        const x2 =
          v.x * Math.cos(cube.rotationY) + z1 * Math.sin(cube.rotationY);
        const z2 =
          -v.x * Math.sin(cube.rotationY) + z1 * Math.cos(cube.rotationY);

        const x3 =
          x2 * Math.cos(cube.rotationZ) - y1 * Math.sin(cube.rotationZ);
        const y3 =
          x2 * Math.sin(cube.rotationZ) + y1 * Math.cos(cube.rotationZ);

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
      cubes.forEach((cube) => {
        cube.rotationX += cube.speedX;
        cube.rotationY += cube.speedY;
        cube.rotationZ += cube.speedZ;

        cube.rotationX %= Math.PI * 2;
        cube.rotationY %= Math.PI * 2;
        cube.rotationZ %= Math.PI * 2;
      });
    };

    const renderCubes = () => {
      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      updateCubes();

      const sortedCubes = [...cubes].sort((a, b) => a.z - b.z);

      sortedCubes.forEach((cube) => {
        drawCube(cube);
      });

      animationFrameId = requestAnimationFrame(renderCubes);
    };

    window.addEventListener("resize", resize);
    resize();
    initCubes();
    renderCubes();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, cubeCount, opacity, speed, qualityLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
