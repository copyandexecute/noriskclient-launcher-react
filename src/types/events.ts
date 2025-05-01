export enum EventType {
  InstallingJava = "installing_java",
  DownloadingLibraries = "downloading_libraries",
  ExtractingNatives = "extracting_natives",
  DownloadingAssets = "downloading_assets",
  ReusingMinecraftAssets = "reusing_minecraft_assets",
  CopyingNoRiskClientAssets = "copying_norisk_client_assets",
  DownloadingNoRiskClientAssets = "downloading_norisk_client_assets",
  DownloadingClient = "downloading_client",
  InstallingFabric = "installing_fabric",
  InstallingQuilt = "installing_quilt",
  InstallingForge = "installing_forge",
  InstallingNeoForge = "installing_neoforge",
  PatchingForge = "patching_forge",
  DownloadingMods = "downloading_mods",
  SyncingMods = "syncing_mods",
  LaunchingMinecraft = "launching_minecraft",
  MinecraftOutput = "minecraft_output",
  AccountLogin = "account_login",
  AccountRefresh = "account_refresh",
  AccountLogout = "account_logout",
  ProfileUpdate = "profile_update",
  TriggerProfileUpdate = "trigger_profile_update",
  MinecraftProcessExited = "minecraft_process_exited",
  Error = "error",
}

export interface EventPayload {
  event_id: string;
  event_type: string;
  target_id: string | null;
  message: string;
  progress: number | null;
  error: string | null;
}

export interface MinecraftProcessExitedPayload {
  profile_id: string;
  process_id: string;
  exit_code: number | null;
  success: boolean;
}
