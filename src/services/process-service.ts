import { invoke } from "@tauri-apps/api/core";

export interface ProcessMetadata {
  id: string;
  profile_id: string;
  name: string;
  state: "Running" | "Starting" | "Stopped" | "Error";
  pid: number;
  start_time: string;
  end_time?: string;
  exit_code?: number;
}

export async function getProcesses(): Promise<ProcessMetadata[]> {
  return invoke<ProcessMetadata[]>("get_processes");
}

export async function getProcess(
  processId: string,
): Promise<ProcessMetadata | null> {
  return invoke<ProcessMetadata | null>("get_process", {
    process_id: processId,
  });
}

export async function getProcessesByProfile(
  profileId: string,
): Promise<ProcessMetadata[]> {
  return invoke<ProcessMetadata[]>("get_processes_by_profile", {
    profile_id: profileId,
  });
}

export async function stopProcess(processId: string): Promise<void> {
  return invoke<void>("stop_process", { process_id: processId });
}

export async function getFullLog(processId: string): Promise<string> {
  return invoke<string>("get_full_log", { process_id: processId });
}

export async function openLogWindow(): Promise<void> {
  return invoke<void>("open_log_window");
}

export async function stopProfileProcesses(profileId: string): Promise<void> {
  try {
    const processes = await getProcessesByProfile(profileId);

    for (const process of processes) {
      if (process.state === "Running" || process.state === "Starting") {
        await stopProcess(process.id);
      }
    }
  } catch (err) {
    console.error(`Error stopping processes for profile ${profileId}:`, err);
    throw err;
  }
}
