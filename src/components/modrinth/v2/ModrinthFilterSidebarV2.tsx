"use client";

import React from 'react';
import { cn } from '../../../lib/utils';
import type {
  ModrinthProjectType,
  ModrinthCategory,
  ModrinthGameVersion,
  ModrinthLoader,
} from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { Icon } from '@iconify/react';
import { SearchInput } from '../../ui/SearchInput';
import { Checkbox } from '../../ui/Checkbox';

// Re-define UIDynamicFilterGroup if it's specific to the sidebar and not used elsewhere globally
// For now, assuming it might be defined in the parent or a shared types file if used elsewhere.
// If not, it should be defined here.
interface UIDynamicFilterGroup {
  accordionTitle: string;
  headerValue: string;
  options: ModrinthCategory[];
}

// Re-define AccordionItemProps or import if it becomes a shared component
// For now, assuming the AccordionItem component is passed or available in context/parent
interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}


// --- AccordionItem Component Definition (Moved Here) ---
const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div 
      className={cn(
        "relative overflow-hidden transition-all duration-300 rounded-md",
        "border-2 border-b-4",
        "backdrop-blur-md",
        "mb-3"
      )}
      style={{
        borderColor: `${accentColor.value}80`, 
        borderBottomColor: accentColor.value, 
        boxShadow: "0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)", 
        backgroundColor: `${accentColor.value}30`,
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
        style={{ backgroundColor: `${accentColor.value}80` }}
      /> 
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-2 py-2 text-left font-medium text-gray-200 flex justify-between items-center focus:outline-none transition-colors lowercase text-3xl",
          isOpen && "border-b", 
          "hover:bg-white/5",
          "relative z-10"
        )}
        style={{
          borderBottomColor: isOpen ? `${accentColor.value}80` : 'transparent', 
        }}
      >
        <span className="truncate mr-2">{title}</span> 
        <Icon icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} className="w-4 h-4 flex-shrink-0" /> 
      </button>
      {isOpen && (
        <div className="p-2 text-sm relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};
// --- End AccordionItem Component Definition ---

interface ModrinthFilterSidebarV2Props {
  projectType: ModrinthProjectType;
  accentColor: AccentColor;
  // Game Version Filter Props
  gameVersionSearchTerm: string;
  onGameVersionSearchTermChange: (term: string) => void;
  displayedGameVersions: ModrinthGameVersion[];
  selectedGameVersions: string[];
  onGameVersionToggle: (version: string) => void;
  showAllGameVersionsSidebar: boolean;
  onShowAllGameVersionsSidebarChange: (show: boolean) => void;
  // Loader Filter Props
  availableLoaders: ModrinthLoader[]; // Already sorted and filtered by projectType
  currentSelectedLoaders: string[];
  onLoaderToggle: (loaderName: string) => void;
  allLoadersData: ModrinthLoader[]; // For icons
  // Dynamic Category Filter Props
  dynamicFilterGroups: UIDynamicFilterGroup[];
  currentSelectedCategories: string[];
  onCategoryToggle: (categoryName: string) => void;
  // Environment Filter Props
  filterClientRequired: boolean;
  onClientRequiredToggle: () => void;
  filterServerRequired: boolean;
  onServerRequiredToggle: () => void;
}

export const ModrinthFilterSidebarV2: React.FC<ModrinthFilterSidebarV2Props> = ({
  projectType,
  accentColor,
  gameVersionSearchTerm,
  onGameVersionSearchTermChange,
  displayedGameVersions,
  selectedGameVersions,
  onGameVersionToggle,
  showAllGameVersionsSidebar,
  onShowAllGameVersionsSidebarChange,
  availableLoaders,
  currentSelectedLoaders,
  onLoaderToggle,
  allLoadersData,
  dynamicFilterGroups,
  currentSelectedCategories,
  onCategoryToggle,
  filterClientRequired,
  onClientRequiredToggle,
  filterServerRequired,
  onServerRequiredToggle,
}) => {
  // Extract the 'Categories' group if it exists
  const categoriesGroup = dynamicFilterGroups.find(
    group => group.headerValue.toLowerCase() === 'categories'
  );

  // Filter out the 'Categories' group from the main list to avoid rendering it twice
  const otherDynamicGroups = dynamicFilterGroups.filter(
    group => group.headerValue.toLowerCase() !== 'categories'
  );

  return (
    <div 
      className={cn(
        "filters-sidebar w-1/4 max-w-[15rem] flex-shrink-0 overflow-y-auto p-1 h-full", 
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      )}
    >
      <div className="space-y-3 pt-2">
        <AccordionItem title="Game Version" defaultOpen={false}>
          <div className="space-y-2">
            <SearchInput
              value={gameVersionSearchTerm}
              onChange={onGameVersionSearchTermChange}
              placeholder="Search version..."
              className="w-full mb-1.5"
            />
            <div className="max-h-40 overflow-y-auto space-y-0.5 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {displayedGameVersions.map(gv => {
                const isChecked = selectedGameVersions.includes(gv.version);
                return (
                  <button 
                    key={gv.version} 
                    onClick={() => onGameVersionToggle(gv.version)} 
                    className={cn(
                      "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                      "hover:bg-white/10 active:bg-white/5",
                      isChecked ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
                    )}
                    style={{ color: isChecked ? accentColor.value : undefined }}
                  >
                    <span className="flex-grow text-left">{gv.version} <span className="text-xs opacity-60">({gv.version_type})</span></span>
                    {isChecked && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
                  </button>
                );
              })}
              {displayedGameVersions.length === 0 && <p className="text-gray-500 italic p-1 text-xs text-center">No matching versions.</p>}
            </div>
            <div className="flex items-center mt-2">
              <Checkbox
                id="showAllVersionsSidebarInNewComponent" // Ensure unique ID
                checked={showAllGameVersionsSidebar}
                onChange={(e) => onShowAllGameVersionsSidebarChange(e.target.checked)} 
              />
              <label 
                htmlFor="showAllVersionsSidebarInNewComponent" 
                className="ml-2 text-xl truncate cursor-pointer"
              >
                Show all versions
              </label>
            </div>
          </div>
        </AccordionItem>

        {/* Render Categories group here if it exists */}
        {categoriesGroup && (
          <AccordionItem key={categoriesGroup.headerValue} title={categoriesGroup.accordionTitle} defaultOpen={true}>
            <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"> 
              {categoriesGroup.options.length > 0 ? categoriesGroup.options.map(cat => {
                const isChecked = currentSelectedCategories.includes(cat.name);
                return (
                  <button 
                    key={cat.name} 
                    onClick={() => onCategoryToggle(cat.name)}
                    className={cn(
                      "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                      "hover:bg-white/10 active:bg-white/5",
                      isChecked ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
                    )}
                    style={{ color: isChecked ? accentColor.value : undefined }}
                  >
                    <span className="flex items-center flex-grow text-left"> 
                       {cat.icon && (
                         <span 
                           className="w-4 h-4 mr-1.5 flex-shrink-0" 
                           dangerouslySetInnerHTML={{ __html: cat.icon }}
                         />
                       )}
                      {cat.name}
                    </span>
                    {isChecked && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
                  </button>
                );
               }) : (
                <p className="text-xs text-gray-500 italic p-1 text-center">No options for {categoriesGroup.accordionTitle}.</p>
              )}
            </div>
          </AccordionItem>
        )}

        <AccordionItem title="Loader" defaultOpen={true}>
          <div className="max-h-40 overflow-y-auto space-y-0.5 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {availableLoaders.map(loader => {
              const isChecked = currentSelectedLoaders.includes(loader.name);
              const fullLoaderData = allLoadersData.find(l => l.name === loader.name);
              return (
                <button 
                  key={loader.name} 
                  onClick={() => onLoaderToggle(loader.name)}
                  className={cn(
                    "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                    "hover:bg-white/10 active:bg-white/5",
                    isChecked ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
                  )}
                  style={{ color: isChecked ? accentColor.value : undefined }}
                >
                  <span className="flex items-center flex-grow text-left"> 
                    {fullLoaderData?.icon && fullLoaderData.icon.trim() !== '' && (
                      <span 
                        className="w-4 h-4 mr-1.5 flex-shrink-0" 
                        dangerouslySetInnerHTML={{ __html: fullLoaderData.icon }}
                      />
                    )}
                    {loader.name}
                  </span>
                  {isChecked && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
                </button>
              );
            })}
            {availableLoaders.length === 0 && <p className="text-gray-500 italic p-1 text-xs text-center">No loaders for {projectType}.</p>}
          </div>
        </AccordionItem>

        {/* Render other dynamic groups here */}
        {otherDynamicGroups.map(group => (
          <AccordionItem key={group.headerValue} title={group.accordionTitle} defaultOpen={group.headerValue.toLowerCase() === 'categories' /* This defaultOpen might need adjustment if categories is handled separately */}>
            <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"> 
              {group.options.length > 0 ? group.options.map(cat => {
                const isChecked = currentSelectedCategories.includes(cat.name);
                return (
                  <button 
                    key={cat.name} 
                    onClick={() => onCategoryToggle(cat.name)}
                    className={cn(
                      "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                      "hover:bg-white/10 active:bg-white/5",
                      isChecked ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
                    )}
                    style={{ color: isChecked ? accentColor.value : undefined }}
                  >
                    <span className="flex items-center flex-grow text-left"> 
                       {cat.icon && (
                         <span 
                           className="w-4 h-4 mr-1.5 flex-shrink-0" 
                           dangerouslySetInnerHTML={{ __html: cat.icon }}
                         />
                       )}
                      {cat.name}
                    </span>
                    {isChecked && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
                  </button>
                );
               }) : (
                <p className="text-xs text-gray-500 italic p-1 text-center">No options for {group.accordionTitle}.</p>
              )}
            </div>
          </AccordionItem>
        ))}

        <AccordionItem title="Environment" defaultOpen={false}> 
          <div className="space-y-0.5 p-1"> 
            <button 
              onClick={onClientRequiredToggle} 
              className={cn(
                "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                "hover:bg-white/10 active:bg-white/5",
                filterClientRequired ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
              )}
              style={{ color: filterClientRequired ? accentColor.value : undefined }}
            >
              <span className="flex items-center flex-grow text-left"> 
                <Icon icon="mdi:desktop-classic" className="w-4 h-4 mr-1.5 flex-shrink-0" />
                Client
              </span>
              {filterClientRequired && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
            </button>
            <button 
              onClick={onServerRequiredToggle} 
              className={cn(
                "w-full flex items-center justify-between p-1 text-xl font-minecraft transition-all duration-200 cursor-pointer",
                "hover:bg-white/10 active:bg-white/5",
                filterServerRequired ? "bg-white/15 text-[color:var(--accent)]" : "text-gray-300"
              )}
              style={{ color: filterServerRequired ? accentColor.value : undefined }}
            >
              <span className="flex items-center flex-grow text-left"> 
                <Icon icon="mdi:server" className="w-4 h-4 mr-1.5 flex-shrink-0" />
                Server
              </span>
              {filterServerRequired && <Icon icon="ph:check-bold" className="w-4 h-4 flex-shrink-0 ml-2" />} 
            </button>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
}; 