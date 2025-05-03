"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import type { MinecraftAccount } from "../../types/minecraft";

interface MinecraftAccountManagerProps {
  onClose: () => void;
}

export function MinecraftAccountManager({
  onClose,
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

  const renderFooter = () => (
    <div className="flex justify-end">
      <Button
        variant="success"
        onClick={handleAddAccount}
        disabled={isLoading}
        icon={<Icon icon="pixel:user-plus-solid" className="w-5 h-5" />}
        className="text-2xl py-3 px-6"
      >
        {isLoading ? (
          <>
            <Icon icon="pixel:spinner-solid" className="w-5 h-5 animate-spin" />
            <span>processing...</span>
          </>
        ) : (
          "add minecraft account"
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      title="minecraft account manager"
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
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
}

function AccountItem({
  account,
  onSetActive,
  onRemoveAccount,
  isLoading,
}: AccountItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded ${
        account.active ? "bg-white/10" : "bg-black/40"
      } border-2 border-white/10 hover:border-white/30 transition-colors`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 overflow-hidden border-2 border-white/20 flex items-center justify-center bg-black/40 text-white font-minecraft text-lg">
          {account.minecraft_username?.charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <h4 className="text-xl text-white font-minecraft">
            {account.minecraft_username || account.username}
          </h4>
          <p className="text-sm text-white/50">
            ID: {account.id.substring(0, 8)}...
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {account.active ? (
          <span className="px-3 py-1 bg-green-900/30 text-green-300 text-lg rounded-full border border-green-500/30">
            Active
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={() => onSetActive(account.id)}
            disabled={isLoading}
            className="text-lg"
          >
            Set Active
          </Button>
        )}
        <Button
          children={"remove"}
          variant="danger"
          onClick={() => onRemoveAccount(account.id)}
          disabled={isLoading}
          icon={<Icon icon="pixel:trash-solid" className="w-5 h-5" />}
          className="text-lg"
        />
      </div>
    </div>
  );
}
