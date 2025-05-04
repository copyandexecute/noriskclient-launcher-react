"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import type { MinecraftAccount } from "../../types/minecraft";

interface MinecraftAccountManagerProps {
  onClose: () => void;
  isInDropdown?: boolean;
}

export function MinecraftAccountManager({
  onClose,
  isInDropdown,
}: MinecraftAccountManagerProps) {
  const {
    accounts,
    isLoading,
    error,
    addAccount,
    removeAccount,
    setActiveAccount,
  } = useMinecraftAuthStore();

  const handleAddAccount = async () => {
    try {
      await addAccount();
    } catch (err) {
      console.error("Error adding account:", err);
    }
  };

  const handleSetActive = async (accountId: string) => {
    await setActiveAccount(accountId);
  };

  const handleRemoveAccount = async (accountId: string) => {
    await removeAccount(accountId);
  };

  if (isInDropdown) {
    return (
      <div className="flex flex-col h-full">
        {error && (
          <div className="p-4">
            <StatusMessage type="error" message={error} />
          </div>
        )}

        <div className="px-4 py-3 flex-shrink-0">
          <h3 className="text-lg font-minecraft text-white lowercase select-none">
            Manage Accounts
          </h3>
        </div>

        <div className="flex-grow overflow-hidden">
          <div className="bg-black/30 backdrop-blur-md h-full overflow-y-auto custom-scrollbar pr-2 space-y-2">
            <div className="py-2">
              {isLoading && accounts.length === 0 ? (
                <div className="py-3 text-center px-4">
                  <div className="inline-block w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="mt-1 text-white/70 text-sm">
                    Loading accounts...
                  </p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-3 text-center px-4">
                  <p className="text-white/70 text-sm">No accounts found.</p>
                </div>
              ) : (
                accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onSetActive={handleSetActive}
                    onRemoveAccount={handleRemoveAccount}
                    isLoading={isLoading}
                    isDropdownItem
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 pt-4 border-t border-white/10 flex-shrink-0">
          <Button
            variant="success"
            onClick={handleAddAccount}
            disabled={isLoading}
            icon={<Icon icon="pixel:user-plus-solid" className="w-4 h-4" />}
            className="text-sm py-1.5 px-3 w-full justify-center"
          >
            {isLoading ? (
              <>
                <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
                <span className="ml-1.5">processing...</span>
              </>
            ) : (
              "Add Minecraft Account"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      title="minecraft account manager"
      onClose={onClose}
      width="lg"
    >
      <div className="p-6">
        {error && <StatusMessage type="error" message={error} />}

        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-minecraft text-white mb-5 lowercase select-none">
              manage minecraft accounts
            </h3>
            <p className="text-xl text-white/70 mb-6 font-minecraft tracking-wide select-none">
              Add, remove, or set active Minecraft accounts for launching the
              game.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md border-2 border-white/20 p-5">
            <h3 className="text-2xl text-white font-medium mb-3 select-none">
              Your Accounts:
            </h3>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {isLoading && accounts.length === 0 ? (
                <div className="py-4 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="mt-2 text-white/70 text-xl">
                    Loading accounts...
                  </p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-white/70 text-xl">No accounts found</p>
                  <p className="mt-1 text-white/50 text-lg">
                    Add a Minecraft account to get started
                  </p>
                </div>
              ) : (
                accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onSetActive={handleSetActive}
                    onRemoveAccount={handleRemoveAccount}
                    isLoading={isLoading}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface AccountItemProps {
  account: MinecraftAccount;
  onSetActive: (accountId: string) => Promise<void>;
  onRemoveAccount: (accountId: string) => Promise<void>;
  isLoading: boolean;
  isDropdownItem?: boolean;
}

function AccountItem({
  account,
  onSetActive,
  onRemoveAccount,
  isLoading,
  isDropdownItem,
}: AccountItemProps) {
  const textSize = isDropdownItem ? "text-xl" : "text-xl";
  const padding = isDropdownItem ? "p-2" : "p-4";
  const buttonSize = isDropdownItem ? "text-xs py-1 px-2" : "text-lg";
  const iconSize = isDropdownItem ? "w-4 h-4" : "w-5 h-5";
  const headSize = isDropdownItem ? "w-8 h-8 text-base" : "w-10 h-10 text-lg";
  const activeBadgeSize = isDropdownItem ? "text-xs px-2 py-0.5" : "text-lg px-3 py-1";

  // Construct Crafatar URL (use account.id which should be the UUID)
  const avatarUrl = account.id 
    ? `https://crafatar.com/avatars/${account.id}?overlay&size=${isDropdownItem ? 24 : 32}`
    : null;

  return (
    <div
      className={`flex items-center justify-between rounded ${padding} ${
        account.active ? "bg-white/10" : "bg-black/40"
      } border border-white/10 hover:border-white/20 transition-colors`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-grow">
        <div className={`relative ${headSize} overflow-hidden border border-white/20 flex items-center justify-center bg-black/50 flex-shrink-0 rounded-sm`}> 
          {avatarUrl ? (
            <img 
              src={avatarUrl}
              alt={`${account.minecraft_username || account.username}'s avatar`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-white font-minecraft">
              {account.minecraft_username?.charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className={`${textSize} text-white font-minecraft truncate`} title={account.minecraft_username || account.username}>
            {account.minecraft_username || account.username}
          </h4>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {account.active ? (
          <span className={`bg-green-900/30 text-green-300 ${activeBadgeSize} rounded-full border border-green-500/30 whitespace-nowrap`}>
            Active
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={() => onSetActive(account.id)}
            disabled={isLoading}
            className={buttonSize}
          >
            Set Active
          </Button>
        )}
        <Button
          variant="danger"
          onClick={() => onRemoveAccount(account.id)}
          disabled={isLoading}
          icon={<Icon icon="pixel:trash-solid" className={iconSize} />}
          className={`${buttonSize} px-2`}
          aria-label="Remove Account"
          title="Remove Account"
        >
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  );
}
