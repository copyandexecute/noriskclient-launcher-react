import { listen } from "@tauri-apps/api/event";
import * as ProcessService from "./process-service";

class ProcessMonitor {
  private monitoredProfiles: Set<string> = new Set();
  private intervalId: number | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized) return;

    listen("minecraft_process_exited", (event) => {
      const payload = event.payload as any;
      if (
        payload.profile_id &&
        this.monitoredProfiles.has(payload.profile_id)
      ) {
        console.log(
          `[ProcessMonitor] Minecraft process exited for profile ${payload.profile_id}`,
        );
      }
    });

    this.intervalId = setInterval(() => this.checkProcesses(), 2000);

    this.initialized = true;
  }

  public startMonitoring(profileId: string) {
    console.log(
      `[ProcessMonitor] Starting monitoring for profile ${profileId}`,
    );
    this.monitoredProfiles.add(profileId);
  }

  public stopMonitoring(profileId: string) {
    console.log(
      `[ProcessMonitor] Stopping monitoring for profile ${profileId}`,
    );
    this.monitoredProfiles.delete(profileId);
  }

  private async checkProcesses() {
    if (this.monitoredProfiles.size === 0) return;

    try {
      for (const profileId of this.monitoredProfiles) {
        const processes = await ProcessService.getProcessesByProfile(profileId);
        const hasRunningProcess = processes.some(
          (p) => p.state === "Running" || p.state === "Starting",
        );

        if (!hasRunningProcess) {
          console.log(
            `[ProcessMonitor] No running processes found for profile ${profileId}`,
          );
        }
      }
    } catch (err) {
      console.error("[ProcessMonitor] Error checking processes:", err);
    }
  }

  public async isProfileRunning(profileId: string): Promise<boolean> {
    try {
      const processes = await ProcessService.getProcessesByProfile(profileId);
      return processes.some(
        (p) => p.state === "Running" || p.state === "Starting",
      );
    } catch (err) {
      console.error(
        `[ProcessMonitor] Error checking if profile ${profileId} is running:`,
        err,
      );
      return false;
    }
  }

  public dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.monitoredProfiles.clear();
  }
}

export const processMonitor = new ProcessMonitor();
