import { create } from "zustand";
import { MinecraftAuthService } from "../services/minecraft-auth-service";
import type { MinecraftAccount } from "../types/minecraft";

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

      const accounts = await MinecraftAuthService.getAccounts();

      const activeAccount = await MinecraftAuthService.getActiveAccount();

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
        error: `Failed to load accounts: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },

  addAccount: async () => {
    try {
      set({ isLoading: true, error: null });

      const newAccount = await MinecraftAuthService.beginLogin();

      if (newAccount) {
        const accounts = await MinecraftAuthService.getAccounts();
        const activeAccount = await MinecraftAuthService.getActiveAccount();

        const updatedAccounts = accounts.map((account) => ({
          ...account,
          active: activeAccount ? account.id === activeAccount.id : false,
        }));

        set({
          accounts: updatedAccounts,
          activeAccount,
          isLoading: false,
        });
      } else {
        console.log("Login process did not return a new account (likely cancelled).");
        set({ isLoading: false });
        throw new Error("Login process cancelled by user.");
      }
    } catch (error) {
      console.error("Failed to add account (in store):", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to add account: ${errorMessage}`,
        isLoading: false,
      });
      throw error;
    }
  },

  removeAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await MinecraftAuthService.removeAccount(accountId);

      const accounts = await MinecraftAuthService.getAccounts();
      const activeAccount = await MinecraftAuthService.getActiveAccount();

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
      console.error("Failed to remove account:", error);
      set({
        error: `Failed to remove account: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },

  setActiveAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await MinecraftAuthService.setActiveAccount(accountId);

      const activeAccount = await MinecraftAuthService.getActiveAccount();

      const updatedAccounts = get().accounts.map((account) => ({
        ...account,
        active: account.id === accountId,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to set active account:", error);
      set({
        error: `Failed to set active account: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },
}));
