"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ModrinthService } from "../../services/modrinth-service";
import { ProfileSelectionPopup } from "./ProfileSelectionPopup";
import type {
  ModrinthProjectType,
  ModrinthSearchHit,
  ModrinthVersion,
} from "../../types/modrinth";
import type { Profile } from "../../types/profile";
import { Card, CardContent } from "../ui/Card";
import { ModrinthVersionItem } from "./ModrinthVersionItem";
import { LoadingIndicator } from "../ui/LoadingIndicator";
import { ErrorMessage } from "../ui/ErrorMessage";
import { EmptyState } from "../ui/EmptyState";
import { useModrinthInstaller } from "../../hooks/useModrinthInstaller.ts";

interface FeaturedContentProps {
  profiles: Profile[];
  onInstallSuccess?: () => void;
  className?: string;
}

export function FeaturedContent({
  profiles,
  onInstallSuccess,
  className = "",
}: FeaturedContentProps) {
  const [featuredMods, setFeaturedMods] = useState<ModrinthSearchHit[]>([]);
  const [featuredModpacks, setFeaturedModpacks] = useState<ModrinthSearchHit[]>(
    [],
  );
  const [featuredResourcePacks, setFeaturedResourcePacks] = useState<
    ModrinthSearchHit[]
  >([]);
  const [featuredShaders, setFeaturedShaders] = useState<ModrinthSearchHit[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] =
    useState<ModrinthSearchHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<ModrinthVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [showVersionsPopup, setShowVersionsPopup] = useState(false);

  const {
    installState: addingContentState,
    error: addError,
    showProfilePopup,
    setShowProfilePopup,
    pendingInstall,
    setPendingInstall,
    handleProfileSelect,
    handleContentInstall,
  } = useModrinthInstaller(profiles, null, onInstallSuccess);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const [mods, modpacks, resourcePacks, shaders] = await Promise.all([
          ModrinthService.searchProjects(
            "",
            "mod",
            undefined,
            undefined,
            10,
            0,
            "downloads",
          ),
          ModrinthService.searchProjects(
            "",
            "modpack",
            undefined,
            undefined,
            10,
            0,
            "downloads",
          ),
          ModrinthService.searchProjects(
            "",
            "resourcepack",
            undefined,
            undefined,
            10,
            0,
            "downloads",
          ),
          ModrinthService.searchProjects(
            "",
            "shader",
            undefined,
            undefined,
            10,
            0,
            "downloads",
          ),
        ]);

        setFeaturedMods(mods.hits);
        setFeaturedModpacks(modpacks.hits);
        setFeaturedResourcePacks(resourcePacks.hits);
        setFeaturedShaders(shaders.hits);
      } catch (err) {
        console.error("Failed to fetch featured content:", err);
        setError(
          `Failed to load featured content: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedContent();
  }, []);

  const handleViewDetails = async (project: ModrinthSearchHit) => {
    setSelectedProject(project);
    setVersionsLoading(true);
    setVersionsError(null);
    setShowVersionsPopup(true);

    try {
      const versions = await ModrinthService.getModVersions(project.project_id);
      setProjectVersions(
        versions.map((v) => ({
          ...v,
          search_hit: project,
        })),
      );
    } catch (err) {
      console.error(`Failed to fetch versions for ${project.project_id}:`, err);
      setVersionsError(
        `Failed to load versions: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setVersionsLoading(false);
    }
  };

  const renderContentSection = (
    title: string,
    content: ModrinthSearchHit[],
    // @ts-ignore
    type: ModrinthProjectType,
  ) => (
    <div className="mb-8">
      <h3 className="text-white font-minecraft text-lg mb-4">{title}</h3>

      {content.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <div
              key={item.project_id}
              className="bg-black/20 backdrop-blur-md border border-white/10 p-4 hover:bg-black/30 transition-colors"
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-16 h-16 bg-black/30 overflow-hidden">
                  {item.icon_url ? (
                    <img
                      src={item.icon_url || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = "📦";
                          parent.className +=
                            " flex items-center justify-center text-2xl";
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                </div>

                <div className="flex-grow overflow-hidden">
                  <h4 className="text-white font-minecraft text-base font-bold mb-1 truncate">
                    {item.title}
                  </h4>

                  <p className="text-white/80 font-minecraft text-xs line-clamp-2 mb-2">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 text-white/60 font-minecraft text-xs">
                    <div className="flex items-center">
                      <Icon icon="pixel:download" className="mr-1 w-3 h-3" />
                      {item.downloads.toLocaleString()}
                    </div>

                    <div className="flex items-center">
                      <Icon icon="pixel:star" className="mr-1 w-3 h-3" />
                      {item.follows.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleViewDetails(item)}
                  className="bg-black/30 hover:bg-black/40 px-3 py-1 text-white font-minecraft text-xs transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/60 font-minecraft text-sm">
          No {title.toLowerCase()} found
        </p>
      )}
    </div>
  );

  if (loading) {
    return <LoadingIndicator message="Loading featured content..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className={`featured-content-container ${className} flex flex-col`}>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {renderContentSection("Popular Mods", featuredMods, "mod")}
          {renderContentSection(
            "Popular Modpacks",
            featuredModpacks,
            "modpack",
          )}
          {renderContentSection(
            "Popular Resource Packs",
            featuredResourcePacks,
            "resourcepack",
          )}
          {renderContentSection("Popular Shaders", featuredShaders, "shader")}
        </CardContent>
      </Card>

      {showVersionsPopup && selectedProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border-2 border-white/30 shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-white/20 flex justify-between items-center">
              <h3 className="text-white font-minecraft text-lg">
                {selectedProject.title} - Versions
              </h3>
              <button
                onClick={() => setShowVersionsPopup(false)}
                className="text-white/60 hover:text-white"
              >
                <Icon icon="pixel:close" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
              {versionsLoading ? (
                <LoadingIndicator size="sm" message="Loading versions..." />
              ) : versionsError ? (
                <ErrorMessage message={versionsError} />
              ) : projectVersions.length > 0 ? (
                <div className="space-y-3">
                  {projectVersions.map((version) => {
                    const primaryFile =
                      version.files.find((f) => f.primary) ?? version.files[0];
                    const currentAddState =
                      addingContentState[version.id] ?? "idle";

                    return primaryFile ? (
                      <ModrinthVersionItem
                        key={version.id}
                        version={version}
                        file={primaryFile}
                        installState={currentAddState}
                        onInstall={() =>
                          handleContentInstall(version, primaryFile)
                        }
                      />
                    ) : null;
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="pixel:warning"
                  message="No versions available"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showProfilePopup && pendingInstall && (
        <ProfileSelectionPopup
          profiles={profiles}
          onSelect={handleProfileSelect}
          onCancel={() => {
            setShowProfilePopup(false);
            setPendingInstall(null);
          }}
          title={`Install ${pendingInstall.version.search_hit?.project_type || "Content"}`}
          description={`Choose a profile to install "${
            pendingInstall.version.search_hit?.title || "this content"
          }" to:`}
        />
      )}

      {addError && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 text-white px-4 py-3 font-minecraft text-sm shadow-md z-50">
          <Icon icon="pixel:warning" className="inline-block mr-2 w-4 h-4" />
          {addError}
        </div>
      )}
    </div>
  );
}
