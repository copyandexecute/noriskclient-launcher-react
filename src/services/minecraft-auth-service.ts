import type { MinecraftAccount } from "../types/minecraft";
import { invoke } from "@tauri-apps/api/core";

export async function beginLogin(): Promise<MinecraftAccount | null> {
  console.log("Beginning login flow...");
  try {
    const result = await invoke<MinecraftAccount | null>("begin_login");
    console.log("Login result:", result);
    return result;
  } catch (error) {
    console.error("Error during login:", error);
    throw new Error(`Login failed: ${error}`);
  }
}

export async function removeAccount(accountId: string): Promise<void> {
  try {
    await invoke("remove_account", { account_id: accountId });
  } catch (error) {
    console.error(`Error removing account ${accountId}:`, error);
    throw new Error(`Failed to remove account: ${error}`);
  }
}

export async function getActiveAccount(): Promise<MinecraftAccount | null> {
  try {
    const account = await invoke<MinecraftAccount | null>("get_active_account");
    return account;
  } catch (error) {
    console.error("Error getting active account:", error);
    return null;
  }
}

export async function setActiveAccount(accountId: string): Promise<void> {
  try {
    await invoke("set_active_account", { account_id: accountId });
  } catch (error) {
    console.error(`Error setting active account ${accountId}:`, error);
    throw new Error(`Failed to set active account: ${error}`);
  }
}

export async function getAllAccounts(): Promise<MinecraftAccount[]> {
  try {
    const accounts = await invoke<MinecraftAccount[]>("get_accounts");
    return accounts || [];
  } catch (error) {
    console.error("Error getting all accounts:", error);
    return [];
  }
}
