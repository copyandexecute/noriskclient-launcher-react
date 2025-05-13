"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModrinthService } from '../../../services/modrinth-service';
import type {
  ModrinthSearchHit,
  ModrinthProjectType,
  ModrinthSearchResponse,
  ModrinthCategory,
  ModrinthGameVersion,
  ModrinthLoader,
  ModrinthSortType,
  ModrinthVersion
} from '../../../types/modrinth';
import * as ProfileService from '../../../services/profile-service';
import { toast } from 'react-hot-toast';
import { Button } from '../../ui/buttons/Button';
import { SearchInput } from '../../ui/SearchInput';
import { Dropdown } from '../../ui/dropdown/Dropdown';
import { Icon } from '@iconify/react';
import { cn } from '../../../lib/utils';
import { Select } from '../../ui/Select'; // Import Select component
import { IconButton } from '../../ui/buttons/IconButton'; // Import IconButton
import { useThemeStore } from '../../../store/useThemeStore'; // Import useThemeStore
import { TagBadge } from '../../ui/TagBadge'; // Import TagBadge
import { Input } from '../../ui/Input'; // Import Input component
import { Checkbox } from '../../ui/Checkbox'; // Import Checkbox component
import { ModrinthVersionItemV2 } from './ModrinthVersionItemV2'; // Import the new component
import { ModrinthVersionListV2 } from './ModrinthVersionListV2'; // Import the new version list component
import { ModrinthQuickInstallModalV2 } from './ModrinthQuickInstallModalV2'; // Import the quick install modal
import { ModrinthInstallModalV2 } from './ModrinthInstallModalV2'; // Import the detailed install modal
import { ModrinthFilterSidebarV2 } from './ModrinthFilterSidebarV2'; // Import the new sidebar component
import { ModrinthProjectCardV2 } from './ModrinthProjectCardV2'; // Import the new project card component
import { ModrinthSearchControlsV2 } from './ModrinthSearchControlsV2'; // Import the new search controls component

// Profile type can remain generic for now or be imported if a specific type exists
type Profile = any;

export interface ModrinthSearchV2Props {
  profiles: Profile[];
  onInstallSuccess?: () => void;
  className?: string;
  selectedProfileId?: string; // Optional ID of pre-selected profile
}

const ALL_MODRINTH_PROJECT_TYPES: ModrinthProjectType[] = ['mod', 'modpack', 'resourcepack', 'shader', 'datapack'];

// Define the order for known headers, others will be alphabetical
const PREFERRED_HEADER_ORDER = ["resolutions", "performance impact", "features", "categories"];

interface UIDynamicFilterGroup {
  accordionTitle: string;
  headerValue: string;
  options: ModrinthCategory[];
}

export function ModrinthSearchV2({
  profiles: initialProfiles,
  onInstallSuccess,
  className = '',
  selectedProfileId,
}: ModrinthSearchV2Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectType, setProjectType] = useState<ModrinthProjectType>('mod');
  const [searchResults, setSearchResults] = useState<ModrinthSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const limit = 20;

  // New state for Sort Order, now with ModrinthSortType
  const [sortOrder, setSortOrder] = useState<ModrinthSortType>('relevance');
  
  const sortOptions: { value: ModrinthSortType; label: string; icon?: React.ReactNode }[] = [
    { value: 'relevance', label: 'Relevance', icon: <Icon icon="solar:sort-bold" className="w-4 h-4" /> },
    { value: 'downloads', label: 'Downloads', icon: <Icon icon="solar:download-bold" className="w-4 h-4" /> },
    { value: 'follows', label: 'Follows', icon: <Icon icon="solar:heart-bold" className="w-4 h-4" /> },
    { value: 'newest', label: 'Newest', icon: <Icon icon="solar:calendar-mark-bold" className="w-4 h-4" /> }, // Changed icon
    { value: 'updated', label: 'Updated', icon: <Icon icon="solar:refresh-bold" className="w-4 h-4" /> },
  ];

  const [allCategoriesData, setAllCategoriesData] = useState<ModrinthCategory[]>([]);
  const [gameVersionsData, setGameVersionsData] = useState<ModrinthGameVersion[]>([]);
  const [allLoadersData, setAllLoadersData] = useState<ModrinthLoader[]>([]);

  const initialCategoriesState = useMemo(() => 
    ALL_MODRINTH_PROJECT_TYPES.reduce((acc, pt) => ({ ...acc, [pt]: [] }), {} as Record<ModrinthProjectType, string[]>)
  , []);
  const [selectedCategoriesByProjectType, setSelectedCategoriesByProjectType] = useState(initialCategoriesState);
  
  const [selectedLoadersByProjectType, setSelectedLoadersByProjectType] = useState(initialCategoriesState);
  
  const [selectedGameVersions, setSelectedGameVersions] = useState<string[]>([]); 
  const [showAllGameVersionsSidebar, setShowAllGameVersionsSidebar] = useState(false); // Renamed state and set default to false
  const [gameVersionSearchTerm, setGameVersionSearchTerm] = useState('');

  // New states for Environment filter
  const [filterClientRequired, setFilterClientRequired] = useState(false);
  const [filterServerRequired, setFilterServerRequired] = useState(false);

  // New state for expanded versions
  const [expandedVersions, setExpandedVersions] = useState<Record<string, ModrinthVersion[] | null | 'loading'>>({});

  // New state for managing how many versions are displayed per project
  const [numDisplayedVersions, setNumDisplayedVersions] = useState<Record<string, number>>({});
  const initialDisplayCount = 5;
  const loadMoreIncrement = 5;

  // New state for version filtering
  const [versionFilters, setVersionFilters] = useState<Record<string, {
    gameVersions: string[],
    loaders: string[],
    versionType: string
  }>>({});

  // State for installation modal
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ModrinthVersion | null>(null);
  const [selectedProject, setSelectedProject] = useState<ModrinthSearchHit | null>(null);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installStatus, setInstallStatus] = useState<Record<string, boolean>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Add new state for sidebar visibility
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Add state for currently selected profile
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // New state for tracking which projects are installed in the selected profile
  const [installedProjects, setInstalledProjects] = useState<Record<string, {
    is_installed: boolean,
    is_included_in_norisk_pack: boolean
  }>>({});

  // Add a state for tracking installed versions
  const [installedVersions, setInstalledVersions] = useState<Record<string, {
    is_installed: boolean,
    is_included_in_norisk_pack: boolean
  }>>({});

  // Internal state for profiles, synced with the prop
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>(initialProfiles);
  useEffect(() => {
    setInternalProfiles(initialProfiles);
  }, [initialProfiles]);

  const currentSelectedCategories = useMemo(() => {
    return selectedCategoriesByProjectType[projectType] || [];
  }, [selectedCategoriesByProjectType, projectType]);

  const currentSelectedLoaders = useMemo(() => {
    return selectedLoadersByProjectType[projectType] || [];
  }, [selectedLoadersByProjectType, projectType]);

  // Fetch filter data on mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setAllCategoriesData(await ModrinthService.getModrinthCategories());
        setGameVersionsData(await ModrinthService.getModrinthGameVersions());
        setAllLoadersData(await ModrinthService.getModrinthLoaders());
      } catch (err) { console.error("Failed to load filter data:", err); }
    };
    fetchFilterData();
  }, []);

  // Define preferred loader order
  const preferredLoaderOrder = ['fabric', 'forge', 'quilt', 'neoforge'];

  const availableLoaders = useMemo(() => {
    const loaders = allLoadersData.filter(loader => loader.supported_project_types.includes(projectType));
    // Sort loaders: preferred first, then alphabetical
    return loaders.sort((a, b) => {
      const indexA = preferredLoaderOrder.indexOf(a.name.toLowerCase());
      const indexB = preferredLoaderOrder.indexOf(b.name.toLowerCase());

      if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Both preferred
      if (indexA !== -1) return -1; // Only A is preferred
      if (indexB !== -1) return 1; // Only B is preferred
      return a.name.localeCompare(b.name); // Neither preferred, sort alphabetically
    });
  }, [allLoadersData, projectType]);

  const displayedGameVersions = useMemo(() => {
    let versions = gameVersionsData;
    // Inverted logic: Only filter for release if showAllGameVersionsSidebar is FALSE
    if (!showAllGameVersionsSidebar) { 
      versions = versions.filter(gv => gv.version_type === 'release'); 
    }
    if (gameVersionSearchTerm) { 
      versions = versions.filter(gv => gv.version.toLowerCase().includes(gameVersionSearchTerm.toLowerCase()));
    }
    return versions;
  }, [gameVersionsData, showAllGameVersionsSidebar, gameVersionSearchTerm]); // Use new state here

  // Dynamically generate filter groups based on headers for the current project type
  const dynamicFilterGroups = useMemo<UIDynamicFilterGroup[]>(() => {
    if (!allCategoriesData.length || !projectType) return [];

    const categoriesForProjectType = allCategoriesData.filter(cat => cat.project_type === projectType);
    const headers = [...new Set(categoriesForProjectType.map(cat => cat.header))];

    const groups = headers.map(header => {
      const optionsForHeader = categoriesForProjectType.filter(cat => cat.header === header);
      // Simple title generation: capitalize first letter, replace hyphens
      const accordionTitle = header.charAt(0).toUpperCase() + header.slice(1).replace(/-/g, ' ');
      return {
        accordionTitle,
        headerValue: header,
        options: optionsForHeader.sort((a, b) => a.name.localeCompare(b.name)), // Sort options alphabetically
      };
    });

    // Sort the groups themselves
    return groups.sort((a, b) => {
      const lowerA = a.headerValue.toLowerCase();
      const lowerB = b.headerValue.toLowerCase();
      const indexA = PREFERRED_HEADER_ORDER.indexOf(lowerA);
      const indexB = PREFERRED_HEADER_ORDER.indexOf(lowerB);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.accordionTitle.localeCompare(b.accordionTitle);
    });
  }, [allCategoriesData, projectType]);

  const performSearch = useCallback(async (newSearch = false) => {
    console.log('[ModrinthSearchV2] performSearch ENTRY:', {
      newSearch,
      projectType,
      searchTerm,
      categories: currentSelectedCategories,
      gameVersions: selectedGameVersions,
      loaders: currentSelectedLoaders,
      offset: newSearch ? 0 : offset // Log the offset that will be used
    });

    if (newSearch) {
      console.log('[ModrinthSearchV2] New search, resetting offset.');
      setOffset(0);
      // setSearchResults([]); // DO NOT clear previous results here to prevent flicker
    }

    console.log('[ModrinthSearchV2] Proceeding with API call. Setting loading true.');
    setLoading(true);
    setError(null);

    try {
      const response: ModrinthSearchResponse = await ModrinthService.searchProjects(
        searchTerm,
        projectType,
        selectedGameVersions.length > 0 ? selectedGameVersions[0] : undefined, 
        currentSelectedLoaders.length > 0 ? currentSelectedLoaders[0] : undefined, 
        limit,
        newSearch ? 0 : offset,
        sortOrder,
        currentSelectedCategories.length > 0 ? currentSelectedCategories : undefined,
        filterClientRequired ? "required" : undefined,
        filterServerRequired ? "required" : undefined
      );
      setSearchResults(prevResults => newSearch ? response.hits : [...prevResults, ...response.hits]);
      setTotalHits(response.total_hits);
      if (!newSearch) {
        setOffset(prevOffset => prevOffset + response.hits.length);
      } else {
        setOffset(response.hits.length);
      }
    } catch (err) {
      console.error("Failed to search Modrinth projects:", err);
      setError(`${err.message}`);
      if (newSearch) {
        setSearchResults([]);
        setTotalHits(0);
        setOffset(0);
      }
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm, projectType, offset, limit, sortOrder,
    currentSelectedCategories, selectedGameVersions, currentSelectedLoaders, 
    filterClientRequired, filterServerRequired,
    allCategoriesData, allLoadersData, gameVersionsData
  ]);

  useEffect(() => {
    console.log('[ModrinthSearchV2] useEffect for search triggered. Calling performSearch(true). Params:', {
      searchTerm,
      projectType,
      categories: currentSelectedCategories,
      gameVersions: selectedGameVersions,
      loaders: currentSelectedLoaders
    });
    
    // Reset expanded versions when filter changes
    setExpandedVersions({});
    setNumDisplayedVersions({});
    setVersionFilters({});
    
    performSearch(true);
  }, [
    searchTerm, projectType, sortOrder,
    currentSelectedCategories, selectedGameVersions, currentSelectedLoaders,
    filterClientRequired, filterServerRequired
  ]);

  const handleProjectTypeChange = (newProjectType: ModrinthProjectType) => {
    setProjectType(newProjectType);
  };

  // Simplified handleCategoryToggle - all category groups are multi-select
  const handleCategoryToggle = (categoryName: string) => {
    const currentSelectionsForActiveType = selectedCategoriesByProjectType[projectType] || [];
    const wasPreviouslySelected = currentSelectionsForActiveType.includes(categoryName);

    setSelectedCategoriesByProjectType(prevGlobalSelections => {
      const updatedSelectionsForCurrentType = wasPreviouslySelected
        ? currentSelectionsForActiveType.filter(c => c !== categoryName)
        : [...currentSelectionsForActiveType, categoryName];
      
      const newGlobalSelections = { ...prevGlobalSelections, [projectType]: updatedSelectionsForCurrentType };

      // Synchronize with other project types
      for (const otherPT of ALL_MODRINTH_PROJECT_TYPES) {
        if (otherPT === projectType) continue; // Skip the currently active type

        const selectionsForOtherPT = newGlobalSelections[otherPT] || [];
        
        if (wasPreviouslySelected) {
          // Category was REMOVED from the active project type
          // So, remove it from other project types as well if it was selected there
          if (selectionsForOtherPT.includes(categoryName)) {
            newGlobalSelections[otherPT] = selectionsForOtherPT.filter(c => c !== categoryName);
          }
        } else {
          // Category was ADDED to the active project type
          // Add it to other project types if the category is defined for them and not already present
          const categoryDefinitionForOtherPT = allCategoriesData.find(
            catDef => catDef.name === categoryName && catDef.project_type === otherPT
          );
          if (categoryDefinitionForOtherPT) {
            if (!selectionsForOtherPT.includes(categoryName)) {
              newGlobalSelections[otherPT] = [...selectionsForOtherPT, categoryName];
            }
          }
        }
      }
      return newGlobalSelections;
    });
  };

  const handleGameVersionToggle = (version: string) => {
    setSelectedGameVersions(prev =>
      prev.includes(version)
        ? prev.filter(v => v !== version)
        : [...prev, version]
    );
  };

  const handleLoaderToggle = (loaderName: string) => {
    const currentSelectionsForActiveType = selectedLoadersByProjectType[projectType] || [];
    const wasPreviouslySelected = currentSelectionsForActiveType.includes(loaderName);

    setSelectedLoadersByProjectType(prevGlobalSelections => {
      const updatedSelectionsForCurrentType = wasPreviouslySelected
        ? currentSelectionsForActiveType.filter(l => l !== loaderName)
        : [...currentSelectionsForActiveType, loaderName];
      
      const newGlobalSelections = { ...prevGlobalSelections, [projectType]: updatedSelectionsForCurrentType };

      // Synchronize with other project types
      for (const otherPT of ALL_MODRINTH_PROJECT_TYPES) {
        if (otherPT === projectType) continue; // Skip the currently active type

        const selectionsForOtherPT = newGlobalSelections[otherPT] || [];
        const loaderDefinition = allLoadersData.find(ldrDef => ldrDef.name === loaderName);

        if (wasPreviouslySelected) {
          // Loader was REMOVED from the active project type
          // So, remove it from other project types as well if it was selected there
          if (selectionsForOtherPT.includes(loaderName)) {
            newGlobalSelections[otherPT] = selectionsForOtherPT.filter(l => l !== loaderName);
          }
        } else {
          // Loader was ADDED to the active project type
          // Add it to other supported project types if not already present
          if (loaderDefinition && loaderDefinition.supported_project_types.includes(otherPT)) {
            if (!selectionsForOtherPT.includes(loaderName)) {
              newGlobalSelections[otherPT] = [...selectionsForOtherPT, loaderName];
            }
          }
        }
      }
      return newGlobalSelections;
    });
  };
  
  const loadMoreResults = () => {
    if (!loading && searchResults.length < totalHits) {
      performSearch(false);
    }
  };

  // Functions to remove individual filter tags
  const removeGameVersionTag = (version: string) => handleGameVersionToggle(version);
  const removeLoaderTag = (loaderName: string) => handleLoaderToggle(loaderName);
  const removeCategoryTag = (categoryName: string) => handleCategoryToggle(categoryName);
  const removeClientRequiredTag = () => setFilterClientRequired(false);
  const removeServerRequiredTag = () => setFilterServerRequired(false);

  const clearAllFilters = () => {
    setSelectedGameVersions([]);
    setSelectedCategoriesByProjectType(prev => ({ ...prev, [projectType]: [] }));
    setSelectedLoadersByProjectType(prev => ({ ...prev, [projectType]: [] }));
    setGameVersionSearchTerm(''); 
    setShowAllGameVersionsSidebar(false); // Reset new state to false
    setFilterClientRequired(false); // Reset new filter
    setFilterServerRequired(false); // Reset new filter
  };

  const toggleProjectVersions = async (projectId: string) => {
    if (expandedVersions[projectId] === 'loading') return;

    if (expandedVersions[projectId]) { 
      setExpandedVersions(prev => ({ ...prev, [projectId]: null }));
      // Reset the display count when versions are hidden
      setNumDisplayedVersions(prev => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
      // Clear version filters for this project
      setVersionFilters(prev => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
      // Clear version dropdown UI state for this project
      setVersionDropdownUIState(prev => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
    } else { 
      await loadProjectVersions(projectId);
    }
  };

  const loadProjectVersions = async (projectId: string) => {
    setExpandedVersions(prev => ({ ...prev, [projectId]: 'loading' }));
    try {
      console.log(`Fetching versions for project: ${projectId}`);
      const versions = await ModrinthService.getModVersions(projectId);
      const sortedVersions = versions.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
      
      setExpandedVersions(prev => ({ ...prev, [projectId]: sortedVersions }));
      // Initialize the number of displayed versions for this project
      setNumDisplayedVersions(prev => ({ ...prev, [projectId]: initialDisplayCount }));
      
      // Initialize version filters with main search selections
      setVersionFilters(prev => ({ 
        ...prev, 
        [projectId]: {
          gameVersions: [...selectedGameVersions], // Start with main search selections
          loaders: [...currentSelectedLoaders],    // Start with main search selections
          versionType: 'all'  // Standardmäßig immer 'all' verwenden, nicht vom showReleaseGameVersionsOnly abhängig machen
        }
      }));

      // Initialize version dropdown UI state
      setVersionDropdownUIState(prev => ({
        ...prev,
        [projectId]: {
          showAllGameVersions: false, // Default to OFF
          gameVersionSearchTerm: '',
        }
      }));
      
      // No longer checking installation status for all versions here
    } catch (err) {
      console.error(`Failed to load versions for project ${projectId}:`, err);
      setExpandedVersions(prev => ({ ...prev, [projectId]: null })); 
      setNumDisplayedVersions(prev => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
       // Clear version dropdown UI state on error too
      setVersionDropdownUIState(prev => {
        const newState = { ...prev };
        delete newState[projectId];
        return newState;
      });
    }
  };
  
  // Create a new function to check installation status for displayed versions only
  const checkDisplayedVersionsStatus = async (projectId: string, versions: ModrinthVersion[], startIndex: number, count: number) => {
    if (!selectedProfile || !versions || versions.length === 0) return;
    
    // Get the currently displayed versions only
    const displayedVersions = versions.slice(startIndex, startIndex + count);
    if (displayedVersions.length === 0) return;
    
    console.log(`Checking installation status for ${displayedVersions.length} displayed versions of project ${projectId}`);
    
    // First, get general project inclusion in NoRisk pack
    const projectInNoRiskStatus = await ProfileService.isContentInstalled({
      profile_id: selectedProfile.id,
      project_id: projectId,
      project_type: projectType
    });

    const newInstalledState: Record<string, {
      is_installed: boolean,
      is_included_in_norisk_pack: boolean
    }> = {};

    // Check each displayed version
    for (const version of displayedVersions) {
      try {
        // Check if we already have status for this version
        if (installedVersions[version.id]) {
          continue; // Skip versions we've already checked
        }
        
        // Find primary file
        const primaryFile = version.files.find(file => file.primary) || version.files[0];
        if (!primaryFile) continue;
        
        // For checking installed status, include all the same parameters as in the installation modal
        const status = await ProfileService.isContentInstalled({
          profile_id: selectedProfile.id,
          project_id: projectId,
          version_id: version.id,
          file_hash_sha1: primaryFile.hashes?.sha1,
          project_type: projectType,
          game_version: version.game_versions[0],
          loader: version.loaders[0], 
          pack_version_number: version.version_number,
          file_name: primaryFile.filename
        });
        
        // For NoRisk pack check, we're more precise
        if (projectInNoRiskStatus.is_included_in_norisk_pack) {
          // Check if this specific version matches the pack version
          const noriskSpecificStatus = await ProfileService.isContentInstalled({
            profile_id: selectedProfile.id,
            project_id: projectId,
            version_id: version.id,
            pack_version_number: version.version_number,
            project_type: projectType
          });
          
          newInstalledState[version.id] = {
            is_installed: status.is_installed,
            is_included_in_norisk_pack: noriskSpecificStatus.is_specific_version_in_pack
          };
        } else {
          newInstalledState[version.id] = {
            is_installed: status.is_installed,
            is_included_in_norisk_pack: false
          };
        }
      } catch (error) {
        console.error(`Failed to check status for version ${version.version_number}:`, error);
        newInstalledState[version.id] = {
          is_installed: false,
          is_included_in_norisk_pack: false
        };
      }
    }

    // Only update state if we have new information
    if (Object.keys(newInstalledState).length > 0) {
      setInstalledVersions(prev => ({
        ...prev,
        ...newInstalledState
      }));
    }
  };
  
  // Handler for version filter changes
  const handleVersionFilterChange = (projectId: string, filterType: 'gameVersions' | 'loaders' | 'versionType', value: string | string[]) => {
    setVersionFilters(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [filterType]: value
      }
    }));
  };
  
  // Modified useEffect for version display - now checks status when versions are displayed
  useEffect(() => {
    // For each expanded project with a display count, check status of visible versions
    Object.entries(expandedVersions).forEach(([projectId, versions]) => {
      if (Array.isArray(versions) && versions.length > 0 && selectedProfile) {
        const displayCount = numDisplayedVersions[projectId] || initialDisplayCount;
        
        // Get filtered versions
        const filteredVersions = getFilteredVersions(projectId, versions);
        
        // Check status only for versions that will be displayed
        checkDisplayedVersionsStatus(projectId, filteredVersions, 0, displayCount);
      }
    });
  }, [expandedVersions, numDisplayedVersions, selectedProfile, versionFilters]);
  
  // Modify loadMoreProjectVersions to check installation status for newly displayed versions
  const loadMoreProjectVersions = (projectId: string) => {
    const currentDisplayCount = numDisplayedVersions[projectId] || initialDisplayCount;
    const newDisplayCount = currentDisplayCount + loadMoreIncrement;
    
    setNumDisplayedVersions(prev => ({
      ...prev,
      [projectId]: newDisplayCount,
    }));
    
    // Check status for newly visible versions
    const versions = expandedVersions[projectId];
    if (Array.isArray(versions) && selectedProfile) {
      const filteredVersions = getFilteredVersions(projectId, versions);
      checkDisplayedVersionsStatus(projectId, filteredVersions, currentDisplayCount, loadMoreIncrement);
    }
  };

  // Filter function for versions
  const getFilteredVersions = (projectId: string, versions: ModrinthVersion[]) => {
    if (!versionFilters[projectId]) return versions;
    
    const filters = versionFilters[projectId];
    
    return versions.filter(version => {
      // Filter by version type
      if (filters.versionType !== 'all' && version.version_type !== filters.versionType) {
        return false;
      }
      
      // Filter by game versions (if any selected)
      if (filters.gameVersions.length > 0) {
        const hasMatchingGameVersion = version.game_versions.some(gv => 
          filters.gameVersions.includes(gv)
        );
        if (!hasMatchingGameVersion) return false;
      }
      
      // Filter by loaders (if any selected)
      if (filters.loaders.length > 0) {
        const hasMatchingLoader = version.loaders.some(loader => 
          filters.loaders.includes(loader)
        );
        if (!hasMatchingLoader) return false;
      }
      
      return true;
    });
  };

  // Open install modal
  const openInstallModal = async (project: ModrinthSearchHit, version: ModrinthVersion) => {
    setSelectedVersion(version);
    setSelectedProject(project);
    setInstallModalOpen(true);
    setLoadingStatus(true);
    setInstallStatus({});
    
    try {
      // Check installation status for each profile
      const statuses: Record<string, boolean> = {};

      console.log(version);
      
      for (const profile of internalProfiles) {
        // Check if content is already installed in this profile
        const status = await ProfileService.isContentInstalled({
          profile_id: profile.id,
          project_id: project.project_id,
          version_id: version.id,
          project_type: project.project_type,
          game_version: version.game_versions[0],
          loader: version.loaders[0],
          file_hash_sha1: version.files[0].hashes?.sha1,
          pack_version_number: version.version_number
        });
        
        statuses[profile.id] = status.is_installed;
      }
      
      setInstallStatus(statuses);
    } catch (error) {
      console.error("Failed to check installation status:", error);
      toast.error("Failed to check installation status");
    } finally {
      setLoadingStatus(false);
    }
  };

  // Close install modal
  const closeInstallModal = () => {
    setInstallModalOpen(false);
    setSelectedVersion(null);
    setSelectedProject(null);
    setInstallStatus({});
    setInstalling({});
  };

  // Install mod to selected profile
  const installToProfile = async (profileId: string) => {
    if (!selectedVersion || !selectedProject) {
      toast.error("Missing required installation information");
      return;
    }

    // Set installing state for this profile
    setInstalling(prev => ({ ...prev, [profileId]: true }));

    try {
      // Find primary file to download
      const primaryFile = selectedVersion.files.find(file => file.primary) || selectedVersion.files[0];
      
      if (!primaryFile) {
        toast.error("No download file available");
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }

      // Choose the right installation method based on project type
      if (selectedProject.project_type === 'mod' || selectedProject.project_type === 'modpack') {
        // Use mod-specific API for mods and modpacks
        await ProfileService.addModrinthModToProfile(
          profileId,
          selectedProject.project_id,
          selectedVersion.id,
          primaryFile.filename,
          primaryFile.url,
          primaryFile.hashes?.sha1 || undefined,
          selectedProject.title,
          selectedVersion.version_number,
          selectedVersion.loaders,
          selectedVersion.game_versions
        );
      } else {
        // Use content API for resourcepacks, shaders, and datapacks
        await ProfileService.addModrinthContentToProfile(
          profileId,
          selectedProject.project_id,
          selectedVersion.id,
          primaryFile.filename,
          primaryFile.url,
          primaryFile.hashes?.sha1 || null,
          selectedProject.title,
          selectedVersion.version_number,
          selectedProject.project_type
        );
      }

      toast.success(`Successfully installed ${selectedProject.title} to ${internalProfiles.find(p => p.id === profileId)?.name}`);
      
      // Mark this profile as installed
      setInstallStatus(prev => ({ ...prev, [profileId]: true }));
      
      // Update installedProjects state to show as installed in the UI
      setInstalledProjects(prev => ({
        ...prev,
        [selectedProject.project_id]: {
          is_installed: true,
          is_included_in_norisk_pack: prev[selectedProject.project_id]?.is_included_in_norisk_pack || false
        }
      }));
      
      // Update installedVersions state to show this version as installed
      setInstalledVersions(prev => ({
        ...prev,
        [selectedVersion.id]: {
          is_installed: true,
          is_included_in_norisk_pack: prev[selectedVersion.id]?.is_included_in_norisk_pack || false
        }
      }));
      
    } catch (error) {
      toast.error(`Failed to install: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Install error:", error);
    } finally {
      setInstalling(prev => ({ ...prev, [profileId]: false }));
    }
  };

  // Find the selected profile when the component mounts or selectedProfileId changes
  useEffect(() => {
    if (selectedProfileId && internalProfiles.length > 0) {
      const profile = internalProfiles.find(p => p.id === selectedProfileId);
      if (profile) {
        setSelectedProfile(profile);
      }
    } else if (selectedProfileId === '') {
      // Explicit empty selection - set to null
      setSelectedProfile(null);
    } else if (internalProfiles.length > 0 && !selectedProfile && selectedProfileId !== '' && selectedProfileId !== undefined) {
      // Auto-select first profile ONLY if:
      // - We have profiles
      // - No profile is currently selected
      // - No empty selection was requested (selectedProfileId !== '')
      // - selectedProfileId is not undefined (meaning it was explicitly passed as a prop)
      setSelectedProfile(internalProfiles[0]);
    }
  }, [selectedProfileId, internalProfiles, selectedProfile]);

  // Reset profile selection if explicit empty option was requested
  useEffect(() => {
    if (selectedProfileId === '') {
      setSelectedProfile(null);
      // Reset filters related to profile
      setSelectedGameVersions([]);
      setSelectedLoadersByProjectType(prev => ({
        ...prev,
        [projectType]: []
      }));
    }
  }, [selectedProfileId, projectType]);

  // Apply profile filters when selected profile changes - only set relevant filters based on project type
  useEffect(() => {
    if (selectedProfile) {
      // Set game version filter from profile - applicable to all project types
      if (selectedProfile.game_version) {
        setSelectedGameVersions([selectedProfile.game_version]);
      }
      
      // Set loader filter from profile - only for project types that use loaders
      if (selectedProfile.loader && ['mod', 'modpack'].includes(projectType)) {
        setSelectedLoadersByProjectType(prev => ({
          ...prev,
          [projectType]: [selectedProfile.loader]
        }));
      }
    }
  }, [selectedProfile, projectType]);

  // New state for quick install modal
  const [quickInstallModalOpen, setQuickInstallModalOpen] = useState(false);
  const [quickInstallProject, setQuickInstallProject] = useState<ModrinthSearchHit | null>(null);
  const [quickInstallVersions, setQuickInstallVersions] = useState<ModrinthVersion[] | null>(null);
  const [quickInstallLoading, setQuickInstallLoading] = useState(false);
  const [quickInstallError, setQuickInstallError] = useState<string | null>(null);

  // Function to handle quick install
  const quickInstall = async (project: ModrinthSearchHit) => {
    setQuickInstallProject(project);
    setQuickInstallModalOpen(true);
    setQuickInstallLoading(true);
    setQuickInstallVersions(null);
    setQuickInstallError(null);
    setInstallStatus({});
    
    try {
      // Fetch versions for this project
      const versions = await ModrinthService.getModVersions(project.project_id);
      
      if (versions.length === 0) {
        setQuickInstallError('No versions found for this project');
        setQuickInstallLoading(false);
        return;
      }
      
      // Sort versions by date (newest first)
      const sortedVersions = versions.sort((a, b) => 
        new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
      );
      
      setQuickInstallVersions(sortedVersions);
      
      // Check installation status for each profile
      const statuses: Record<string, boolean> = {};
      
      for (const profile of internalProfiles) {
        // Find the best version for this profile
        const bestVersion = findBestVersionForProfile(profile, sortedVersions);
        
        // If no compatible version, skip installation check
        if (!bestVersion) {
          statuses[profile.id] = false;
          continue;
        }
        
        // Find primary file for the best version
        const primaryFile = bestVersion.files.find(file => file.primary) || bestVersion.files[0];
        
        if (!primaryFile) {
          statuses[profile.id] = false;
          continue;
        }
        
        // Check if content is already installed with the specific details of the best version
        const status = await ProfileService.isContentInstalled({
          profile_id: profile.id,
          project_id: project.project_id,
          version_id: bestVersion.id,
          project_type: project.project_type,
          game_version: bestVersion.game_versions[0],
          loader: bestVersion.loaders[0],
          file_hash_sha1: primaryFile.hashes?.sha1,
          pack_version_number: bestVersion.version_number,
          file_name: primaryFile.filename
        });
        
        statuses[profile.id] = status.is_installed;
      }
      
      setInstallStatus(statuses);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
      setQuickInstallError(`Failed to fetch versions: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setQuickInstallLoading(false);
    }
  };

  // Find the best version for a profile
  const findBestVersionForProfile = (profile: Profile, versions: ModrinthVersion[]): ModrinthVersion | null => {
    if (!profile || !versions || versions.length === 0) return null;
    
    // First try: find a version matching both game version and loader
    if (profile.game_version && profile.loader) {
      const exactMatch = versions.find(v => 
        v.game_versions.includes(profile.game_version) && 
        v.loaders.includes(profile.loader)
      );
      if (exactMatch) return exactMatch;
    }
    
    // Second try: match just game version (for resourcepacks, datapacks, etc.)
    if (profile.game_version) {
      const gameVersionMatch = versions.find(v => 
        v.game_versions.includes(profile.game_version)
      );
      if (gameVersionMatch) return gameVersionMatch;
    }
    
    // Last resort: just return the latest version
    return versions[0];
  };

  // Close quick install modal
  const closeQuickInstallModal = () => {
    setQuickInstallModalOpen(false);
    setQuickInstallProject(null);
    setQuickInstallVersions(null);
    setInstallStatus({});
    setInstalling({});
  };

  // Install mod to selected profile via quick install
  const quickInstallToProfile = async (profileId: string) => {
    if (!quickInstallProject || !quickInstallVersions) {
      toast.error("Missing required installation information");
      return;
    }

    const profile = internalProfiles.find(p => p.id === profileId);
    if (!profile) {
      toast.error("Profile not found");
      return;
    }

    // Find the best version for this profile
    const bestVersion = findBestVersionForProfile(profile, quickInstallVersions);
    if (!bestVersion) {
      toast.error(`No compatible version found for ${profile.name}`);
      return;
    }

    // Set installing state for this profile
    setInstalling(prev => ({ ...prev, [profileId]: true }));

    try {
      // Find primary file to download
      const primaryFile = bestVersion.files.find(file => file.primary) || bestVersion.files[0];
      
      if (!primaryFile) {
        toast.error("No download file available");
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }

      // Choose the right installation method based on project type
      if (quickInstallProject.project_type === 'mod' || quickInstallProject.project_type === 'modpack') {
        // Use mod-specific API for mods and modpacks
        await ProfileService.addModrinthModToProfile(
          profileId,
          quickInstallProject.project_id,
          bestVersion.id,
          primaryFile.filename,
          primaryFile.url,
          primaryFile.hashes?.sha1 || undefined,
          quickInstallProject.title,
          bestVersion.version_number,
          bestVersion.loaders,
          bestVersion.game_versions
        );
      } else {
        // Use content API for resourcepacks, shaders, and datapacks
        await ProfileService.addModrinthContentToProfile(
          profileId,
          quickInstallProject.project_id,
          bestVersion.id,
          primaryFile.filename,
          primaryFile.url,
          primaryFile.hashes?.sha1 || null,
          quickInstallProject.title,
          bestVersion.version_number,
          quickInstallProject.project_type
        );
      }

      toast.success(`Successfully installed ${quickInstallProject.title} (${bestVersion.version_number}) to ${profile.name}`);
      
      // Mark this profile as installed
      setInstallStatus(prev => ({ ...prev, [profileId]: true }));
      
      // Update installedProjects state to show as installed in the UI
      setInstalledProjects(prev => ({
        ...prev,
        [quickInstallProject.project_id]: {
          is_installed: true,
          is_included_in_norisk_pack: prev[quickInstallProject.project_id]?.is_included_in_norisk_pack || false
        }
      }));
      
      // Update installedVersions state to show this version as installed
      setInstalledVersions(prev => ({
        ...prev,
        [bestVersion.id]: {
          is_installed: true,
          is_included_in_norisk_pack: prev[bestVersion.id]?.is_included_in_norisk_pack || false
        }
      }));
      
    } catch (error) {
      toast.error(`Failed to install: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Install error:", error);
    } finally {
      setInstalling(prev => ({ ...prev, [profileId]: false }));
    }
  };

  // Check installation status for all displayed projects when profile changes
  useEffect(() => {
    const checkInstallationStatus = async () => {
      if (!selectedProfile || !searchResults.length) {
        setInstalledProjects({});
        return;
      }

      const newInstalledState: Record<string, {
        is_installed: boolean,
        is_included_in_norisk_pack: boolean
      }> = {};

      // Check each project
      for (const project of searchResults) {
        try {
          const status = await ProfileService.isContentInstalled({
            profile_id: selectedProfile.id,
            project_id: project.project_id,
            project_type: project.project_type
          });

          newInstalledState[project.project_id] = {
            is_installed: status.is_installed,
            is_included_in_norisk_pack: status.is_included_in_norisk_pack
          };
        } catch (error) {
          console.error(`Failed to check status for ${project.title}:`, error);
          // Default to not installed if there's an error
          newInstalledState[project.project_id] = {
            is_installed: false,
            is_included_in_norisk_pack: false
          };
        }
      }

      setInstalledProjects(newInstalledState);
    };

    checkInstallationStatus();
  }, [selectedProfile, searchResults]);

  // Check installation status when loading more results
  useEffect(() => {
    const checkNewResultsInstallation = async () => {
      if (!selectedProfile || !searchResults.length) return;

      const newInstalledState = {...installedProjects};
      const uncheckedProjects = searchResults.filter(project => 
        !installedProjects[project.project_id]
      );

      // Only check newly loaded projects
      for (const project of uncheckedProjects) {
        try {
          const status = await ProfileService.isContentInstalled({
            profile_id: selectedProfile.id,
            project_id: project.project_id,
            project_type: project.project_type
          });

          newInstalledState[project.project_id] = {
            is_installed: status.is_installed,
            is_included_in_norisk_pack: status.is_included_in_norisk_pack
          };
        } catch (error) {
          console.error(`Failed to check status for ${project.title}:`, error);
          newInstalledState[project.project_id] = {
            is_installed: false,
            is_included_in_norisk_pack: false
          };
        }
      }

      if (uncheckedProjects.length > 0) {
        setInstalledProjects(newInstalledState);
      }
    };

    checkNewResultsInstallation();
  }, [searchResults.length, selectedProfile]);

  // Additional check when project type changes to update installation status
  useEffect(() => {
    if (selectedProfile) {
      // Reset installation status when project type changes
      setInstalledProjects({});
    }
  }, [projectType]);

  const accentColor = useThemeStore((state) => state.accentColor); // Get accent color
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null); // New state for version hover
  const [openVersionDropdowns, setOpenVersionDropdowns] = useState<Record<string, { type: boolean; gameVersion: boolean; loader: boolean }>>({});

  const toggleVersionDropdown = (projectId: string, dropdownType: 'type' | 'gameVersion' | 'loader') => {
    setOpenVersionDropdowns(prev => {
      const currentProjectDropdowns = prev[projectId] || { type: false, gameVersion: false, loader: false };
      const isOpen = currentProjectDropdowns[dropdownType];
      
      // Close all dropdowns for this project first, then open the target one if it was closed
      const newStateForProject = {
        type: false,
        gameVersion: false,
        loader: false,
        [dropdownType]: !isOpen, // Toggle the state of the clicked dropdown
      };

      return {
        ...prev,
        [projectId]: newStateForProject,
      };
    });
  };

  const closeAllVersionDropdowns = (projectId: string) => {
    setOpenVersionDropdowns(prev => ({
      ...prev,
      [projectId]: { type: false, gameVersion: false, loader: false },
    }));
  };

  // New state for version filtering UI controls within the expanded view
  const [versionDropdownUIState, setVersionDropdownUIState] = useState<Record<string, {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  }>>({});

  // Handler for version dropdown UI state changes
  const handleVersionDropdownUIChange = (projectId: string, field: keyof typeof versionDropdownUIState[string], value: boolean | string) => {
    setVersionDropdownUIState(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value,
      },
    }));
  };

  const handleInstallModpackAsProfile = async (project: ModrinthSearchHit) => {
    if (project.project_type !== 'modpack') {
      // This case should ideally be handled by a different function like quickInstall for non-modpacks.
      // However, if it's called, ensure onInstallSuccess is still triggered for them.
      toast.error("This handler is primarily for modpacks. For other types, behavior might differ.");
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      return;
    }

    const toastId = toast.loading(`Fetching latest version for ${project.title}...`);

    try {
      let latestVersion: ModrinthVersion | null = null;
      if (project.latest_version) {
        const versions = await ModrinthService.getModVersions(project.project_id);
        latestVersion = versions.find(v => v.version_number === project.latest_version || v.id === project.latest_version) || versions[0];
        if (!latestVersion && versions.length > 0) {
          latestVersion = versions.sort((a,b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime())[0];
        }
      }
      if (!latestVersion) {
        const allVersions = await ModrinthService.getModVersions(project.project_id);
        if (allVersions && allVersions.length > 0) {
          latestVersion = allVersions.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime())[0];
        } else { throw new Error("No versions found for this modpack."); }
      }
      if (!latestVersion || !latestVersion.files || latestVersion.files.length === 0) { throw new Error("Latest version has no files."); }
      const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
      if (!primaryFile) { throw new Error("No primary file found for the latest version."); }

      toast.loading(`Installing ${project.title} as new profile...`, { id: toastId });
      const newProfileId = await ModrinthService.downloadAndInstallModpack(
        project.project_id,
        latestVersion.id,
        primaryFile.filename, 
        primaryFile.url
      );
      toast.success(
        (t) => (
          <div className="flex flex-col">
            <span>Successfully installed {project.title} as a new profile!</span>
            <span className="text-xs text-gray-400">Profile ID: {newProfileId}</span>
            {/* TODO: Maybe add a button to switch to this profile or open its settings */}
          </div>
        ),
        { id: toastId, duration: 6000 }
      );

      try {
        const updatedProfiles = await ProfileService.listProfiles();
        setInternalProfiles(updatedProfiles);
      } catch (profileError) {
        console.error("Failed to refresh profiles list internally:", profileError);
      }
      
      // Conditionally call onInstallSuccess
      if (project.project_type !== 'modpack' && onInstallSuccess) {
        onInstallSuccess();
      }
      // For modpacks, onInstallSuccess is intentionally skipped to prevent page reload,
      // as internalProfiles state is updated directly.

    } catch (err: any) {
      console.error("Failed to install modpack as profile:", err);
      toast.error(`Error installing ${project.title}: ${err.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const handleInstallModpackVersionAsProfile = async (project: ModrinthSearchHit, version: ModrinthVersion) => {
    if (project.project_type !== 'modpack') {
       // This case should ideally be handled by a different function.
      // Ensure onInstallSuccess is still triggered for them if this path is taken.
      toast.error("This handler is primarily for modpack versions. For other types, behavior might differ.");
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      return;
    }
    if (!version || !version.files || version.files.length === 0) {
      toast.error("Selected version has no files.");
      return;
    }

    const primaryFile = version.files.find(f => f.primary) || version.files[0];
    if (!primaryFile) { 
        toast.error("No primary file found for the selected version."); 
        return; 
    }
    const toastId = toast.loading(`Installing ${project.title} (version ${version.version_number}) as new profile...`);

    try {
      const newProfileId = await ModrinthService.downloadAndInstallModpack(
        project.project_id,
        version.id,
        primaryFile.filename, 
        primaryFile.url
      );
      toast.success(
        (t) => (
          <div className="flex flex-col">
            <span>Successfully installed {project.title} (v{version.version_number}) as a new profile!</span>
            <span className="text-xs text-gray-400">Profile ID: {newProfileId}</span>
          </div>
        ),
        { id: toastId, duration: 6000 }
      );

      try {
        const updatedProfiles = await ProfileService.listProfiles();
        setInternalProfiles(updatedProfiles);
      } catch (profileError) {
        console.error("Failed to refresh profiles list internally:", profileError);
      }

      // Conditionally call onInstallSuccess
      if (project.project_type !== 'modpack' && onInstallSuccess) {
        onInstallSuccess();
      }
      // For modpacks, onInstallSuccess is intentionally skipped.

    } catch (err: any) {
      console.error("Failed to install modpack version as profile:", err);
      toast.error(`Error installing ${project.title}: ${err.message || 'Unknown error'}`, { id: toastId });
    }
  };

  return (
    // Overall container: now flex-row to place left content and sidebar side-by-side
    <div className={`modrinth-search-v2 flex flex-row h-full gap-3 ${className}`}> {/* Added gap-3 */} 
      {/* Left Content Area: Takes up most space, contains search bar and results */} 
      <div className="left-content-area flex flex-col flex-1 overflow-hidden">
        {/* Search controls are now in a separate component */}
        <ModrinthSearchControlsV2
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          projectType={projectType}
          onProjectTypeChange={handleProjectTypeChange}
          allProjectTypes={ALL_MODRINTH_PROJECT_TYPES} // Pass the constant
          profiles={internalProfiles}
          selectedProfile={selectedProfile}
          onSelectedProfileChange={(profile) => {
            if (profile === null) {
              setSelectedProfile(null);
              setSelectedGameVersions([]);
              setSelectedLoadersByProjectType(prev => ({ ...prev, [projectType]: [] }));
            } else {
              setSelectedProfile(profile);
            }
          }}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions.map(opt => ({ // Map to SelectOption structure if not already
            value: opt.value,
            label: opt.label,
            icon: opt.icon
          }))}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          selectedGameVersions={selectedGameVersions}
          currentSelectedLoaders={currentSelectedLoaders}
          currentSelectedCategories={currentSelectedCategories}
          filterClientRequired={filterClientRequired}
          filterServerRequired={filterServerRequired}
          onRemoveGameVersionTag={removeGameVersionTag}
          onRemoveLoaderTag={removeLoaderTag}
          onRemoveCategoryTag={removeCategoryTag}
          onRemoveClientRequiredTag={removeClientRequiredTag}
          onRemoveServerRequiredTag={removeServerRequiredTag}
          onClearAllFilters={clearAllFilters}
        />

        {/* Search Results Area (scrollable within the left content area) */}
        <div className="search-results-area flex-1 overflow-y-auto p-4 space-y-3">
          {/* {loading && searchResults.length === 0 && <p className="p-4 text-center">Loading initial results...</p>} REMOVED */}
          {searchResults.length === 0 && !loading && error && (
            <p className="p-4 text-red-500 text-center">Error: {error}</p>
          )}
          {searchResults.length === 0 && !loading && !error && (
            <p className="p-4 text-center text-gray-400">No results found. Try adjusting filters or search term.</p>
          )}

          {searchResults.map((hit) => {
            const projectVersions = expandedVersions[hit.project_id];
            const displayedCount = numDisplayedVersions[hit.project_id] || initialDisplayCount;
            const currentProjectInstallStatus = selectedProfile ? installedProjects[hit.project_id] : null;
            const currentVersionFilters = versionFilters[hit.project_id] || { gameVersions: [], loaders: [], versionType: 'all' };
            const currentVersionDropdownUIState = versionDropdownUIState[hit.project_id] || { showAllGameVersions: false, gameVersionSearchTerm: '' };
            const currentOpenVersionDropdowns = openVersionDropdowns[hit.project_id] || { type: false, gameVersion: false, loader: false };

            return (
              <ModrinthProjectCardV2
                key={hit.project_id}
                hit={hit}
                accentColor={accentColor}
                installStatus={currentProjectInstallStatus}
                onQuickInstallClick={quickInstall}
                onInstallModpackAsProfileClick={handleInstallModpackAsProfile}
                onInstallModpackVersionAsProfileClick={handleInstallModpackVersionAsProfile}
                onToggleVersionsClick={toggleProjectVersions}
                isExpanded={Array.isArray(projectVersions) && projectVersions.length > 0}
                isLoadingVersions={projectVersions === 'loading'}
                projectVersions={projectVersions}
                displayedCount={displayedCount}
                versionFilters={currentVersionFilters}
                versionDropdownUIState={currentVersionDropdownUIState}
                openVersionDropdowns={currentOpenVersionDropdowns}
                installedVersions={installedVersions}
                selectedProfile={selectedProfile}
                hoveredVersionId={hoveredVersionId}
                gameVersionsData={gameVersionsData}
                showAllGameVersionsSidebar={showAllGameVersionsSidebar}
                selectedGameVersionsSidebar={selectedGameVersions}
                onVersionFilterChange={handleVersionFilterChange}
                onVersionUiStateChange={handleVersionDropdownUIChange}
                onToggleVersionDropdown={toggleVersionDropdown}
                onCloseAllVersionDropdowns={closeAllVersionDropdowns}
                onLoadMoreVersions={loadMoreProjectVersions}
                onInstallVersionClick={openInstallModal}
                onHoverVersion={setHoveredVersionId}
              />
            );
          })}
          
          {/* Load More button - Ensure it's always visible when there are more results */}
          {!loading && searchResults.length > 0 && searchResults.length < totalHits && (
            <Button 
              onClick={loadMoreResults}
              variant="default"
              size="md"
              className="w-full mt-4"
              disabled={loading}
            >
              Load More ({totalHits - searchResults.length} remaining)
            </Button>
          )}
        </div>
      </div>

      {/* Filters Sidebar (Right, full height, scrollable) - Now with conditional rendering */} 
      {isSidebarVisible && (
        <ModrinthFilterSidebarV2
          projectType={projectType}
          accentColor={accentColor}
          gameVersionSearchTerm={gameVersionSearchTerm}
          onGameVersionSearchTermChange={setGameVersionSearchTerm}
          displayedGameVersions={displayedGameVersions}
          selectedGameVersions={selectedGameVersions}
          onGameVersionToggle={handleGameVersionToggle}
          showAllGameVersionsSidebar={showAllGameVersionsSidebar}
          onShowAllGameVersionsSidebarChange={setShowAllGameVersionsSidebar}
          availableLoaders={availableLoaders}
          currentSelectedLoaders={currentSelectedLoaders}
          onLoaderToggle={handleLoaderToggle}
          allLoadersData={allLoadersData}
          dynamicFilterGroups={dynamicFilterGroups}
          currentSelectedCategories={currentSelectedCategories}
          onCategoryToggle={handleCategoryToggle}
          filterClientRequired={filterClientRequired}
          onClientRequiredToggle={() => setFilterClientRequired(!filterClientRequired)}
          filterServerRequired={filterServerRequired}
          onServerRequiredToggle={() => setFilterServerRequired(!filterServerRequired)}
        />
      )}

      {/* Quick Install Modal - Now using the extracted component */}
      <ModrinthQuickInstallModalV2
        isOpen={quickInstallModalOpen}
        onClose={closeQuickInstallModal}
        project={quickInstallProject}
        versions={quickInstallVersions}
        isLoading={quickInstallLoading}
        error={quickInstallError}
        profiles={internalProfiles}
        selectedProfileId={selectedProfile?.id}
        installStatus={installStatus}
        installingProfiles={installing}
        onInstallToProfile={quickInstallToProfile}
        findBestVersionForProfile={findBestVersionForProfile}
      />

      {/* Detailed Installation Modal - Now using the extracted component */}
      {selectedProject && selectedVersion && installModalOpen && (
        <ModrinthInstallModalV2
          isOpen={installModalOpen}
          onClose={closeInstallModal}
          project={selectedProject}
          version={selectedVersion}
          profiles={internalProfiles}
          selectedProfileId={selectedProfile?.id}
          isLoadingStatus={loadingStatus}
          installStatus={installStatus}
          installingProfiles={installing}
          onInstallToProfile={installToProfile}
        />
      )}
    </div>
  );
} 