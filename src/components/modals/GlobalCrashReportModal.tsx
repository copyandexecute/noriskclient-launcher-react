import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useCrashModalStore } from '../../store/crash-modal-store';
import { Button } from '../ui/buttons/Button';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';
import { getProfile, getProfileLatestLogContent } from '../../services/profile-service';
import { uploadLogToMclogs } from '../../services/log-service';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { submitCrashLog } from '../../services/process-service';
import type { CrashlogDto } from '../../types/processState';
import { openExternalUrl } from '../../services/tauri-service';

export function GlobalCrashReportModal() {
  const { isCrashModalOpen, crashData, closeCrashModal } = useCrashModalStore();
  const [profileName, setProfileName] = useState<string>('');
  const [mclogsUrl, setMclogsUrl] = useState<string | null>(null);
  const [isUploadingAndReporting, setIsUploadingAndReporting] = useState(false);

  useEffect(() => {
    if (crashData?.profile_id) {
      if (crashData.process_metadata?.profile_name) {
        setProfileName(crashData.process_metadata.profile_name);
      } else {
        setProfileName(crashData.profile_id);
        getProfile(crashData.profile_id)
          .then(details => {
            if (details?.name) {
              setProfileName(details.name);
            }
          })
          .catch(err => {
            console.error(`Failed to fetch profile details for ${crashData.profile_id}:`, err);
          });
      }
      setMclogsUrl(null);
      setIsUploadingAndReporting(false); // Reset reporting state
    } else {
      setProfileName('');
      setMclogsUrl(null);
      setIsUploadingAndReporting(false);
    }
  }, [crashData]);

  if (!isCrashModalOpen || !crashData) {
    return null;
  }

  const handleUploadAndReport = async () => {
    if (!crashData?.profile_id || !crashData?.process_metadata) {
      toast.error("Cannot proceed: Missing critical crash data.");
      console.error("Upload/Report error: Missing profile_id or process_metadata", crashData);
      return;
    }

    if (mclogsUrl) { // Logs already uploaded, just copy URL
      try {
        await writeText(mclogsUrl);
        toast.success("mclogs.com URL copied to clipboard!");
      } catch (error) {
        toast.error("Error copying URL to clipboard.");
        console.error("Failed to copy mclogs URL to clipboard:", error);
      }
      return;
    }

    setIsUploadingAndReporting(true);

    const combinedPromise = getProfileLatestLogContent(crashData.profile_id)
      .then(logContent => {
        if (!logContent || logContent.trim() === "") {
          throw new Error("No log content found to upload.");
        }
        toast.loading('Uploading to mclogs.com...'); // Initial toast
        return uploadLogToMclogs(logContent);
      })
      .then(async (newMclogsUrl) => {
        setMclogsUrl(newMclogsUrl);
        toast.dismiss(); // Dismiss mclogs upload toast
        toast.success("Log uploaded to mclogs.com!")
        
        // Now submit to NoRisk server
        const crashReportPayload: CrashlogDto = {
          mcLogsUrl: newMclogsUrl,
          metadata: crashData.process_metadata!, // We checked for process_metadata earlier
        };
        toast.loading('Submitting crash report to NoRisk...');
        return submitCrashLog(crashReportPayload).then(() => newMclogsUrl); // Pass URL for final success
      })
      .then(async (finalUrl) => {
        toast.dismiss();
        try {
          await writeText(finalUrl);
          return "Report submitted & Log URL copied!";
        } catch (copyError) {
          console.error("Failed to copy mclogs URL to clipboard after report:", copyError);
          return `Report submitted. Log URL: ${finalUrl} (Copying failed)`;
        }
      });

    toast.promise(combinedPromise, {
      loading: 'Processing crash report...', // This will be quickly replaced by specific loading toasts
      success: (message) => {
        setIsUploadingAndReporting(false);
        return message;
      },
      error: (err) => {
        setIsUploadingAndReporting(false);
        toast.dismiss(); // Ensure any stray loading toasts are dismissed
        return err.message || 'An error occurred during the process.';
      },
    });
  };
  
  const handleContactSupport = async () => {
    try {
      await openExternalUrl('https://discord.norisk.gg');
      toast.success("Opened NoRisk Discord in your browser!");
    } catch (error) {
      console.error("Failed to open Discord URL:", error);
      toast.error("Could not open Discord. Please go to discord.norisk.gg manually.");
    }
  };

  const modalFooter = (
    <div className="flex flex-wrap justify-end gap-3">
      <Button 
        onClick={handleUploadAndReport} 
        variant="secondary" 
        icon={<Icon icon="solar:upload-linear" className="w-5 h-5" />}
        disabled={isUploadingAndReporting || !crashData?.process_metadata}
      >
        {mclogsUrl ? 'Copy Log URL' : 'Upload Logs & Report'}
      </Button>
      <Button 
        onClick={handleContactSupport} 
        variant="default" 
        icon={<Icon icon="solar:letter-linear" className="w-5 h-5" />}
        disabled={isUploadingAndReporting} // Disable if main action is in progress
      >
        Contact Support
      </Button>
    </div>
  );

  const titleSubtitleNode = (
    <p className="text-xs font-minecraft-ten text-gray-400">
      Profile: {crashData.process_metadata?.profile_name || profileName || 'Loading...'}
    </p>
  );

  return (
    <Modal
      title="Minecraft Crash Report"
      titleIcon={<Icon icon="solar:danger-bold" className="w-7 h-7 text-red-400" />}
      titleSubtitle={titleSubtitleNode}
      onClose={() => !isUploadingAndReporting && closeCrashModal()} // Prevent close during operation
      width="md"
      footer={modalFooter}
    >
      <div className="p-6 space-y-4 text-white text-base text-center">
        <p className="pt-3 text-gray-300 text-lg font-minecraft-ten">
          An unexpected error occurred and the game crashed. We are sorry for the inconvenience.
        </p>

        <p className="pt-4 text-2xl font-minecraft text-red-400">
          exit code: {crashData.exit_code ?? 'N/A'}
        </p>
      </div>
    </Modal>
  );
} 