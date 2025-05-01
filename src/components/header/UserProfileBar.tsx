"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";

interface UserProfileBarProps {
  username: string;
  avatarUrl: string;
  className?: string;
}

export function UserProfileBar({ className }: UserProfileBarProps) {
  const profileRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const {
    accounts,
    activeAccount,
    isLoading,
    error,
    initializeAccounts,
    addAccount,
    removeAccount,
    setActiveAccount,
  } = useMinecraftAuthStore();

  useEffect(() => {
    initializeAccounts();
  }, [initializeAccounts]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(profileRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAddAccount = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addAccount();
    } catch (err) {
      console.error("Error adding account:", err);
    }
  };

  const handleSetActive = async (e: React.MouseEvent, accountId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await setActiveAccount(accountId);
  };

  const handleRemoveAccount = async (
    e: React.MouseEvent,
    accountId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await removeAccount(accountId);
  };

  return (
    <div className="relative">
      <ProfileBarButton
        ref={profileRef}
        activeAccount={activeAccount}
        isDropdownOpen={isDropdownOpen}
        onClick={toggleDropdown}
        className={className}
      />

      {isDropdownOpen && (
        <AccountDropdown
          ref={dropdownRef}
          profileRef={profileRef}
          accounts={accounts}
          activeAccount={activeAccount}
          isLoading={isLoading}
          error={error}
          onClose={() => setIsDropdownOpen(false)}
          onAddAccount={handleAddAccount}
          onSetActive={handleSetActive}
          onRemoveAccount={handleRemoveAccount}
        />
      )}
    </div>
  );
}

interface ProfileBarButtonProps {
  activeAccount: any;
  isDropdownOpen: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

const ProfileBarButton = forwardRef<HTMLDivElement, ProfileBarButtonProps>(
  ({ activeAccount, isDropdownOpen, onClick, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 bg-black/50 h-10 px-4 py-1 max-w-fit backdrop-blur-md cursor-pointer",
          "border-2 border-white/30 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:border-white/50 transition-colors",
          isDropdownOpen && "border-white/50",
          className,
        )}
        onClick={onClick}
      >
        <div className="relative w-7 h-7 overflow-hidden border-2 border-white/30">
          {activeAccount ? (
            <div className="w-full h-full bg-black/40 flex items-center justify-center text-white font-minecraft text-xs">
              {activeAccount.minecraft_username?.charAt(0).toUpperCase() || "?"}
            </div>
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center text-white font-minecraft text-xs">
              +
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeAccount ? (
            <>
              <span className="text-xs text-white/80 font-minecraft uppercase">
                Logged in as
              </span>
              <span className="text-sm text-white font-minecraft uppercase">
                {activeAccount.minecraft_username || activeAccount.username}
              </span>
            </>
          ) : (
            <span className="text-sm text-white font-minecraft uppercase">
              Add Account
            </span>
          )}
        </div>
        <Icon
          icon={isDropdownOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
          className="w-4 h-4 text-white/70 ml-1"
        />
      </div>
    );
  },
);

ProfileBarButton.displayName = "ProfileBarButton";

interface AccountDropdownProps {
  profileRef: React.RefObject<HTMLDivElement>;
  accounts: any[];
  activeAccount: any;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onAddAccount: (e: React.MouseEvent) => Promise<void>;
  onSetActive: (e: React.MouseEvent, accountId: string) => Promise<void>;
  onRemoveAccount: (e: React.MouseEvent, accountId: string) => Promise<void>;
}

const AccountDropdown = forwardRef<HTMLDivElement, AccountDropdownProps>(
  ({
    profileRef,
    accounts,
    isLoading,
    error,
    onClose,
    onAddAccount,
    onSetActive,
    onRemoveAccount,
  }) => {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />
        <Card
          className="absolute w-80 z-[10000] overflow-hidden"
          // @ts-ignore
          style={{
            animation: "fadeIn 0.2s ease-out",
            position: "fixed",
            right: profileRef.current
              ? window.innerWidth -
                profileRef.current.getBoundingClientRect().right
              : 20,
            top: profileRef.current
              ? profileRef.current.getBoundingClientRect().bottom + 8
              : 60,
          }}
          onClick={(e: any) => e.stopPropagation()}
        >
          <CardHeader className="p-4 border-b border-white/10">
            <h3 className="text-lg font-minecraft text-white">
              Account Manager
            </h3>
          </CardHeader>

          <CardContent className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
              {isLoading && accounts.length === 0 ? (
                <div className="py-4 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="mt-2 text-white/70 text-sm">
                    Loading accounts...
                  </p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-white/70 text-sm">No accounts found</p>
                  <p className="mt-1 text-white/50 text-xs">
                    Add a Minecraft account to get started
                  </p>
                </div>
              ) : (
                accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onSetActive={onSetActive}
                    onRemoveAccount={onRemoveAccount}
                    isLoading={isLoading}
                  />
                ))
              )}
            </div>

            <Button
              // @ts-ignore
              onClick={onAddAccount}
              disabled={isLoading}
              variant="success"
              className="w-full py-2 text-sm"
            >
              {isLoading ? "Processing..." : "Add Minecraft Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  },
);

AccountDropdown.displayName = "AccountDropdown";

interface AccountItemProps {
  account: any;
  onSetActive: (e: React.MouseEvent, accountId: string) => Promise<void>;
  onRemoveAccount: (e: React.MouseEvent, accountId: string) => Promise<void>;
  isLoading: boolean;
}

function AccountItem({
  account,
  onSetActive,
  onRemoveAccount,
  isLoading,
}: AccountItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded ${
        account.active ? "bg-white/10" : "bg-black/40"
      } border border-white/10 hover:border-white/30 transition-colors`}
    >
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 overflow-hidden border-2 border-white/20 rounded flex items-center justify-center bg-black/40 text-white font-minecraft text-xs">
          {account.minecraft_username?.charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <h4 className="text-sm text-white font-minecraft">
            {account.minecraft_username || account.username}
          </h4>
          <p className="text-xs text-white/50">
            {account.id.substring(0, 8)}...
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {account.active ? (
          <span className="px-2 py-0.5 bg-green-900/30 text-green-300 text-xs rounded-full">
            Active
          </span>
        ) : (
          <button
            className="px-2 py-0.5 bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 text-xs rounded-full transition-colors"
            onClick={(e) => onSetActive(e, account.id)}
            disabled={isLoading}
          >
            Set Active
          </button>
        )}
        <button
          className="p-1 text-red-300 hover:bg-red-900/30 rounded-full transition-colors"
          onClick={(e) => onRemoveAccount(e, account.id)}
          disabled={isLoading}
          title="Remove Account"
        >
          <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
