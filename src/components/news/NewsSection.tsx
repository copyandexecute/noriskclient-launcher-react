"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { fetchNewsAndChangelogs } from "../../services/nrc-service";
import type { BlogPost } from "../../types/wordPress";

interface NewsSectionProps {
  className?: string;
}

export function NewsSection({ className }: NewsSectionProps) {
  const newsRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "An unknown error occurred");
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
        gsap.from(".news-item-card", {
          opacity: 0,
          y: 20,
          stagger: 0.1,
          duration: 0.5,
          delay: 0.2,
          ease: "power3.out",
        });
      }, newsRef);
      return () => ctx.revert();
    }
  }, [posts, isLoading]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center p-4 text-white/70">Loading news...</p>;
    }

    if (error) {
      return <p className="text-center p-4 text-red-400">Error: {error}</p>;
    }

    if (posts.length === 0) {
      return <p className="text-center p-4 text-white/70">No news available at the moment.</p>;
    }

    return posts.map((post) => {
      let rawTitle = post.yoast_head_json?.title || "News Item";
      const suffixToRemove = " - NoRisk Client Blog";
      if (rawTitle.endsWith(suffixToRemove)) {
          rawTitle = rawTitle.substring(0, rawTitle.length - suffixToRemove.length);
      }
      const title = rawTitle.toLowerCase();

      const imageUrl = post.yoast_head_json?.og_image?.[0]?.url || "/placeholder.svg";
      const postUrl = post.yoast_head_json?.og_url || "#";

      return (
        <div key={post.id} className="news-item mb-6">
          <h4 className="font-minecraft text-white text-3xl text-shadow line-clamp-2 ml-1 mb-1">
            {title}
          </h4>

          <div
            className="news-item-card relative overflow-hidden cursor-pointer border-2 border-white/40 backdrop-blur-md bg-black/30"
            onClick={() => {
              if (postUrl !== "#") window.open(postUrl, '_blank');
              gsap.to(`#news-item-card-${post.id}`, { scale: 0.98, duration: 0.1, yoyo: true, repeat: 1 });
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { y: -4, boxShadow: "0 8px 16px rgba(0,0,0,0.3)", duration: 0.3 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)", duration: 0.3 })}
            id={`news-item-card-${post.id}`}
          >
            <div className="w-full h-full relative" style={{ height: "250px" }}>
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                onClick={(e) => { e.stopPropagation(); window.open(postUrl, '_blank'); }}
                disabled={postUrl === "#"}
                className="absolute bottom-3 right-3 text-xs text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/40 hover:bg-white/30 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                READ MORE
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div ref={newsRef} className={`${className} h-full flex flex-col`}>
      <div className="flex justify-between items-center p-5 border-b border-white/10">
        <h3 className="text-2xl flex items-center gap-3 uppercase text-shadow">
          <Icon icon="pixel:newspaper-solid" className="w-7 h-7" />
          NEUIGKEITEN
        </h3>
        <div className="flex items-center">
          <button
            className={`text-white/70 hover:text-white transition-colors p-1 ${isLoading ? 'animate-spin' : ''}`}
            onClick={loadNews}
            disabled={isLoading}
            aria-label="Refresh News"
          >
            <Icon icon="pixel:refresh-solid" className="w-7 h-7" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {renderContent()}
      </div>
    </div>
  );
}
