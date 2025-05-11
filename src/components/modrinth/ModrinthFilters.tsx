"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ModrinthService } from "../../services/modrinth-service";
import type { ModrinthCategory, ModrinthProjectType } from "../../types/modrinth";
import { LoadingState } from "../ui/LoadingState";
import { ErrorMessage } from "../ui/ErrorMessage";

interface ModrinthFiltersProps {
  projectType: ModrinthProjectType;
  onFilterChange?: (selectedCategories: string[]) => void;
}

export function ModrinthFilters({ projectType, onFilterChange }: ModrinthFiltersProps) {
  const [allCategories, setAllCategories] = useState<ModrinthCategory[]>([]);
  const [displayedCategories, setDisplayedCategories] = useState<ModrinthCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const fetchedCategories = await ModrinthService.getModrinthCategories();
        setAllCategories(fetchedCategories);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch Modrinth categories:", err);
        setError(
          `Failed to load categories: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoading(false);
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

  const toggleCategory = (categoryName: string) => {
    const newSelectedCategories = selectedCategories.includes(categoryName)
      ? selectedCategories.filter((name) => name !== categoryName)
      : [...selectedCategories, categoryName];
    setSelectedCategories(newSelectedCategories);
    onFilterChange?.(newSelectedCategories);
  };

  return (
    <div className="border border-gray-700 rounded-md p-3 bg-gray-850 flex flex-col h-full">
      <div
        className="flex justify-between items-center cursor-pointer mb-2"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-lg font-semibold text-gray-200">Categories</h3>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading && <LoadingState message="Loading filters..." />}
          {error && <ErrorMessage message={error} />}
          {!isLoading && !error && displayedCategories.length === 0 && (
            <p className="text-gray-400">
              {projectType ? `No categories found for ${projectType}.` : "No categories found."}
            </p>
          )}
          {!isLoading && !error && displayedCategories.length > 0 && (
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
  );
} 