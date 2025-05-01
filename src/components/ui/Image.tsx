"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function Image({
  className,
  src,
  alt,
  fallback = "/assets/placeholder.jpg",
  ...props
}: ImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImgSrc(fallback);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
        className={cn("w-full h-full object-cover", className)}
      />
    </div>
  );
}
