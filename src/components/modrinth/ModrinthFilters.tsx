"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ModrinthService } from "../../services/modrinth-service";
import type {
  ModrinthCategory,
  ModrinthProjectType,
  ModrinthGameVersion,
} from "../../types/modrinth";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";
import { Input } from "../ui/Input";

interface ModrinthFiltersProps {
  projectType: ModrinthProjectType;
  onFilterChange?: (selectedCategories: string[]) => void;
  onGameVersionChange?: (selectedGameVersions: string[]) => void;
}

export function ModrinthFilters({
  projectType,
  onFilterChange,
  onGameVersionChange,
}: ModrinthFiltersProps) {
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
    </div>
  );
} 