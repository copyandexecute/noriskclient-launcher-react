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
  const [noriskReportSubmitted, setNoriskReportSubmitted] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      setNoriskReportSubmitted(false);
      setIsProcessing(false);
    } else {
      setProfileName('');
      setMclogsUrl(null);
      setNoriskReportSubmitted(false);
      setIsProcessing(false);
    }
  }, [crashData]);

  if (!isCrashModalOpen || !crashData) {
    return null;
  }

  const handlePrimaryAction = async () => {
    if (!crashData?.profile_id || !crashData?.process_metadata) {
      toast.error("Cannot proceed: Missing critical crash data.");
      console.error("Action error: Missing profile_id or process_metadata", crashData);
      return;
    }

    setIsProcessing(true);
    let currentMclogsUrl = mclogsUrl;
    const mainToastId = toast.loading('Processing crash report...');

    try {
      if (!currentMclogsUrl) {
        toast.loading('Fetching latest log content...', { id: mainToastId });
        const logContent = await getProfileLatestLogContent(crashData.profile_id);
        
        let combinedLogContent = logContent;
        if (crashData.crash_report_content && crashData.crash_report_content.trim() !== "") {
          combinedLogContent = `--- CRASH REPORT ---\n${crashData.crash_report_content}\n\n--- LATEST LOG ---\n${logContent}`;
          toast.loading('Preparing combined log (crash report + latest.log)...', { id: mainToastId });
        }

        if (!combinedLogContent || combinedLogContent.trim() === "") {
          throw new Error("No log content found to upload.");
        }
        
        toast.loading('Uploading to mclogs.com...', { id: mainToastId });
        currentMclogsUrl = await uploadLogToMclogs(combinedLogContent);
        setMclogsUrl(currentMclogsUrl);
      }

      if (currentMclogsUrl && !noriskReportSubmitted) {
        toast.loading('Submitting crash report to NoRisk...', { id: mainToastId });
        const crashReportPayload: CrashlogDto = {
          mcLogsUrl: currentMclogsUrl,
          metadata: crashData.process_metadata!, 
        };
        
        await submitCrashLog(crashReportPayload);
        setNoriskReportSubmitted(true);
        
        try {
          await writeText(currentMclogsUrl);
          toast.success("Report submitted & Log URL copied!", { id: mainToastId });
        } catch (copyError) {
          console.error("Failed to copy mclogs URL after report:", copyError);
          toast.success(`Report submitted. Log URL: ${currentMclogsUrl} (Copying failed)`, { id: mainToastId });
        }
      } else if (currentMclogsUrl && noriskReportSubmitted) {
        // This case is for when logs are already uploaded and report submitted,
        // and the user clicks "Copy Log URL"
        toast.dismiss(mainToastId); // Dismiss the general processing toast
        await writeText(currentMclogsUrl);
        toast.success("mclogs.com URL copied to clipboard!");
      } else {
        // Should not happen given the button logic, but as a fallback:
        toast.dismiss(mainToastId);
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred.', { id: mainToastId });
      console.error("Crash report processing error:", error);
    } finally {
      setIsProcessing(false);
    }
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

  let primaryButtonText = 'Upload Logs & Report';
  if (mclogsUrl && noriskReportSubmitted) {
    primaryButtonText = 'Copy Log URL';
  }

  const modalFooter = (
    <div className="flex flex-wrap justify-end gap-3">
      <Button 
        onClick={handlePrimaryAction} 
        variant="secondary" 
        icon={<Icon icon={mclogsUrl && noriskReportSubmitted ? "solar:copy-line-duotone" : "solar:upload-linear"} className="w-5 h-5" />}
        disabled={isProcessing || !crashData?.process_metadata}
      >
        {primaryButtonText}
      </Button>
      <Button 
        onClick={handleContactSupport} 
        variant="default" 
        icon={<Icon icon="solar:letter-linear" className="w-5 h-5" />}
        disabled={isProcessing}
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
      onClose={() => !isProcessing && closeCrashModal()}
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