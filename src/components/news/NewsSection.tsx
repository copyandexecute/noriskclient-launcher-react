"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { fetchNewsAndChangelogs } from "../../services/nrc-service";
import { openExternalUrl } from "../../services/tauri-service";
import type { BlogPost } from "../../types/wordPress";
import { cn } from "../../lib/utils";
import { NewsCard } from "../ui/NewsCard";
import { useThemeStore } from "../../store/useThemeStore";
import { Label } from "../ui/Label";

interface NewsSectionProps {
  className?: string;
}

export function NewsSection({ className }: NewsSectionProps) {
  const newsRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const loadNews = async () => {
    setIsLoading(true);
    setError(null);
    console.log("[NewsSection] Fetching news...");
    try {
      const fetchedPosts = await fetchNewsAndChangelogs();
      console.log(`[NewsSection] Fetched ${fetchedPosts.length} posts.`);
      setPosts(fetchedPosts);
    } catch (err) {
      console.error("[NewsSection] Error fetching news:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    if (posts.length > 0 && !isLoading) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".news-item-card",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.5,
            delay: 0.2,
            ease: "power3.out",
            clearProps: "opacity,y",
          },
        );
      }, newsRef);
      return () => ctx.revert();
    }
  }, [posts, isLoading]);

  const handleOpenPost = (url: string, e: React.MouseEvent) => {
    if (url !== "#") {
      openExternalUrl(url).catch((err) =>
        console.error("Failed to open URL:", err),
      );
      const cardId = (e.currentTarget as HTMLElement).closest(
        ".news-item-card",
      )?.id;
      if (cardId) {
        gsap.to(`#${cardId}`, {
          scale: 0.98,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
        });
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-2">
          <Icon
            icon="pixel:spinner-solid"
            className="w-8 h-8 animate-spin text-white/70"
          />
          <span className="ml-3 text-white/70">Loading news...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-2">
          <Icon
            icon="pixel:exclamation-triangle-solid"
            className="w-8 h-8 text-red-400 mx-auto mb-2"
          />
          <p className="text-red-400">Error: {error}</p>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center p-2">
          <Icon
            icon="pixel:newspaper-solid"
            className="w-8 h-8 text-white/50 mx-auto mb-2"
          />
          <p className="text-white/70">No news available at the moment.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4 w-full">
        {posts.map((post) => {
          let rawTitle = post.yoast_head_json?.title || "News Item";
          const suffixToRemove = " - NoRisk Client Blog";
          if (rawTitle.endsWith(suffixToRemove)) {
            rawTitle = rawTitle.substring(
              0,
              rawTitle.length - suffixToRemove.length,
            );
          }
          const title = rawTitle.toLowerCase();

          const imageUrl =
            post.yoast_head_json?.og_image?.[0]?.url || "/placeholder.svg";
          const postUrl = post.yoast_head_json?.og_url || "#";

          return (
            <div key={post.id} className="news-item w-full">
              <Label
                variant="default"
                size="lg"
                className="w-full mb-1 px-2 py-1 font-minecraft lowercase line-clamp-2"
                style={{
                  backgroundColor: `${accentColor.value}20`,
                  borderColor: `${accentColor.value}60`,
                  color: "white",
                }}
              >
                {title}
              </Label>

              <NewsCard
                id={`news-item-card-${post.id}`}
                className="news-item-card w-full"
                title={title}
                imageUrl={imageUrl}
                postUrl={postUrl}
                onClick={() => {
                  if (postUrl !== "#") {
                    openExternalUrl(postUrl).catch((err) =>
                      console.error("Failed to open URL:", err),
                    );
                  }
                  gsap.to(`#news-item-card-${post.id}`, {
                    scale: 0.98,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                  });
                }}
                onReadMore={handleOpenPost}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={newsRef} className={cn("h-full flex flex-col", className)}>
      <div
        className="flex justify-between items-center p-3 border-b-2 border-white/10"
        style={{ borderColor: `${accentColor.value}30` }}
      >
        <Label
          variant="default"
          size="lg"
          icon={<Icon icon="pixel:newspaper-solid" className="w-6 h-6" />}
          className="uppercase"
        >
          NEUIGKEITEN
        </Label>

        <div className="flex items-center">
          <button
            className={`text-white/70 hover:text-white transition-colors p-1 ${isLoading ? "animate-spin" : ""}`}
            onClick={loadNews}
            disabled={isLoading}
            aria-label="Refresh News"
          >
            <Icon icon="pixel:refresh-solid" className="w-7 h-7" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {renderContent()}
      </div>
    </div>
  );
}
