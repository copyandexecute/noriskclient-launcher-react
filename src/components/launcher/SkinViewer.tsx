"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import * as skinview3d from "skinview3d";

interface SkinViewerProps {
  skinUrl: string;
  width?: number;
  height?: number;
  className?: string;
  autoRotate?: boolean;
  username?: string;
  enableZoom?: boolean;
}

export function SkinViewer({
  skinUrl,
  width = 300,
  height = 400,
  className,
  autoRotate = true,
  enableZoom = true,
}: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const skinViewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: width,
      height: height,
      skin: skinUrl,
    });

    viewerRef.current = skinViewer;

    skinViewer.camera.position.set(10, 0, 40);
    skinViewer.camera.lookAt(0, 0, 0);
    skinViewer.controls.enableZoom = enableZoom;

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [skinUrl, width, height, autoRotate]);

  useEffect(() => {
    if (viewerRef.current && skinUrl) {
      viewerRef.current.loadSkin(skinUrl);
    }
  }, [skinUrl]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
}
