import { invoke } from "@tauri-apps/api/core";

export async function isMinecraftRunning(profileId: string): Promise<boolean> {
  return invoke<boolean>("is_minecraft_running", { profileId });
}

export async function killMinecraft(profileId: string): Promise<void> {
  return invoke<void>("kill_minecraft", { profileId });
}

export async function launch(profileId: string): Promise<void> {
  return invoke<void>("launch_profile", { id: profileId });
}

export async function abort(profileId: string): Promise<void> {
  return invoke<void>("abort_profile_launch", { profileId });
}
