import { create } from "zustand";

import type { MinecraftAccount } from "../types/minecraft";
import { invoke } from "@tauri-apps/api/core";

interface MinecraftAuthState {
  accounts: MinecraftAccount[];
  activeAccount: MinecraftAccount | null;
  isLoading: boolean;
  error: string | null;

  initializeAccounts: () => Promise<void>;
  addAccount: () => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<void>;
}

export const useMinecraftAuthStore = create<MinecraftAuthState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  isLoading: false,
  error: null,

  initializeAccounts: async () => {
    try {
      set({ isLoading: true, error: null });

      const accounts = await invoke<MinecraftAccount[]>("get_accounts");

      const activeAccount = await invoke<MinecraftAccount | null>(
        "get_active_account",
      );
      const updatedAccounts = accounts.map((account) => ({
        ...account,
        active: activeAccount ? account.id === activeAccount.id : false,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to initialize accounts:", error);
      set({
        error: `Failed to load accounts: ${error}`,
        isLoading: false,
      });
    }
  },

  addAccount: async () => {
    try {
      set({ isLoading: true, error: null });

      const newAccount = await invoke<MinecraftAccount | null>("begin_login");

      if (newAccount) {
        await get().initializeAccounts();
      }

      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to add account:", error);
      set({
        error: `Failed to add account: ${error}`,
        isLoading: false,
      });
    }
  },

  removeAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await invoke("remove_account", { accountId });

      await get().initializeAccounts();

      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to remove account:", error);
      set({
        error: `Failed to remove account: ${error}`,
        isLoading: false,
      });
    }
  },

  setActiveAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await invoke("set_active_account", { accountId });

      await get().initializeAccounts();

      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to set active account:", error);
      set({
        error: `Failed to set active account: ${error}`,
        isLoading: false,
      });
    }
  },
}));
