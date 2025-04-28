"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import Image from "../ui/Image";

interface UserProfileBarProps {
  username: string;
  avatarUrl?: string;
  className?: string;
}

export function UserProfileBar({
  username,
  avatarUrl,
  className,
}: UserProfileBarProps) {
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(profileRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={profileRef}
      className={cn(
        "flex items-center gap-3 bg-black/50 h-10 px-4 py-1 max-w-fit backdrop-blur-md",
        "border-2 border-white/30 shadow-[0_0_10px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <div className="relative w-7 h-7 overflow-hidden border-2 border-white/30">
        {avatarUrl ? (
          <Image
            src={avatarUrl || "/placeholder.svg"}
            alt={username}
            width={28}
            height={28}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-black/40 flex items-center justify-center text-white font-minecraft text-xs">
            {username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-white/80 font-minecraft uppercase">
          Logged in as
        </span>
        <span className="text-sm text-white font-minecraft uppercase">
          {username}
        </span>
      </div>
    </div>
  );
}
