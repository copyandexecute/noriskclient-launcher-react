"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { ModrinthService } from "../../services/modrinth-service";
import { ProfileSelectionPopup } from "./ProfileSelectionPopup";
import type {
  ModrinthFile,
  ModrinthProjectType,
  ModrinthSearchHit,
  ModrinthSearchResponse,
  ModrinthSortType,
  ModrinthVersion,
} from "../../types/modrinth";
import type {
  CheckContentParams,
  ContentInstallStatus,
  Profile,
} from "../../types/profile";
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
  onProfileCreated?: (profileId: string) => void;
}

export const ModrinthSearch: React.FC<ModrinthSearchProps> = ({
  profiles = [],
  onInstallSuccess,
  className = "",
  initialProjectType = "mod",
  projectId = null,
  autoInstall = false,
  selectedProfileId = null,
  onProfileCreated,
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

  // Filter state for the detail view
  const [selectedGameVersion, setSelectedGameVersion] = useState<
    string | undefined
  >(undefined);
  const [selectedLoader, setSelectedLoader] = useState<string | undefined>(
    undefined,
  );
  const [, setAvailableGameVersions] = useState<string[]>([]);
  const [, setAvailableLoaders] = useState<string[]>([]);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize] = useState(20);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projectId,
  );
  const [modVersions, setModVersions] = useState<ModrinthVersion[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<ModrinthVersion[]>(
    [],
  );
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [, setCurrentlySelectedHit] = useState<ModrinthSearchHit | null>(null);

  // Add a ref to track if a search is already in progress
  const searchInProgressRef = useRef(false);

  // Make sure we have valid profiles before using the hook
  const validProfiles = Array.isArray(profiles) ? profiles : [];

  // Add state for tracking installation status
  const [hitInstallStatus, setHitInstallStatus] = useState<
    Record<string, ContentInstallStatus | "loading" | "error" | null>
  >({});
  const [versionInstallStatus, setVersionInstallStatus] = useState<
    Record<string, ContentInstallStatus | "loading" | "error" | null>
  >({});

  // State for modpack installation
  const [modpackInstallState, setModpackInstallState] = useState<
    Record<string, "idle" | "adding" | "success" | "error">
  >({});

  const {
    installState: addingModState,
    error: addError,
    installToProfile: directInstallToProfile,
    installModpack,
    showProfilePopup,
    setShowProfilePopup,
    pendingInstall,
    setPendingInstall,
    handleProfileSelect,
    handleContentInstall,
  } = useModrinthInstaller(validProfiles, selectedProfileId, onInstallSuccess);

  // Function to install a modpack directly using the ModrinthService
  const handleModpackInstall = async (
    version: ModrinthVersion,
    file: ModrinthFile,
  ) => {
    const versionId = version.id;
    setModpackInstallState((prev) => ({ ...prev, [versionId]: "adding" }));

    try {
      const newProfileId = await installModpack(version, file);

      setModpackInstallState((prev) => ({ ...prev, [versionId]: "success" }));

      // Notify parent component about the new profile
      if (onProfileCreated) {
        onProfileCreated(newProfileId);
      }

      // Reset after a delay
      setTimeout(() => {
        setModpackInstallState((prev) => ({ ...prev, [versionId]: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Modpack installation failed:", error);
      setModpackInstallState((prev) => ({ ...prev, [versionId]: "error" }));

      // Log error
      console.error(
        `Failed to install modpack: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Reset after a longer delay
      setTimeout(() => {
        setModpackInstallState((prev) => ({ ...prev, [versionId]: "idle" }));
      }, 5000);
    }
  };

  // Handle content installation based on type
  const handleInstallButtonClick = (
    version: ModrinthVersion,
    file: ModrinthFile,
  ) => {
    // Check if it's a modpack - always directly install modpacks without profile selection
    if (version.search_hit?.project_type === "modpack") {
      // Use the direct ModrinthService method for modpacks
      handleModpackInstall(version, file);
    } else {
      // For regular content, use the existing handler
      handleContentInstall(version, file);
    }
  };

  // Function to check if a project is installed
  const updateHitInstallStatus = useCallback(
    async (hit: ModrinthSearchHit) => {
      if (!selectedProfileId) {
        setHitInstallStatus((prev) => ({ ...prev, [hit.project_id]: null }));
        return;
      }

      setHitInstallStatus((prev) => ({ ...prev, [hit.project_id]: "loading" }));

      const selectedProfile = validProfiles.find(
        (p) => p.id === selectedProfileId,
      );
      if (!selectedProfile) {
        setHitInstallStatus((prev) => ({ ...prev, [hit.project_id]: null }));
        return;
      }

      const params: CheckContentParams = {
        profile_id: selectedProfileId,
        project_id: hit.project_id,
        game_version: selectedProfile.game_version || null,
        loader: selectedProfile.loader || null,
        version_id: null,
        file_hash_sha1: null,
        file_name: null,
        project_type: hit.project_type,
      };

      try {
        console.debug(
          `Checking install status for ${hit.project_id} in profile ${selectedProfileId}`,
        );
        const status = await invoke<ContentInstallStatus>(
          "is_content_installed",
          { params },
        );
        console.debug(`Status for ${hit.project_id}:`, status);
        setHitInstallStatus((prev) => ({ ...prev, [hit.project_id]: status }));
      } catch (err) {
        console.error(
          `Failed to check install status for ${hit.project_id}:`,
          err,
        );
        setHitInstallStatus((prev) => ({ ...prev, [hit.project_id]: "error" }));
      }
    },
    [selectedProfileId, validProfiles],
  );

  // Function to check all visible projects
  const updateAllHitStatuses = useCallback(
    async (hits: ModrinthSearchHit[]) => {
      const promises = hits.map((hit) => updateHitInstallStatus(hit));
      await Promise.all(promises);
    },
    [updateHitInstallStatus],
  );

  // Function to check specific versions
  const updateVersionStatuses = useCallback(
    async (versions: ModrinthVersion[]) => {
      if (!selectedProfileId || versions.length === 0) {
        setVersionInstallStatus({});
        return;
      }

      const selectedProfile = validProfiles.find(
        (p) => p.id === selectedProfileId,
      );
      if (!selectedProfile) {
        setVersionInstallStatus({});
        return;
      }

      let newVersionStatuses: Record<
        string,
        ContentInstallStatus | "loading" | "error" | null
      > = {};

      const promises = versions.map(async (version) => {
        newVersionStatuses = { ...newVersionStatuses, [version.id]: "loading" };
        setVersionInstallStatus({ ...newVersionStatuses });

        const primaryFile =
          version.files.find((f) => f.primary) ?? version.files[0];
        const fileHash = primaryFile?.hashes?.sha1;
        const fileName = primaryFile?.filename;

        const params: CheckContentParams = {
          profile_id: selectedProfileId,
          project_id: version.project_id,
          version_id: version.id,
          file_hash_sha1: fileHash || null,
          file_name: fileName || null,
          pack_version_number: version.version_number,
          project_type: version.search_hit?.project_type || null,
          game_version: selectedProfile.game_version || null,
          loader: selectedProfile.loader || null,
        };

        try {
          console.info(`Checking specific install status for version`, version);
          const status = await invoke<ContentInstallStatus>(
            "is_content_installed",
            { params },
          );
          console.info(`Status for version ${version.id}:`, status);
          newVersionStatuses = { ...newVersionStatuses, [version.id]: status };
        } catch (err) {
          console.error(
            `Failed to check specific install status for version ${version.id}:`,
            err,
          );
          newVersionStatuses = { ...newVersionStatuses, [version.id]: "error" };
        }
      });

      await Promise.all(promises);
      setVersionInstallStatus(newVersionStatuses);
    },
    [selectedProfileId, validProfiles],
  );

  // Check if the current project type requires loader compatibility
  const requiresLoader = useCallback(
    (projectType: ModrinthProjectType = selectedProjectType) => {
      return projectType === "mod" || projectType === "modpack";
    },
    [selectedProjectType],
  );

  // Extract unique game versions and loaders from profiles
  useEffect(() => {
    if (validProfiles.length > 0) {
      const gameVersions = [
        ...new Set(validProfiles.map((p) => p.game_version)),
      ].filter(Boolean);
      const loaders = [...new Set(validProfiles.map((p) => p.loader))].filter(
        Boolean,
      );

      setAvailableGameVersions(gameVersions);
      setAvailableLoaders(loaders);

      // Set default filters if a profile is selected
      if (selectedProfileId) {
        const selectedProfile = validProfiles.find(
          (p) => p.id === selectedProfileId,
        );
        if (selectedProfile) {
          setSelectedGameVersion(selectedProfile.game_version);
          if (requiresLoader()) {
            setSelectedLoader(selectedProfile.loader);
          } else {
            setSelectedLoader(undefined); // Clear loader filter for non-mod content
          }
        } else {
          console.warn(
            "Selected profile not found in profiles array:",
            selectedProfileId,
          );
        }
      }
    } else {
      console.warn("No profiles available");
    }
  }, [validProfiles, selectedProfileId, requiresLoader]);

  // Update loader filter when project type changes
  useEffect(() => {
    if (!requiresLoader()) {
      setSelectedLoader(undefined);
    } else if (selectedProfileId) {
      // If we have a selected profile and we're switching to a project type that requires a loader,
      // set the loader filter to the profile's loader
      const selectedProfile = validProfiles.find(
        (p) => p.id === selectedProfileId,
      );
      if (selectedProfile) {
        setSelectedLoader(selectedProfile.loader);
      }
    }
  }, [selectedProjectType, requiresLoader, selectedProfileId, validProfiles]);

  // Filter versions when filters change
  useEffect(() => {
    if (modVersions.length > 0) {
      let filtered = [...modVersions];

      if (selectedGameVersion) {
        filtered = filtered.filter((version) =>
          version.game_versions?.includes(selectedGameVersion),
        );
      }

      if (selectedLoader && requiresLoader()) {
        filtered = filtered.filter((version) =>
          version.loaders?.includes(selectedLoader),
        );
      }

      setFilteredVersions(filtered);
    } else {
      setFilteredVersions([]);
    }
  }, [modVersions, selectedGameVersion, selectedLoader, requiresLoader]);

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

  const loadFeaturedContent = useCallback(
    async (projectType = selectedProjectType) => {
      // Check if a search is already in progress
      if (searchInProgressRef.current) return;

      // Set the flag to indicate a search is in progress
      searchInProgressRef.current = true;

      setSearchLoading(true);
      setSearchError(null);
      setHitInstallStatus({}); // Clear old statuses

      try {
        // Only pass loader if the project type requires it
        const loaderParam =
          projectType === "mod" || projectType === "modpack"
            ? selectedLoader
            : undefined;

        const response = await ModrinthService.searchProjects(
          "",
          projectType,
          selectedGameVersion,
          loaderParam,
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

        // Check installation status for all results
        updateAllHitStatuses(response.hits);
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
    [
      pageSize,
      selectedProjectType,
      selectedGameVersion,
      selectedLoader,
      updateAllHitStatuses,
    ],
  );

  useEffect(() => {
    if (projectId) {
      const loadProject = async () => {
        try {
          const projects = await ModrinthService.getProjectDetails([projectId]);
          if (!projects || projects.length === 0) {
            throw new Error("Project not found");
          }

          const project = projects[0];

          const searchHit: ModrinthSearchHit = {
            project_id: project.id,
            project_type: project.project_type,
            slug: project.slug,
            author: project.team || "Unknown",
            title: project.title,
            description: project.description,
            versions: project.versions,
            downloads: project.downloads,
            follows: project.followers,
            icon_url: project.icon_url,
            latest_version: project.versions[0] || null,
          };

          setSearchResults([searchHit]);
          setCurrentlySelectedHit(searchHit);
          setSelectedProjectId(projectId);
          setSelectedProjectType(project.project_type as ModrinthProjectType);

          await fetchVersions(projectId, searchHit);

          // Check installation status
          if (selectedProfileId) {
            updateHitInstallStatus(searchHit);
          }

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
  }, [projectId, autoInstall, selectedProfileId, updateHitInstallStatus]);

  const fetchVersions = async (projectId: string, hit: ModrinthSearchHit) => {
    setVersionsLoading(true);
    setVersionsError(null);
    setModVersions([]);
    setFilteredVersions([]);
    setVersionInstallStatus({}); // Clear specific version statuses when opening/closing

    try {
      // First fetch all versions without filters to get the complete list
      const allVersionsData = await ModrinthService.getModVersions(
        projectId,
        undefined,
        undefined,
      );

      const versionsWithHit = allVersionsData.map((v) => ({
        ...v,
        search_hit: hit,
      }));

      // Set all versions
      setModVersions(versionsWithHit);

      // If we have a selected profile, automatically filter based on its game version and loader
      if (selectedProfileId) {
        const selectedProfile = validProfiles.find(
          (p) => p.id === selectedProfileId,
        );
        if (selectedProfile) {
          // Apply filters based on the selected profile
          let filtered = [...versionsWithHit];

          // Filter by game version
          if (selectedProfile.game_version) {
            filtered = filtered.filter((version) =>
              version.game_versions?.includes(selectedProfile.game_version),
            );
          }

          // Filter by loader for mods and modpacks
          if (
            (hit.project_type === "mod" || hit.project_type === "modpack") &&
            selectedProfile.loader
          ) {
            filtered = filtered.filter((version) =>
              version.loaders?.includes(selectedProfile.loader),
            );
          }

          setFilteredVersions(filtered);

          // Check installation status for all versions
          updateVersionStatuses(versionsWithHit);
        } else {
          console.warn("Selected profile not found:", selectedProfileId);
          setFilteredVersions(versionsWithHit);
        }
      } else {
        setFilteredVersions(versionsWithHit);
      }
    } catch (err) {
      console.error(`Failed to fetch versions for ${projectId}:`, err);
      setVersionsError(
        `Failed to load versions: ${err instanceof Error ? err.message : String(err)}`,
      );
      setModVersions([]);
      setFilteredVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  // Update the autoInstallLatestVersion function to handle modpacks correctly
  const autoInstallLatestVersion = (
    hit: ModrinthSearchHit,
    profileId: string,
  ) => {
    if (filteredVersions.length === 0) {
      console.error("No versions available for auto-install");
      return;
    }

    const latestVersion = filteredVersions[0];
    const primaryFile =
      latestVersion.files.find((f) => f.primary) || latestVersion.files[0];

    if (!primaryFile) {
      console.error("No files available for auto-install");
      return;
    }

    // If it's a modpack, install it directly without profile selection
    if (hit.project_type === "modpack") {
      handleModpackInstall(latestVersion, primaryFile);
    } else {
      directInstallToProfile(latestVersion, primaryFile, profileId);
    }
  };

  const performSearch = useCallback(
    async (resetResults = true) => {
      // Don't search if there's no search term and we're resetting results
      if (resetResults && debouncedSearchTerm.trim() === "") return;

      // Check if a search is already in progress
      if (searchInProgressRef.current) {
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
      setHitInstallStatus({}); // Clear old statuses
      const currentOffset = resetResults ? 0 : offset;

      try {
        // Only pass loader if the project type requires it
        const loaderParam = requiresLoader() ? selectedLoader : undefined;

        const response = await ModrinthService.searchProjects(
          debouncedSearchTerm.trim(),
          selectedProjectType,
          selectedGameVersion,
          loaderParam,
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
          setFilteredVersions([]);
          setVersionsError(null);
        }

        // Check installation status for all results
        updateAllHitStatuses(response.hits);
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
      selectedGameVersion,
      selectedLoader,
      requiresLoader,
      updateAllHitStatuses,
    ],
  );

  // Only perform search when debounced search term changes and is not empty
  useEffect(() => {
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
        setHitInstallStatus({}); // Clear old statuses

        try {
          // Only pass loader if the project type requires it
          const loaderParam = requiresLoader() ? selectedLoader : undefined;

          const response = await ModrinthService.searchProjects(
            debouncedSearchTerm.trim(),
            selectedProjectType,
            selectedGameVersion,
            loaderParam,
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
          setFilteredVersions([]);
          setVersionsError(null);

          // Check installation status for all results
          updateAllHitStatuses(response.hits);
        } catch (err) {
          const searchError = err as Error;
          console.error("Modrinth search failed:", searchError);
          setSearchError(
            `Search failed: ${searchError.message || String(searchError)}`,
          );
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
  }, [
    debouncedSearchTerm,
    selectedProjectType,
    selectedSortType,
    pageSize,
    selectedGameVersion,
    selectedLoader,
    requiresLoader,
    updateAllHitStatuses,
  ]);

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
        setFilteredVersions([]);
        setVersionsError(null);
        setCurrentlySelectedHit(null);
        setVersionInstallStatus({}); // Clear specific version statuses when closing
        return;
      }

      setSelectedProjectId(projectId);
      setCurrentlySelectedHit(hit);

      // Set project type based on the selected hit
      if (hit.project_type) {
        setSelectedProjectType(hit.project_type as ModrinthProjectType);
      }

      // Auto-select profile filters if a profile is selected
      if (selectedProfileId) {
        const selectedProfile = validProfiles.find(
          (p) => p.id === selectedProfileId,
        );
        if (selectedProfile) {
          // Always set game version filter
          setSelectedGameVersion(selectedProfile.game_version);

          // Only set loader filter for mods and modpacks
          if (hit.project_type === "mod" || hit.project_type === "modpack") {
            setSelectedLoader(selectedProfile.loader);
          } else {
            setSelectedLoader(undefined);
          }
        }
      }

      await fetchVersions(projectId, hit);
    },
    [selectedProjectId, selectedProfileId, validProfiles],
  );

  const changeProjectType = useCallback(
    (newType: ModrinthProjectType) => {
      if (selectedProjectType === newType) return;

      setSelectedProjectType(newType);

      // Clear loader filter if switching to a project type that doesn't need it
      if (newType !== "mod" && newType !== "modpack") {
        setSelectedLoader(undefined);
      }

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
          setHitInstallStatus({}); // Clear old statuses

          try {
            // Only pass loader if the project type requires it
            const loaderParam =
              newType === "mod" || newType === "modpack"
                ? selectedLoader
                : undefined;

            const response = await ModrinthService.searchProjects(
              debouncedSearchTerm.trim(),
              newType,
              selectedGameVersion,
              loaderParam,
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
            setFilteredVersions([]);
            setVersionsError(null);

            // Check installation status for all results
            updateAllHitStatuses(response.hits);
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
    [
      selectedProjectType,
      debouncedSearchTerm,
      pageSize,
      selectedSortType,
      selectedGameVersion,
      selectedLoader,
      loadFeaturedContent,
      updateAllHitStatuses,
    ],
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
        setHitInstallStatus({}); // Clear old statuses

        try {
          // Only pass loader if the project type requires it
          const loaderParam = requiresLoader() ? selectedLoader : undefined;

          const response = await ModrinthService.searchProjects(
            debouncedSearchTerm.trim(),
            selectedProjectType,
            selectedGameVersion,
            loaderParam,
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
          setFilteredVersions([]);
          setVersionsError(null);

          // Check installation status for all results
          updateAllHitStatuses(response.hits);
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
    [
      selectedSortType,
      selectedProjectType,
      debouncedSearchTerm,
      pageSize,
      selectedGameVersion,
      selectedLoader,
      requiresLoader,
      updateAllHitStatuses,
    ],
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
      {!projectId && (
        <>
          <div className="project-type-tabs flex mb-2 bg-black/20 backdrop-blur-md border border-white/10 w-full">
            {PROJECT_TYPES.map((tab) => (
              <button
                key={tab.type}
                className={`flex-1 px-4 py-2 font-minecraft text-3xl lowercase select-none tracking-wide ${
                  selectedProjectType === tab.type
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => changeProjectType(tab.type)}
                disabled={searchLoading}
              >
                {tab.label.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
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

          {searchError && (
            <ErrorMessage message={searchError} className="mb-4" />
          )}
        </>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden border border-white/10">
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
                    <div key={hit.project_id} className="relative">
                      <ModrinthProjectCard
                        key={hit.project_id}
                        project={hit}
                        isExpanded={selectedProjectId === hit.project_id}
                        isLoading={
                          versionsLoading &&
                          selectedProjectId === hit.project_id
                        }
                        onToggleExpand={() => fetchAndShowVersions(hit)}
                        installStatus={hitInstallStatus[hit.project_id]}
                      >
                        {selectedProjectId === hit.project_id && (
                          <div className="versions-container mt-4 pt-4 border-t border-white/10">
                            {versionsLoading ? (
                              <LoadingIndicator message="Loading versions..." />
                            ) : versionsError ? (
                              <ErrorMessage message={versionsError} />
                            ) : filteredVersions.length > 0 ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-white font-minecraft text-2xl tracking-wide lowercase select-none">
                                    Available Versions:
                                  </h4>

                                  {/* Version filters */}
                                  {modVersions.length !==
                                    filteredVersions.length && (
                                    <button
                                      onClick={() => {
                                        setFilteredVersions(modVersions);
                                        setSelectedGameVersion(undefined);
                                        setSelectedLoader(undefined);
                                      }}
                                      className="text-white/70 hover:text-white text-xs font-minecraft flex items-center gap-1"
                                    >
                                      <Icon
                                        icon="pixel:filter-solid"
                                        className="w-3 h-3"
                                      />
                                      <span>
                                        Show All ({modVersions.length})
                                      </span>
                                    </button>
                                  )}
                                </div>
                                <div className="versions-list space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                  {filteredVersions.map((version) => {
                                    const primaryFile =
                                      version.files.find((f) => f.primary) ??
                                      version.files[0];
                                    const versionStatus =
                                      versionInstallStatus[version.id];
                                    const isVersionInstalled =
                                      typeof versionStatus === "object" &&
                                      versionStatus !== null &&
                                      versionStatus.is_installed;

                                    // Determine if this is a modpack
                                    const isModpack =
                                      version.search_hit?.project_type ===
                                      "modpack";

                                    // Get the appropriate install state
                                    const installState = isModpack
                                      ? modpackInstallState[version.id] ||
                                        "idle"
                                      : isVersionInstalled
                                        ? "success"
                                        : addingModState[version.id] || "idle";

                                    return primaryFile ? (
                                      <div
                                        key={version.id}
                                        className="relative"
                                      >
                                        <ModrinthVersionItem
                                          key={version.id}
                                          version={version}
                                          file={primaryFile}
                                          installState={installState}
                                          onInstall={() =>
                                            handleInstallButtonClick(
                                              version,
                                              primaryFile,
                                            )
                                          }
                                          isModpack={isModpack}
                                        />

                                        {/* Version Status Indicators */}
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                                          {versionStatus === "loading" ? (
                                            <span className="bg-black/40 p-1 ml-1">
                                              <Icon
                                                icon="pixel:circle-notch-solid"
                                                className="w-3 h-3 text-white/70 animate-spin"
                                              />
                                            </span>
                                          ) : versionStatus === "error" ? (
                                            <span
                                              className="bg-red-900/40 p-1 ml-1"
                                              title="Error checking installation status"
                                            >
                                              <Icon
                                                icon="pixel:exclamation-triangle-solid"
                                                className="w-3 h-3 text-red-400"
                                              />
                                            </span>
                                          ) : typeof versionStatus ===
                                              "object" &&
                                            versionStatus !== null ? (
                                            <></>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            ) : (
                              <EmptyState
                                message={
                                  modVersions.length > 0
                                    ? "No versions match the selected filters."
                                    : "No versions found matching the criteria."
                                }
                              />
                            )}
                          </div>
                        )}
                      </ModrinthProjectCard>
                    </div>
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
          profiles={validProfiles}
          onSelect={handleProfileSelect}
          onCancel={() => {
            setShowProfilePopup(false);
            setPendingInstall(null);
          }}
          title={`Install ${pendingInstall.version.search_hit?.project_type || "Content"}`}
          description={`Choose a profile to install "${
            pendingInstall.version.search_hit?.title || "this content"
          }" to:`}
          contentVersion={pendingInstall.version}
        />
      )}

      {addError && (
        <div className="fixed bottom-4 right-4 bg-black/70 backdrop-blur-md border border-red-500/30 text-white px-4 py-3 font-minecraft-ten text-2xl shadow-md z-50 tracking-wide lowercase select-none">
          <Icon
            icon="pixel:exclamation-triangle-solid"
            className="inline-block mr-2 w-5 h-5 text-red-400"
          />
          {addError}
        </div>
      )}
    </div>
  );
};
