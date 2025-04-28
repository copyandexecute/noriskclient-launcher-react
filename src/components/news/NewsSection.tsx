"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "../ui/Card";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  date: string;
  image: string;
}

interface NewsSectionProps {
  items: NewsItem[];
  className?: string;
  onRefresh?: () => void;
}

export function NewsSection({ items, className, onRefresh }: NewsSectionProps) {
  const newsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".news-item", {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.5,
        delay: 0.2,
        ease: "power3.out",
      });
    }, newsRef);

    return () => ctx.revert();
  }, [items]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div ref={newsRef} className={className}>
      <Card className="h-full ">
        <CardHeader
          actions={
            <div className="flex items-center">
              <button
                className="text-white/70 hover:text-white transition-colors p-1"
                onClick={handleRefresh}
              >
                <Icon icon="pixel:refresh-solid" className="w-7 h-7" />
              </button>
            </div>
          }
        >
          <h3 className="text-2xl flex items-center gap-3 uppercase text-shadow">
            <Icon icon="pixel:newspaper-solid" className="w-7 h-7" />
            NEUIGKEITEN
          </h3>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4 custom-scrollbar p-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="news-item relative overflow-hidden cursor-pointer border-2 border-white/40  backdrop-blur-md"
              onClick={() => {
                gsap.to(`#news-item-${item.id}`, {
                  scale: 0.98,
                  duration: 0.1,
                  yoyo: true,
                  repeat: 1,
                });
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -4,
                  boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                  duration: 0.3,
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                  duration: 0.3,
                });
              }}
              id={`news-item-${item.id}`}
            >
              <div className="w-full" style={{ height: "250px" }}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t ">
                <h4 className="font-minecraft text-white text-lg uppercase">
                  {item.title}
                </h4>
                <p className="text-sm text-gray-300 mt-2">{item.content}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-white/70">{item.date}</span>
                  <button className="text-xs text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/40 hover:bg-white/30 transition-colors uppercase">
                    READ MORE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
