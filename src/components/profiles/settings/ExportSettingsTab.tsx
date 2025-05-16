"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Profile } from '../../../types/profile'; // Adjust path as needed
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/buttons/Button';
import { Card } from '../../ui/Card';
import { Icon } from '@iconify/react';
import { FileNodeViewer } from '../../file-explorer/FileNodeViewer'; // Adjust path as needed
import type { FileNode } from '../../../types/fileSystem'; // Adjust path as needed
import * as ProfileService from '../../../services/profile-service'; // Adjust path as needed
import { toast } from 'react-hot-toast';
import { useThemeStore } from '../../../store/useThemeStore';

interface ExportSettingsTabProps {
  profile: Profile;
  // Removed onExport, isExporting, onClone, isCloning as they are handled internally or via ProfileService
  // The component will now directly call ProfileService methods
  onClose: () => void; // To close the modal after certain actions like cloning
}

export function ExportSettingsTab({ profile, onClose }: ExportSettingsTabProps) {
  const [exportFilename, setExportFilename] = useState(profile.name);
  const [selectedExportPaths, setSelectedExportPaths] = useState<Set<string>>(new Set());
  const [exportOpenFolder, setExportOpenFolder] = useState(true);
  
  const [directoryStructure, setDirectoryStructure] = useState<FileNode | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const fetchStructure = async () => {
      if (!profile.id) {
        setDirectoryError("Profile ID is missing.");
        setIsLoadingDirectory(false);
        return;
      }
      setIsLoadingDirectory(true);
      setDirectoryError(null);
      try {
        const structure = await ProfileService.getProfileDirectoryStructure(profile.id);
        console.log(structure);
        setDirectoryStructure(structure);
      } catch (err) {
        console.error("Failed to fetch directory structure:", err);
        const message = err instanceof Error ? err.message : String(err);
        setDirectoryError(`Failed to load file structure: ${message}`);
        toast.error(`Failed to load file structure: ${message}`);
      } finally {
        setIsLoadingDirectory(false);
      }
    };
    fetchStructure();
  }, [profile.id]);

  const getAllPathsRecursive = (node: FileNode, paths: Set<string>) => {
    paths.add(node.path);
    if (node.is_dir && node.children) {
      for (const child of node.children) {
        getAllPathsRecursive(child, paths);
      }
    }
  };

  const handleSelectAll = () => {
    if (!directoryStructure) return;
    const newSelectedPaths = new Set<string>();
    // Assuming hideRootNode = true, so we iterate over children of rootNode
    if (directoryStructure.children) {
        directoryStructure.children.forEach(childNode => getAllPathsRecursive(childNode, newSelectedPaths));
    }
    // If hideRootNode was false, and you wanted to include the root node itself:
    // getAllPathsRecursive(directoryStructure, newSelectedPaths);
    setSelectedExportPaths(newSelectedPaths);
  };

  const handleDeselectAll = () => {
    setSelectedExportPaths(new Set<string>());
  };

  const handleExport = async () => {
    if (!exportFilename.trim()) {
      toast.error("Please enter a filename for the export.");
      return;
    }
    
    const exportPromise = ProfileService.exportProfile({
      profile_id: profile.id,
      file_name: exportFilename,
      include_files: selectedExportPaths.size > 0 ? Array.from(selectedExportPaths) : undefined,
      open_folder: exportOpenFolder,
    });

    toast.promise(exportPromise, {
      loading: `Exporting profile '${exportFilename}'...`,
      success: (exportPath) => {
        setIsExporting(false); // Ensure isExporting is reset on success
        return `Profile successfully exported to: ${exportPath}`;
      },
      error: (err) => {
        setIsExporting(false); // Ensure isExporting is reset on error
        const message = err instanceof Error ? err.message : String(err);
        // console.error is still good for detailed logs in developer console
        console.error("Failed to export profile:", err);
        return `Failed to export profile: ${message}`;
      }
    });

    // Set isExporting to true when the operation starts, 
    // and let the promise toast handle resetting it or further actions.
    // It might be better to set it right before the toast.promise if ProfileService.exportProfile is truly async setup
    setIsExporting(true); 
    // The setIsExporting(false) will be handled by the success/error callbacks of the toast
  };

  // GSAP animation for the tab content, similar to other tabs
  const contentRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isBackgroundAnimationEnabled && contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [isBackgroundAnimationEnabled]);

  return (
    <div ref={contentRef} className="space-y-6 p-1">
      <div>
        <h3 className="text-3xl font-minecraft text-white mb-1 lowercase">
          Export Profile
        </h3>
        <p className="text-xs text-white/70 mb-4 font-minecraft-ten tracking-wide">
          Export your profile to share with others or as a backup. You can customize which files are included.
        </p>
      </div>

      <Card variant="default" className="p-5 space-y-4" withAnimation={isBackgroundAnimationEnabled}>
        <div className="space-y-1">
          <label
            htmlFor="exportFilename"
            className="block text-2xl text-white font-minecraft mb-2 lowercase"
          >
            Export Filename
          </label>
          <Input
            id="exportFilename"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            placeholder="Enter filename without extension"
            className="text-xl py-2.5" // Adjusted size
            disabled={isExporting}
          />
          <p className="mt-1 text-xs text-white/50 font-minecraft-ten tracking-wide">
            The .noriskpack extension will be added automatically.
          </p>
        </div>
        
        <div className="mt-4">
            <h4 className="text-2xl font-minecraft text-white lowercase mb-1">
                Select Files & Folders (Optional)
            </h4>
            <p className="text-xs text-white/70 mb-3 font-minecraft-ten tracking-wide">
                Choose items to include in the export. If none selected, only profile configuration is exported.
            </p>
            <div className="flex gap-2 mb-3">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAll} 
                    disabled={isLoadingDirectory || !directoryStructure}
                    icon={<Icon icon="solar:check-read-outline" className="w-4 h-4" />}
                    className="text-xs px-3 py-1.5"
                >
                    Select All
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDeselectAll} 
                    disabled={isLoadingDirectory || selectedExportPaths.size === 0}
                    icon={<Icon icon="solar:close-circle-outline" className="w-4 h-4" />}
                    className="text-xs px-3 py-1.5"
                >
                    Deselect All
                </Button>
            </div>
            <Card variant="flat" className="p-3 bg-black/20 border border-white/10 max-h-80 overflow-y-auto custom-scrollbar">
                 <FileNodeViewer
                    rootNode={directoryStructure}
                    loading={isLoadingDirectory}
                    error={directoryError}
                    selectedFiles={selectedExportPaths}
                    onSelectionChange={setSelectedExportPaths}
                    checkboxesEnabled={true}
                    hideRootNode={true} // As per Svelte example
                    preSelectPaths={["resourcepacks", "shaderpacks", "options.txt"]} // As per Svelte example
                    selectChildrenWithParent={true} // As per Svelte example
                    defaultRootCollapsed={false} // Or true, common to keep root expanded if shown
                    className="text-sm"
                />
            </Card>
        </div>

        <div className="space-y-2 mt-4">
          <Checkbox
            checked={exportOpenFolder}
            onChange={(e) => setExportOpenFolder(e.target.checked)}
            label="Open folder after export"
            className="text-xl" // Consistent styling needed
            customSize="md"
            disabled={isExporting}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
            <Button
              variant="default"
              onClick={handleExport}
              disabled={isExporting || !exportFilename.trim() || isLoadingDirectory}
              icon={<Icon icon="solar:export-bold" className="w-5 h-5" />}
              size="md"
              className="text-xl w-full md:w-auto"
            >
              Export Profile
            </Button>
        </div>

      </Card>
    </div>
  );
} 