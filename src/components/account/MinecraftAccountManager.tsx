"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import type { MinecraftAccount } from "../../types/minecraft";
import {
  showErrorToast,
  showInfoToast,
  showLoadingToast,
  showSuccessToast,
} from "../../utils/toast-utils";
import { DropdownHeader } from "../ui/dropdown/DropdownHeader";
import { DropdownFooter } from "../ui/dropdown/DropdownFooter";
import { DropdownDivider } from "../ui/dropdown/DropdownDivider";
import { Label } from "../ui/Label";

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
    let toastId: string | number | undefined;
    try {
      toastId = showLoadingToast("Starting Microsoft login...");
      console.log(`[Toast Debug] Loading Toast ID generated: ${toastId}`);

      await addAccount();
      console.log(
        `[Toast Debug] addAccount successful. Replacing Toast ID: ${toastId}`,
      );

      showSuccessToast("Account added successfully!", undefined, {
        id: toastId,
      });
    } catch (err) {
      console.error("Error during addAccount process:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      console.log(
        `[Toast Debug] addAccount caught error. Replacing Toast ID: ${toastId} with error: ${errorMessage}`,
      );

      if (errorMessage === "Login process cancelled by user.") {
        showInfoToast("Login Cancelled", "The login process was cancelled.", {
          id: toastId,
        });
      } else {
        showErrorToast("Failed to add account", errorMessage, { id: toastId });
      }
    }
  };

  const handleSetActive = async (accountId: string) => {
    const accountToActivate = accounts.find((acc) => acc.id === accountId);
    const accountName =
      accountToActivate?.minecraft_username ||
      accountToActivate?.username ||
      "Account";
    let toastId: string | number | undefined;
    try {
      toastId = showLoadingToast(`Setting ${accountName} as active...`);
      await setActiveAccount(accountId);
      showSuccessToast(`${accountName} is now the active account.`, undefined, {
        id: toastId,
      });
    } catch (err) {
      console.error(`Error setting active account ${accountId}:`, err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast("Failed to set active account", errorMessage, {
        id: toastId,
      });
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    const accountToRemove = accounts.find((acc) => acc.id === accountId);
    const accountName =
      accountToRemove?.minecraft_username ||
      accountToRemove?.username ||
      "Account";
    let toastId: string | number | undefined;
    try {
      await removeAccount(accountId);
      showSuccessToast(`${accountName} removed successfully.`);
    } catch (err) {
      console.error(`Error removing account ${accountId}:`, err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast("Failed to remove account", errorMessage);
    }
  };

  if (isInDropdown) {
    return (
      <div className="flex flex-col max-h-[400px]">
        <DropdownHeader title="Minecraft Accounts">
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        </DropdownHeader>

        <div className="overflow-y-auto custom-scrollbar max-h-[300px]">
          {isLoading && accounts.length === 0 ? (
            <div className="py-3 px-3 text-center">
              <Icon
                icon="solar:spinner-bold"
                className="w-5 h-5 animate-spin mx-auto text-white/70"
              />
              <p className="mt-1 text-white/70 text-sm">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-4 px-3 text-center">
              <Icon
                icon="solar:user-cross-bold"
                className="w-6 h-6 mx-auto text-white/50 mb-1"
              />
              <p className="text-white/70 text-sm">No accounts found</p>
              <p className="mt-1 text-white/50 text-xs">
                Add a Minecraft account to get started
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {accounts.map((account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  onSetActive={handleSetActive}
                  onRemoveAccount={handleRemoveAccount}
                  isLoading={isLoading}
                  isDropdownItem
                />
              ))}
            </div>
          )}
        </div>

        <DropdownDivider />

        <DropdownFooter>
          <Button
            variant="default"
            onClick={handleAddAccount}
            disabled={isLoading}
            icon={<Icon icon="solar:add-circle-bold" className="w-3 h-3" />}
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Icon
                  icon="solar:spinner-bold"
                  className="w-3 h-3 animate-spin"
                />
                <span className="ml-1">Processing...</span>
              </>
            ) : (
              "Add Account"
            )}
          </Button>
        </DropdownFooter>
      </div>
    );
  }

  return (
    <Modal title="minecraft account manager" onClose={onClose} width="lg">
      <div className="p-6">
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

          <div className="bg-black/30 backdrop-blur-md border-2 border-white/20 p-5 rounded-md">
            <h3 className="text-2xl text-white font-medium mb-3 select-none">
              Your Accounts:
            </h3>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {isLoading && accounts.length === 0 ? (
                <div className="py-4 text-center">
                  <Icon
                    icon="solar:spinner-bold"
                    className="w-8 h-8 animate-spin mx-auto text-white/70"
                  />
                  <p className="mt-2 text-white/70 text-xl">
                    Loading accounts...
                  </p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon
                    icon="solar:user-cross-bold"
                    className="w-12 h-12 mx-auto text-white/50 mb-3"
                  />
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

          <div className="flex justify-end gap-3">
            <Button
              variant="success"
              onClick={handleAddAccount}
              disabled={isLoading}
              icon={<Icon icon="solar:add-circle-bold" className="w-5 h-5" />}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Icon
                    icon="solar:spinner-bold"
                    className="w-5 h-5 animate-spin"
                  />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                "Add Minecraft Account"
              )}
            </Button>
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
  const avatarUrl = account.id
    ? `https://crafatar.com/avatars/${account.id}?overlay&size=${isDropdownItem ? 24 : 40}`
    : null;

  return (
    <div
      className={`flex items-center justify-between rounded-md ${
        account.active ? "bg-white/10" : "bg-black/40"
      } border border-white/10 hover:border-white/20 transition-colors overflow-hidden`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-grow p-2">
        <div
          className={`relative ${
            isDropdownItem ? "w-6 h-6" : "w-10 h-10"
          } overflow-hidden border border-white/20 flex items-center justify-center bg-black/50 flex-shrink-0 rounded-sm`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={`${account.minecraft_username || account.username}'s avatar`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <span
              className={`text-white font-minecraft ${isDropdownItem ? "text-xs" : ""}`}
            >
              {account.minecraft_username?.charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h4
            className={`${isDropdownItem ? "text-sm" : "text-2xl"} text-white font-minecraft truncate`}
            title={account.minecraft_username || account.username}
          >
            {account.minecraft_username || account.username}
          </h4>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 p-1">
        {account.active ? (
          <Label
            variant="success"
            size={isDropdownItem ? "xs" : "md"}
            className="whitespace-nowrap"
            icon={
              <Icon
                icon="solar:check-circle-bold"
                className={isDropdownItem ? "w-3 h-3" : "w-5 h-5"}
              />
            }
          >
            Active
          </Label>
        ) : (
          <Button
            variant="secondary"
            onClick={() => onSetActive(account.id)}
            disabled={isLoading}
            size={isDropdownItem ? "xs" : "md"}
            className={isDropdownItem ? "min-w-0" : ""}
          >
            Set Active
          </Button>
        )}
        {isDropdownItem ? (
          <IconButton
            variant="destructive"
            onClick={() => onRemoveAccount(account.id)}
            disabled={isLoading}
            icon={
              <Icon icon="solar:trash-bin-trash-bold" className="w-3 h-3" />
            }
            size="xs"
            aria-label="Remove Account"
          />
        ) : (
          <Button
            variant="destructive"
            onClick={() => onRemoveAccount(account.id)}
            disabled={isLoading}
            icon={
              <Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5" />
            }
            size="md"
            aria-label="Remove Account"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
