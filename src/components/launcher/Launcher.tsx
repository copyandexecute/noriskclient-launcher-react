"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { VerticalNavbar } from "../navigation/VerticalNavbar";
import { UserProfileBar } from "../header/UserProfileBar";
import { SkinViewer } from "./SkinViewer";
import { QuickConnectChip } from "../header/QuickConnectChip";
import { LaunchButton } from "./LaunchButton";
import { NewsSection } from "../news/NewsSection";
import { VersionInfo } from "./VersionInfo";
import {
  appConfig,
  navItems,
  newsItems,
  recentServers,
  userData,
  versions,
} from "../../data/mock-data";
import { Icon } from "@iconify/react";

interface LauncherProps {
  useIntegratedTitleBar?: boolean;
}

export function Launcher({ useIntegratedTitleBar = false }: LauncherProps) {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedVersion, setSelectedVersion] = useState("norisk-dev");
  const [isLaunching, setIsLaunching] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const backgroundPatternRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: "power3.out",
      });

      if (backgroundPatternRef.current) {
        gsap.to(backgroundPatternRef.current, {
          backgroundPosition: "100% 100%",
          duration: 120,
          repeat: -1,
          ease: "none",
        });
      }
    });

    if (useIntegratedTitleBar) {
      const setupWindowControls = async () => {
        try {
          const { Window } = await import("@tauri-apps/api/window");
          const currentWindow = Window.getCurrent();

          if (minimizeRef.current) {
            minimizeRef.current.addEventListener("click", () =>
              currentWindow.minimize(),
            );
          }

          if (maximizeRef.current) {
            maximizeRef.current.addEventListener("click", () =>
              currentWindow.toggleMaximize(),
            );
          }

          if (closeRef.current) {
            closeRef.current.addEventListener("click", () =>
              currentWindow.close(),
            );
          }
        } catch (error) {
          console.error("Failed to initialize window controls:", error);
        }
      };

      setupWindowControls();
    }

    return () => ctx.revert();
  }, [useIntegratedTitleBar]);

  const handleNavItemClick = (id: string) => {
    setActiveSection(id);
  };

  const handleLaunch = (version: string) => {
    setIsLaunching(true);
    setSelectedVersion(version);
    console.log(`Launching version: ${version}`);

    setTimeout(() => {
      setIsLaunching(false);
    }, 2000);
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
  };

  const handleServerSelect = (server: any) => {
    console.log(`Selected server: ${server.name} (${server.address})`);
  };

  const currentVersion =
    versions.find((v) => v.id === selectedVersion) || versions[0];

  return (
    <div
      ref={launcherRef}
      className={`${useIntegratedTitleBar ? "h-screen" : "h-full"} w-full bg-black/50 backdrop-blur-lg border-2 border-white/20 overflow-hidden relative flex shadow-[0_0_25px_rgba(0,0,0,0.4)]`}
      style={{
        backgroundColor: "#222",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
      <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>

      <VerticalNavbar
        items={navItems}
        activeItem={activeSection}
        onItemClick={handleNavItemClick}
        className="h-full border-r-2 border-white/20 z-10"
        version={appConfig.version}
      />

      <div className="flex-1 flex flex-col">
        {useIntegratedTitleBar ? (
          <div
            className="h-20 border-b-2 border-white/20 bg-black/40 backdrop-blur-lg flex items-center justify-between px-8 z-10"
            data-tauri-drag-region
          >
            <div className="flex items-center gap-4" data-tauri-drag-region>
              <h1
                className="font-minecraft text-4xl tracking-wider text-white font-bold uppercase text-shadow"
                data-tauri-drag-region
              >
                <span className="text-white">noriskclient</span>
              </h1>
              <div
                className="text-white/70 text-xs font-minecraft tracking-wider uppercase ml-4"
                data-tauri-drag-region
              ></div>
            </div>

            <div className="flex items-center gap-4">
              <QuickConnectChip
                servers={recentServers}
                onServerSelect={handleServerSelect}
              />
              <UserProfileBar
                username={userData.username}
                avatarUrl={userData.avatarUrl}
              />

              <div className="flex items-center gap-3 ml-4">
                <div
                  ref={minimizeRef}
                  className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <Icon icon="pixel:minus-solid" className="w-4 h-4" />
                </div>
                <div
                  ref={maximizeRef}
                  className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Maximize"
                >
                  <Icon icon="pixel:expand-solid" className="w-4 h-4" />
                </div>
                <div
                  ref={closeRef}
                  className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-red-500 transition-colors cursor-pointer"
                  title="Close"
                >
                  <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-20 border-b-2 border-white/20 bg-black/40 backdrop-blur-lg flex items-center justify-between px-8 z-10">
            <h1 className="font-minecraft text-4xl tracking-wider text-white font-bold uppercase text-shadow">
              <span className="text-white">noriskclient</span>
            </h1>
            <div className="flex items-center gap-4">
              <QuickConnectChip
                servers={recentServers}
                onServerSelect={handleServerSelect}
              />
              <UserProfileBar
                username={userData.username}
                avatarUrl={userData.avatarUrl}
              />
            </div>
          </div>
        )}

        <div ref={contentAreaRef} className="flex-1 relative flex">
          <div
            ref={backgroundPatternRef}
            className="absolute inset-0 opacity-90 pointer-events-none"
            style={{
              backgroundImage: "url('/background.jpeg')",
              backgroundSize: "200% 200%",
              backgroundPosition: "0% 0%",
              filter: "blur(8px)",
            }}
          ></div>

          <div className="flex-grow flex flex-col items-center justify-center p-8 relative">
            <VersionInfo
              version={currentVersion}
              isLaunching={isLaunching}
              className="absolute top-6 left-6 z-10"
            />

            <div className="flex flex-col items-center z-10">
              <h2 className="font-minecraft text-5xl text-center text-white mb-2 uppercase text-shadow">
                {userData.username}
              </h2>

              <div className="relative">
                <SkinViewer
                  skinUrl={userData.skinUrl}
                  width={280}
                  height={380}
                  className="bg-transparent"
                  autoRotate={true}
                />

                <div className="absolute bottom-4 left-0 right-0 w-full">
                  <LaunchButton
                    versions={versions}
                    defaultVersion="norisk-dev"
                    onLaunch={handleLaunch}
                    onVersionChange={handleVersionChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <NewsSection
            items={newsItems}
            className="w-1/3 border-l-2 border-white/40 bg-black/10 backdrop-blur-lg p-5 overflow-hidden flex flex-col"
            onRefresh={() => console.log("Refreshing news...")}
          />
        </div>
      </div>
    </div>
  );
}
