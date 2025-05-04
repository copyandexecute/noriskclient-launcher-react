"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/Logo";
import * as ConfigService from "../../services/launcher-config-service";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  action?: () => void;
}

interface VerticalNavbarProps {
  className?: string;
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (id: string) => void;
  version?: string;
}

export function VerticalNavbar({
  className,
  items,
  activeItem,
  onItemClick,
  version = "v0.5.22",
}: VerticalNavbarProps) {
  const [active, setActive] = useState(activeItem || items[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (activeItem) {
      setActive(activeItem);
    }
  }, [activeItem]);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const fetchedVersion = await ConfigService.getAppVersion();
        setAppVersion(`v${fetchedVersion}`);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("v?.?.?");
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".nav-item", { opacity: 0, x: -20 });

      gsap.to(".nav-item", {
        opacity: 1,
        x: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(".nav-item", { clearProps: "all" });
        },
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  const handleItemClick = (id: string) => {
    setActive(id);
    if (onItemClick) {
      onItemClick(id);
    }
  };

  const handleMouseEnter = (id: string) => {
    setShowTooltip(id);
    if (tooltipRef.current) {
      gsap.fromTo(
        tooltipRef.current,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(null);
  };

  return (
    <div
      ref={navRef}
      className={cn(
        "flex flex-col items-center py-6 w-24 bg-black/50 backdrop-blur-lg",
        className,
      )}
    >
      <div className="mb-12">
        <Logo size="sm" />
      </div>

      <div className="flex-1 flex flex-col items-center space-y-3 min-h-[400px]">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            <button
              className={cn(
                "nav-item w-16 h-16 flex items-center justify-center transition-all duration-300 border-2 border-white/20",
                active === item.id
                  ? "bg-white/30 backdrop-blur-md text-white border-t-4 border-t-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  : "bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/15 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]",
              )}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              aria-label={item.label}
            >
              <Icon icon={item.icon} className="w-8 h-8" />
            </button>

            {showTooltip === item.id && (
              <div
                ref={tooltipRef}
                className="absolute left-full bottom-2 ml-3 px-4 py-2 bg-black/80 backdrop-blur-lg border-2 border-white/20 whitespace-nowrap z-auto text-shadow"
              >
                <span className="text-xl font-minecraft text-white">
                  {item.label}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-lg text-white/60 font-minecraft">
        {appVersion || version || "loading..."}
      </div>
    </div>
  );
}
