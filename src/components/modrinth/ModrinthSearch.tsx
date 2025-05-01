"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ModrinthService } from "../../services/modrinth-service";
import { ProfileSelectionPopup } from "./ProfileSelectionPopup";
import type {
  ModrinthProjectType,
  ModrinthSearchHit,
  ModrinthSearchResponse,
  ModrinthSortType,
  ModrinthVersion,
} from "../../types/modrinth";
import type { Profile } from "../../types/profile";
import { Card, CardContent } from "../ui/Card";
import { ModrinthProjectCard } from "./ModrinthProjectCard";
import { ModrinthVersionItem } from "./ModrinthVersionItem";
import { LoadingIndicator } from "../ui/LoadingIndicator";
import { ErrorMessage } from "../ui/ErrorMessage";
import { EmptyState } from "../ui/EmptyState";
import { useModrinthInstaller } from "../../hooks/useModrinthInstaller";

const PROJECT_TYPES: { type: ModrinthProjectType; label: string }[] = [
  { type: "mod", label: "Mods" },
  { type: "modpack", label: "Modpacks" },
  { type: "resourcepack", label: "Resource Packs" },
  { type: "shader", label: "Shaders" },
  { type: "datapack", label: "Datapacks" },
];

const SORT_OPTIONS: { type: ModrinthSortType; label: string }[] = [
  { type: "relevance", label: "Relevance" },
  { type: "downloads", label: "Downloads" },
  { type: "follows", label: "Followers" },
  { type: "newest", label: "Newest" },
  { type: "updated", label: "Recently Updated" },
];

interface ModrinthSearchProps {
  profiles: Profile[];
  onInstallSuccess?: () => void;
  className?: string;
  initialProjectType?: ModrinthProjectType;
  projectId?: string;
  autoInstall?: boolean;
  selectedProfileId?: string;
}

export const ModrinthSearch: React.FC<ModrinthSearchProps> = ({
  profiles = [],
  onInstallSuccess,
  className = "",
  initialProjectType = "mod",
  projectId = null,
  autoInstall = false,
  selectedProfileId = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ModrinthSearchHit[]>([]);
  const [, setSearchResponse] = useState<ModrinthSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedProjectType, setSelectedProjectType] =
    useState<ModrinthProjectType>(initialProjectType);
  const [selectedSortType, setSelectedSortType] =
    useState<ModrinthSortType>("relevance");

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize] = useState(20);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projectId,
  );
  const [modVersions, setModVersions] = useState<ModrinthVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [, setCurrentlySelectedHit] = useState<ModrinthSearchHit | null>(null);

  // Add a ref to track if a search is already in progress
  const searchInProgressRef = useRef(false);

  const {
    installState: addingModState,
    error: addError,
    installToProfile: directInstallToProfile,
    showProfilePopup,
    setShowProfilePopup,
    pendingInstall,
    setPendingInstall,
    handleProfileSelect,
    handleContentInstall,
  } = useModrinthInstaller(profiles, selectedProfileId, onInstallSuccess);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setDebouncedSearchTerm("");
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (projectId) {
      const loadProject = async () => {
        try {
          // @ts-ignore
          const project = await ModrinthService.getProject(projectId);
          if (!project) {
            throw new Error("Project not found");
          }

          const searchHit: ModrinthSearchHit = {
            project_id: project.id,
            project_type: project.project_type,
            slug: project.slug,
            author: project.team[0]?.user?.username || "Unknown",
            title: project.title,
            description: project.description,
            // @ts-ignore
            categories: project.categories,
            display_categories: project.categories,
            versions: project.versions,
            downloads: project.downloads,
            follows: project.followers,
            icon_url: project.icon_url,
            date_created: project.published,
            date_modified: project.updated,
            latest_version: project.latest_version,
            license: project.license?.id || "Unknown",
            client_side: project.client_side,
            server_side: project.server_side,
            gallery: project.gallery,
            featured_gallery: project.featured_gallery,
            color: 0,
          };

          setSearchResults([searchHit]);
          setCurrentlySelectedHit(searchHit);
          setSelectedProjectId(projectId);

          await fetchVersions(projectId, searchHit);

          if (autoInstall && selectedProfileId) {
            setTimeout(() => {
              autoInstallLatestVersion(searchHit, selectedProfileId);
            }, 500);
          }
        } catch (error) {
          console.error("Failed to load project:", error);
          setSearchError(
            `Failed to load project: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      };

      loadProject();
    }
  }, [projectId, autoInstall, selectedProfileId]);

  const fetchVersions = async (projectId: string, hit: ModrinthSearchHit) => {
    setVersionsLoading(true);
    setVersionsError(null);
    setModVersions([]);

    try {
      const versionData = await ModrinthService.getModVersions(projectId);
      setModVersions(
        versionData.map((v) => ({
          ...v,
          search_hit: hit,
        })),
      );
    } catch (err) {
      console.error(`Failed to fetch versions for ${projectId}:`, err);
      setVersionsError(
        `Failed to load versions: ${err instanceof Error ? err.message : String(err)}`,
      );
      setModVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const autoInstallLatestVersion = (
    // @ts-ignore
    hit: ModrinthSearchHit,
    profileId: string,
  ) => {
    if (modVersions.length === 0) {
      console.error("No versions available for auto-install");
      return;
    }

    const latestVersion = modVersions[0];
    const primaryFile =
      latestVersion.files.find((f) => f.primary) || latestVersion.files[0];

    if (!primaryFile) {
      console.error("No files available for auto-install");
      return;
    }

    directInstallToProfile(latestVersion, primaryFile, profileId);
  };

  const performSearch = useCallback(
    async (resetResults = true) => {
      // Don't search if there's no search term and we're resetting results
      if (resetResults && debouncedSearchTerm.trim() === "") return;

      // Check if a search is already in progress
      if (searchInProgressRef.current) {
        console.log("Search already in progress, skipping");
        return;
      }

      // Set the flag to indicate a search is in progress
      searchInProgressRef.current = true;

      if (resetResults) {
        setSearchLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      setSearchError(null);
      const currentOffset = resetResults ? 0 : offset;

      try {
        console.log(
          `Performing search: term=${debouncedSearchTerm.trim()}, type=${selectedProjectType}, sort=${selectedSortType}, offset=${currentOffset}`,
        );

        const response = await ModrinthService.searchProjects(
          debouncedSearchTerm.trim(),
          selectedProjectType,
          undefined,
          undefined,
          pageSize,
          currentOffset,
          selectedSortType,
        );

        setSearchResponse(response);

        if (resetResults) {
          setSearchResults(response.hits);
        } else {
          setSearchResults((prev) => [...prev, ...response.hits]);
        }

        setOffset(currentOffset + response.hits.length);
        setHasMore(
          response.hits.length === pageSize &&
            currentOffset + response.hits.length < response.total_hits,
        );

        if (resetResults) {
          setSelectedProjectId(null);
          setModVersions([]);
          setVersionsError(null);
        }
      } catch (err) {
        console.error("Modrinth search failed:", err);
        setSearchError(
          `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (resetResults) {
          setSearchResults([]);
          setSearchResponse(null);
        }
      } finally {
        if (resetResults) {
          setSearchLoading(false);
        } else {
          setLoadingMore(false);
        }

        // Reset the flag to indicate search is complete
        searchInProgressRef.current = false;
      }
    },
    [
      debouncedSearchTerm,
      selectedProjectType,
      offset,
      pageSize,
      selectedSortType,
    ],
  );

  // Only perform search when debounced search term changes and is not empty
  useEffect(() => {
    // This effect should only run once when debouncedSearchTerm changes
    // and should not depend on performSearch which changes on every render
    if (debouncedSearchTerm.trim() !== "") {
      const doSearch = async () => {
        // Don't search if there's already a search in progress
        if (searchInProgressRef.current) {
          return;
        }

        // Set the flag to indicate a search is in progress
        searchInProgressRef.current = true;
        setSearchLoading(true);
        setSearchError(null);
        setOffset(0);
        setHasMore(true);

        try {
          console.log(
            `Performing search: term=${debouncedSearchTerm.trim()}, type=${selectedProjectType}, sort=${selectedSortType}, offset=0`,
          );

          const response = await ModrinthService.searchProjects(
            debouncedSearchTerm.trim(),
            selectedProjectType,
            undefined,
            undefined,
            pageSize,
            0,
            selectedSortType,
          );

          setSearchResponse(response);
          setSearchResults(response.hits);
          setOffset(response.hits.length);
          setHasMore(
            response.hits.length === pageSize &&
              response.hits.length < response.total_hits,
          );

          setSelectedProjectId(null);
          setModVersions([]);
          setVersionsError(null);
        } catch (err) {
          const error = err as Error;
          console.error("Modrinth search failed:", error);
          setSearchError(`Search failed: ${error.message || String(error)}`);
          setSearchResults([]);
          setSearchResponse(null);
        } finally {
          setSearchLoading(false);
          // Reset the flag to indicate search is complete
          searchInProgressRef.current = false;
        }
      };

      doSearch();
    }
  }, [debouncedSearchTerm, selectedProjectType, selectedSortType, pageSize]);

  // Set up scroll event listener for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (
        !resultsContainerRef.current ||
        loadingMore ||
        !hasMore ||
        searchInProgressRef.current
      )
        return;

      const { scrollTop, scrollHeight, clientHeight } =
        resultsContainerRef.current;
      const scrollThreshold = scrollHeight - clientHeight - 200;

      if (scrollTop >= scrollThreshold) {
        performSearch(false);
      }
    };

    const container = resultsContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [loadingMore, hasMore, performSearch]);

  const fetchAndShowVersions = useCallback(
    async (hit: ModrinthSearchHit) => {
      const projectId = hit.project_id;
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setModVersions([]);
        setVersionsError(null);
        setCurrentlySelectedHit(null);
        return;
      }

      setSelectedProjectId(projectId);
      setCurrentlySelectedHit(hit);
      await fetchVersions(projectId, hit);
    },
    [selectedProjectId],
  );

  const changeProjectType = useCallback(
    (newType: ModrinthProjectType) => {
      if (selectedProjectType === newType) return;

      setSelectedProjectType(newType);

      if (debouncedSearchTerm.trim() !== "") {
        const searchWithNewType = async () => {
          // Check if a search is already in progress
          if (searchInProgressRef.current) return;

          // Set the flag to indicate a search is in progress
          searchInProgressRef.current = true;

          setSearchLoading(true);
          setSearchError(null);
          setOffset(0);
          setHasMore(true);

          try {
            const response = await ModrinthService.searchProjects(
              debouncedSearchTerm.trim(),
              newType,
              undefined,
              undefined,
              pageSize,
              0,
              selectedSortType,
            );

            setSearchResponse(response);
            setSearchResults(response.hits);
            setOffset(response.hits.length);
            setHasMore(
              response.hits.length === pageSize &&
                response.hits.length < response.total_hits,
            );

            setSelectedProjectId(null);
            setModVersions([]);
            setVersionsError(null);
          } catch (err) {
            console.error("Modrinth search failed:", err);
            setSearchError(
              `Search failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            setSearchResults([]);
            setSearchResponse(null);
          } finally {
            setSearchLoading(false);
            // Reset the flag to indicate search is complete
            searchInProgressRef.current = false;
          }
        };

        searchWithNewType();
      } else {
        loadFeaturedContent(newType);
      }
    },
    [selectedProjectType, debouncedSearchTerm, pageSize, selectedSortType],
  );

  const changeSortType = useCallback(
    (newSort: ModrinthSortType) => {
      if (selectedSortType === newSort) return;

      setSelectedSortType(newSort);

      // Always perform a search when sort type changes, regardless of search term
      const searchWithNewSort = async () => {
        // Check if a search is already in progress
        if (searchInProgressRef.current) return;

        // Set the flag to indicate a search is in progress
        searchInProgressRef.current = true;

        setSearchLoading(true);
        setSearchError(null);
        setOffset(0);
        setHasMore(true);

        try {
          const response = await ModrinthService.searchProjects(
            debouncedSearchTerm.trim(),
            selectedProjectType,
            undefined,
            undefined,
            pageSize,
            0,
            newSort,
          );

          setSearchResponse(response);
          setSearchResults(response.hits);
          setOffset(response.hits.length);
          setHasMore(
            response.hits.length === pageSize &&
              response.hits.length < response.total_hits,
          );

          setSelectedProjectId(null);
          setModVersions([]);
          setVersionsError(null);
        } catch (err) {
          console.error("Modrinth search failed:", err);
          setSearchError(
            `Search failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          setSearchResults([]);
          setSearchResponse(null);
        } finally {
          setSearchLoading(false);
          // Reset the flag to indicate search is complete
          searchInProgressRef.current = false;
        }
      };

      searchWithNewSort();
    },
    [selectedSortType, selectedProjectType, debouncedSearchTerm, pageSize],
  );

  const loadFeaturedContent = useCallback(
    async (projectType = selectedProjectType) => {
      // Check if a search is already in progress
      if (searchInProgressRef.current) return;

      // Set the flag to indicate a search is in progress
      searchInProgressRef.current = true;

      setSearchLoading(true);
      setSearchError(null);

      try {
        const response = await ModrinthService.searchProjects(
          "",
          projectType,
          undefined,
          undefined,
          pageSize,
          0,
          "downloads",
        );

        setSearchResponse(response);
        setSearchResults(response.hits);
        setOffset(response.hits.length);
        setHasMore(
          response.hits.length === pageSize &&
            response.hits.length < response.total_hits,
        );
      } catch (err) {
        console.error("Failed to load featured content:", err);
        setSearchError(
          `Failed to load content: ${err instanceof Error ? err.message : String(err)}`,
        );
        setSearchResults([]);
        setSearchResponse(null);
      } finally {
        setSearchLoading(false);
        // Reset the flag to indicate search is complete
        searchInProgressRef.current = false;
      }
    },
    [pageSize, selectedProjectType],
  );

  // Initial load - show featured content instead of empty search
  useEffect(() => {
    if (!projectId) {
      loadFeaturedContent();
    }
    // Only run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`modrinth-search-container ${className} flex flex-col`}>
      <Card className="flex-1 flex flex-col overflow-hidden">
        {!projectId && (
          <div className="search-controls p-4 border-b border-white/20">
            <div className="project-type-tabs flex flex-wrap gap-0.5 mb-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-none">
              {PROJECT_TYPES.map((tab) => (
                <button
                  key={tab.type}
                  className={`px-4 py-2 font-minecraft text-3xl lowercase select-none tracking-wide ${
                    selectedProjectType === tab.type
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                  onClick={() => changeProjectType(tab.type)}
                  disabled={searchLoading}
                >
                  {tab.label.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search mods, modpacks, resource packs..."
                  className="w-full bg-black/20 backdrop-blur-md border border-white/10 px-3 py-2 text-white font-minecraft text-3xl shadow-sm tracking-wide"
                />
                {searchTerm && (
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                    onClick={() => setSearchTerm("")}
                  >
                    <Icon icon="pixel:window-close-solid" className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedSortType}
                  onChange={(e) => {
                    changeSortType(e.target.value as ModrinthSortType);
                  }}
                  className="bg-black/20 backdrop-blur-md border border-white/10 px-2 py-2 text-white font-minecraft text-3xl shadow-sm appearance-none pr-8 tracking-wide"
                  disabled={searchLoading}
                  aria-label="Sort by"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={option.type}
                      value={option.type}
                      className="text-3xl"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                  <Icon icon="pixel:chevron-down" className="w-6 h-6" />
                </div>
              </div>

              <button
                onClick={() => performSearch(true)}
                disabled={searchLoading || searchInProgressRef.current}
                className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/10 px-4 py-2 text-white font-minecraft text-3xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed minecraft-button-hover tracking-wide"
              >
                {searchLoading ? (
                  <Icon
                    icon="pixel:circle-notch-solid"
                    className="animate-spin w-6 h-6"
                  />
                ) : (
                  <Icon icon="pixel:search" className="w-6 h-6" />
                )}
              </button>
            </div>

            {searchError && <ErrorMessage message={searchError} />}
          </div>
        )}

        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          {searchLoading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
              <LoadingIndicator message="Loading results..." />
            </div>
          )}

          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            <div className="results-list space-y-4 p-4">
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((hit) => (
                    <ModrinthProjectCard
                      key={hit.project_id}
                      project={hit}
                      isExpanded={selectedProjectId === hit.project_id}
                      isLoading={
                        versionsLoading && selectedProjectId === hit.project_id
                      }
                      onToggleExpand={() => fetchAndShowVersions(hit)}
                    >
                      {selectedProjectId === hit.project_id && (
                        <div className="versions-container mt-4 pt-4 border-t border-white/10">
                          {versionsLoading ? (
                            <LoadingIndicator
                              // @ts-ignore
                              size="sm"
                              message="Loading versions..."
                            />
                          ) : versionsError ? (
                            <ErrorMessage message={versionsError} />
                          ) : modVersions.length > 0 ? (
                            <div>
                              <h4 className="text-white font-minecraft text-2xl mb-2 tracking-wide lowercase select-none">
                                Available Versions:
                              </h4>
                              <div className="versions-list space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {modVersions.map((version) => {
                                  const primaryFile =
                                    version.files.find((f) => f.primary) ??
                                    version.files[0];

                                  return primaryFile ? (
                                    <ModrinthVersionItem
                                      key={version.id}
                                      version={version}
                                      file={primaryFile}
                                      // @ts-ignore
                                      installState={
                                        addingModState[version.id] || "idle"
                                      }
                                      onInstall={() =>
                                        handleContentInstall(
                                          version,
                                          primaryFile,
                                        )
                                      }
                                    />
                                  ) : null;
                                })}
                              </div>
                            </div>
                          ) : (
                            <EmptyState message="No versions found matching the criteria." />
                          )}
                        </div>
                      )}
                    </ModrinthProjectCard>
                  ))}

                  {loadingMore && (
                    <LoadingIndicator message="Loading more results..." />
                  )}

                  {!hasMore && searchResults.length > 0 && !loadingMore && (
                    <div className="text-center py-4 border-t border-white/10 mt-2">
                      <p className="text-white/50 font-minecraft-ten text-xl tracking-wide lowercase select-none">
                        End of results
                      </p>
                    </div>
                  )}
                </>
              ) : !searchLoading && !searchError ? (
                <EmptyState
                  icon="pixel:grid-solid"
                  message={
                    searchTerm.trim()
                      ? `No results found for "${searchTerm}"`
                      : searchResults.length === 0
                        ? "No content found. Try a different search."
                        : "Browse popular content"
                  }
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 text-white px-4 py-3 font-minecraft-ten text-2xl shadow-md z-50 tracking-wide lowercase select-none">
          <Icon
            icon="pixel:exclamation-triangle-solid"
            className="inline-block mr-2 w-5 h-5"
          />
          {addError}
        </div>
      )}
    </div>
  );
};
