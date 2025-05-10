"use client";

import React, { useEffect, useState, forwardRef, ForwardedRef } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { useThemeStore } from "../../store/useThemeStore";
import { createPortal } from "react-dom";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

interface ProfileContextMenuProps {
  profile: Profile;
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onDelete: (profileId: string, profileName: string) => void;
  onDuplicate: () => void;
  onOpenFolder: () => void;
  // Add other actions here, e.g., onEdit, onClone
}

export const ProfileContextMenu = forwardRef<HTMLDivElement, ProfileContextMenuProps>(
  function ProfileContextMenuComponent(
    {
      profile,
      visible,
      x,
      y,
      onClose,
      onDelete,
      onDuplicate,
      onOpenFolder,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const { confirm, confirmDialog } = useConfirmDialog();

    useEffect(() => {
      setPortalNode(document.body);
    }, []);

    if (!visible || !portalNode) {
      return null;
    }

    const handleAction = (action: () => void) => {
      console.log("[ContextMenu] handleAction called");
      action();
      onClose();
    };

    const menuContent = (
      <div
        ref={ref}
        className="fixed z-[9999] rounded-md shadow-xl border-2 border-b-4 overflow-hidden"
        style={{
          top: y,
          left: x,
          backgroundColor: accentColor.value + "20",
          borderColor: accentColor.value + "90",
          borderBottomColor: accentColor.value,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow:
            "0 8px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="py-1">
          {!profile.is_standard_version && (
            <li
              className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-colors duration-150"
              onClick={() => {
                console.log("[ContextMenu] Delete item clicked - will call handleAction");
                handleAction(() => onDelete(profile.id, profile.name));
              }}
            >
              <Icon
                icon="solar:trash-bin-trash-bold"
                className="w-5 h-5 text-red-400"
              />
              <span className="font-minecraft text-xl lowercase text-red-400">
                Delete Profile
              </span>
            </li>
          )}
          {/* Duplicate Action */}
          <li
            className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-colors duration-150"
            onClick={() => {
              console.log("[ContextMenu] Duplicate item clicked");
              handleAction(onDuplicate);
            }}
          >
            <Icon icon="solar:copy-bold" className="w-5 h-5 text-blue-400" />
            <span className="font-minecraft text-xl lowercase text-blue-400">
              Duplicate Profile
            </span>
          </li>
          {/* Open Folder Action */}
          <li
            className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-colors duration-150"
            onClick={() => {
              console.log("[ContextMenu] Open Folder item clicked");
              handleAction(onOpenFolder);
            }}
          >
            <Icon icon="solar:folder-with-files-bold" className="w-5 h-5 text-green-400" />
            <span className="font-minecraft text-xl lowercase text-green-400">
              Open Profile Folder
            </span>
          </li>
          {/* Add other menu items here */}
        </ul>
        {/* Ensure the confirmDialog from useConfirmDialog is rendered here */}
        {confirmDialog}
      </div>
    );

    return createPortal(menuContent, portalNode);
  }
);

ProfileContextMenu.displayName = "ProfileContextMenu"; 