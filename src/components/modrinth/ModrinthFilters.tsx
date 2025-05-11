"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ModrinthService } from "../../services/modrinth-service";
import type {
  ModrinthCategory,
  ModrinthProjectType,
  ModrinthGameVersion,
  ModrinthLoader,
} from "../../types/modrinth";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { Input } from "../ui/Input";

interface ModrinthFiltersProps {
  projectType: ModrinthProjectType;
  onFilterChange?: (selectedCategories: string[]) => void;
  onGameVersionChange?: (selectedGameVersions: string[]) => void;
  onLoaderChange?: (selectedLoaders: string[]) => void;
  onEnvironmentChange?: (selectedOptions: string[]) => void;
}

export function ModrinthFilters({
  projectType,
  onFilterChange,
  onGameVersionChange,
  onLoaderChange,
  onEnvironmentChange,
}: ModrinthFiltersProps) {
  console.log("[ModrinthFilters] projectType prop:", projectType);

  const [allCategories, setAllCategories] = useState<ModrinthCategory[]>([]);
  const [displayedCategories, setDisplayedCategories] = useState<ModrinthCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false);

  const [allGameVersions, setAllGameVersions] = useState<ModrinthGameVersion[]>([]);
  const [selectedGameVersions, setSelectedGameVersions] = useState<string[]>([]);
  const [isLoadingGameVersions, setIsLoadingGameVersions] = useState(true);
  const [errorGameVersions, setErrorGameVersions] = useState<string | null>(null);
  const [isGameVersionsCollapsed, setIsGameVersionsCollapsed] = useState(false);
  const [gameVersionSearchTerm, setGameVersionSearchTerm] = useState("");
  const [showOnlyMainGameVersions, setShowOnlyMainGameVersions] = useState(true);

  const [allLoaders, setAllLoaders] = useState<ModrinthLoader[]>([]);
  const [displayedLoaders, setDisplayedLoaders] = useState<ModrinthLoader[]>([]);
  const [selectedLoaders, setSelectedLoaders] = useState<string[]>([]);
  const [isLoadingLoaders, setIsLoadingLoaders] = useState(true);
  const [errorLoaders, setErrorLoaders] = useState<string | null>(null);
  const [isLoadersCollapsed, setIsLoadersCollapsed] = useState(false);

  const [selectedEnvironment, setSelectedEnvironment] = useState<string[]>([]);
  const [isEnvironmentCollapsed, setIsEnvironmentCollapsed] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const fetchedCategories = await ModrinthService.getModrinthCategories();
        setAllCategories(fetchedCategories);
        setErrorCategories(null);
      } catch (err) {
        console.error("Failed to fetch Modrinth categories:", err);
        setErrorCategories(
          `Failed to load categories: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (projectType && allCategories.length > 0) {
      const filtered = allCategories.filter((category) => {
        return category.project_type === projectType;
      });
      setDisplayedCategories(filtered);
    } else if (allCategories.length > 0) {
      setDisplayedCategories(allCategories);
    } else {
      setDisplayedCategories([]);
    }
  }, [allCategories, projectType]);

  useEffect(() => {
    const fetchGameVersions = async () => {
      setIsLoadingGameVersions(true);
      try {
        const fetchedGameVersions = await ModrinthService.getModrinthGameVersions();
        setAllGameVersions(fetchedGameVersions);
        setErrorGameVersions(null);
      } catch (err) {
        console.error("Failed to fetch Modrinth game versions:", err);
        setErrorGameVersions(
          `Failed to load game versions: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingGameVersions(false);
      }
    };

    fetchGameVersions();
  }, []);

  const displayedGameVersions = useMemo(() => {
    let versions = allGameVersions;
    if (showOnlyMainGameVersions) {
      versions = versions.filter((gv) => gv.version_type === "release");
    }
    if (gameVersionSearchTerm) {
      versions = versions.filter((gv) =>
        gv.version.toLowerCase().includes(gameVersionSearchTerm.toLowerCase()),
      );
    }
    return versions;
  }, [allGameVersions, showOnlyMainGameVersions, gameVersionSearchTerm]);

  useEffect(() => {
    const fetchLoaders = async () => {
      setIsLoadingLoaders(true);
      try {
        const fetchedLoaders = await ModrinthService.getModrinthLoaders();
        console.log("[ModrinthFilters] Fetched allLoaders:", fetchedLoaders);
        setAllLoaders(fetchedLoaders);
        setErrorLoaders(null);
      } catch (err) {
        console.error("Failed to fetch Modrinth loaders:", err);
        setErrorLoaders(
          `Failed to load loaders: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingLoaders(false);
      }
    };
    fetchLoaders();
  }, []);

  useEffect(() => {
    console.log("[ModrinthFilters] Filtering loaders. projectType:", projectType, "allLoaders count:", allLoaders.length);
    if (projectType && allLoaders.length > 0) {
      const filtered = allLoaders.filter(
        (loader) => loader.supported_project_types.includes(projectType)
      );
      console.log("[ModrinthFilters] Filtered loaders (with projectType):", filtered);
      setDisplayedLoaders(filtered);
    } else if (allLoaders.length > 0 && !projectType) {
      const filtered = allLoaders.filter(l => l.supported_project_types.includes("project") || l.supported_project_types.length > 0);
      console.log("[ModrinthFilters] Filtered loaders (no projectType, broad):", filtered);
      setDisplayedLoaders(filtered);
    } else {
      console.log("[ModrinthFilters] No projectType or no allLoaders, setting displayedLoaders to empty.");
      setDisplayedLoaders([]);
    }
  }, [allLoaders, projectType]);

  useEffect(() => {
    console.log("[ModrinthFilters] displayedLoaders state updated:", displayedLoaders);
  }, [displayedLoaders]);

  const toggleCategory = (categoryName: string) => {
    const newSelectedCategories = selectedCategories.includes(categoryName)
      ? selectedCategories.filter((name) => name !== categoryName)
      : [...selectedCategories, categoryName];
    setSelectedCategories(newSelectedCategories);
    onFilterChange?.(newSelectedCategories);
  };

  const toggleGameVersion = (versionName: string) => {
    const newSelectedGameVersions = selectedGameVersions.includes(versionName)
      ? selectedGameVersions.filter((name) => name !== versionName)
      : [...selectedGameVersions, versionName];
    setSelectedGameVersions(newSelectedGameVersions);
    onGameVersionChange?.(newSelectedGameVersions);
  };

  const toggleLoader = (loaderName: string) => {
    const newSelectedLoaders = selectedLoaders.includes(loaderName)
      ? selectedLoaders.filter((name) => name !== loaderName)
      : [...selectedLoaders, loaderName];
    setSelectedLoaders(newSelectedLoaders);
    onLoaderChange?.(newSelectedLoaders);
  };

  const toggleEnvironment = (option: 'client' | 'server') => {
    const newSelectedEnvironment = selectedEnvironment.includes(option)
      ? selectedEnvironment.filter((item) => item !== option)
      : [...selectedEnvironment, option];
    setSelectedEnvironment(newSelectedEnvironment);
    onEnvironmentChange?.(newSelectedEnvironment);
  };

  return (
    <div className="border border-gray-700 rounded-md p-3 bg-gray-850 flex flex-col h-full space-y-3">
      <div>
        <div
          className="flex justify-between items-center cursor-pointer mb-2"
          onClick={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
        >
          <h3 className="text-lg font-semibold text-gray-200">Categories</h3>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label={isCategoriesCollapsed ? "Expand categories" : "Collapse categories"}
          >
            {isCategoriesCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!isCategoriesCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col max-h-60">
            {isLoadingCategories && <LoadingState message="Loading categories..." />}
            {errorCategories && <ErrorMessage message={errorCategories} />}
            {!isLoadingCategories && !errorCategories && displayedCategories.length === 0 && (
              <p className="text-gray-400">
                {projectType ? `No categories found for ${projectType}.` : "No categories found."}
              </p>
            )}
            {!isLoadingCategories && !errorCategories && displayedCategories.length > 0 && (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {displayedCategories.map((category) => (
                    <label
                      key={category.name}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
                      title={category.project_type}
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-accent-500 border-gray-600 rounded bg-gray-700 focus:ring-accent-500"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => toggleCategory(category.name)}
                      />
                      <span className="text-gray-300 text-sm flex items-center">
                        <span
                          className="w-4 h-4 mr-2 inline-block align-middle"
                          dangerouslySetInnerHTML={{ __html: category.icon }}
                          title={category.name}
                        />
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div
          className="flex justify-between items-center cursor-pointer mb-2"
          onClick={() => setIsGameVersionsCollapsed(!isGameVersionsCollapsed)}
        >
          <h3 className="text-lg font-semibold text-gray-200">Game Versions</h3>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label={isGameVersionsCollapsed ? "Expand game versions" : "Collapse game versions"}
          >
            {isGameVersionsCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!isGameVersionsCollapsed && (
          <div className="flex flex-col space-y-2">
            <Input
              type="text"
              placeholder="Search game versions..."
              value={gameVersionSearchTerm}
              onChange={(e) => setGameVersionSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 text-sm rounded p-2 focus:ring-accent-500 focus:border-accent-500"
            />
            <div className="flex-1 overflow-hidden flex flex-col max-h-60">
              {isLoadingGameVersions && <LoadingState message="Loading game versions..." />}
              {errorGameVersions && <ErrorMessage message={errorGameVersions} />}
              {!isLoadingGameVersions && !errorGameVersions && displayedGameVersions.length === 0 && (
                <p className="text-gray-400">
                  {gameVersionSearchTerm ? "No matching game versions found." : "No game versions found."}
                </p>
              )}
              {!isLoadingGameVersions && !errorGameVersions && displayedGameVersions.length > 0 && (
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {displayedGameVersions.map((gameVersion) => (
                      <label
                        key={gameVersion.version}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
                        title={`Type: ${gameVersion.version_type}`}
                      >
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-accent-500 border-gray-600 rounded bg-gray-700 focus:ring-accent-500"
                          checked={selectedGameVersions.includes(gameVersion.version)}
                          onChange={() => toggleGameVersion(gameVersion.version)}
                        />
                        <span className="text-gray-300 text-sm">
                          {gameVersion.version} <span className="text-xs text-gray-500">({gameVersion.version_type})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyMainGameVersions(!showOnlyMainGameVersions)}
              className="w-full text-sm p-2 mt-2 rounded hover:bg-gray-700 bg-gray-750 border border-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              {showOnlyMainGameVersions ? "Show All Versions" : "Show Main Releases Only"}
            </button>
          </div>
        )}
      </div>

      {/* Loaders Section - Conditionally rendered */}
      {!isLoadingLoaders && !errorLoaders && displayedLoaders.length > 0 && (
        <div>
          <div
            className="flex justify-between items-center cursor-pointer mb-2"
            onClick={() => setIsLoadersCollapsed(!isLoadersCollapsed)}
          >
            <h3 className="text-lg font-semibold text-gray-200">Loaders</h3>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label={isLoadersCollapsed ? "Expand loaders" : "Collapse loaders"}
            >
              {isLoadersCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>

          {!isLoadersCollapsed && (
            <div className="flex-1 overflow-hidden flex flex-col max-h-60">
              {/* No need to check isLoadingLoaders/errorLoaders again here, already checked above */}
              {/* No need to check displayedLoaders.length === 0 again, already checked above */}
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {displayedLoaders.map((loader) => (
                    <label
                      key={loader.name}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
                      title={loader.supported_project_types.join(', ')}
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-accent-500 border-gray-600 rounded bg-gray-700 focus:ring-accent-500"
                        checked={selectedLoaders.includes(loader.name)}
                        onChange={() => toggleLoader(loader.name)}
                      />
                      <span className="text-gray-300 text-sm flex items-center">
                        <span
                          className="w-4 h-4 mr-2 inline-block align-middle"
                          dangerouslySetInnerHTML={{ __html: loader.icon }}
                          title={loader.name}
                        />
                        {loader.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Environment Section - Conditionally rendered for mod or modpack */}
      {(projectType === 'mod' || projectType === 'modpack') && (
        <div>
          <div
            className="flex justify-between items-center cursor-pointer mb-2"
            onClick={() => setIsEnvironmentCollapsed(!isEnvironmentCollapsed)}
          >
            <h3 className="text-lg font-semibold text-gray-200">Environment</h3>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label={isEnvironmentCollapsed ? "Expand environment" : "Collapse environment"}
            >
              {isEnvironmentCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>

          {!isEnvironmentCollapsed && (
            <div className="space-y-2">
              <label
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-accent-500 border-gray-600 rounded bg-gray-700 focus:ring-accent-500"
                  checked={selectedEnvironment.includes('client')}
                  onChange={() => toggleEnvironment('client')}
                />
                <span className="text-gray-300 text-sm">Client-Side</span>
              </label>
              <label
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-accent-500 border-gray-600 rounded bg-gray-700 focus:ring-accent-500"
                  checked={selectedEnvironment.includes('server')}
                  onChange={() => toggleEnvironment('server')}
                />
                <span className="text-gray-300 text-sm">Server-Side</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 