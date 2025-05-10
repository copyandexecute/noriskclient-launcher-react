"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/Logo";
import { NavButton } from ".././ui/nav/NavButton";
import { NavTooltip } from ".././ui/nav/NavTooltip";
import { Label } from ".././ui/Label";
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
        "flex flex-col items-center py-6 w-24 bg-black/50 backdrop-blur-lg border-r border-white/10",
        className,
      )}
    >
      <div className="mb-12">
        <Logo size="sm" />
      </div>

      <div className="flex-1 flex flex-col items-center space-y-4 min-h-[400px]">
        {items.map((item) => (
          <div key={item.id} className="relative group nav-item">
            <NavButton
              icon={<Icon icon={item.icon} className="w-8 h-8" />}
              isActive={active === item.id}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              aria-label={item.label}
            />

            {showTooltip === item.id && (
              <div className="absolute left-full ml-3 bottom-2 z-50">
                <NavTooltip ref={tooltipRef}>{item.label}</NavTooltip>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Label
          variant="secondary"
          size="sm"
          className="opacity-70 w-20 break-words"
        >
          {appVersion || version || "loading..."}
        </Label>
      </div>
    </div>
  );
}
