import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useCrashModalStore } from '../../store/crash-modal-store';
import { Button } from '../ui/buttons/Button';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';
import { Profile } from '../../types/profile';
import { getProfile, getProfileLatestLogContent } from '../../services/profile-service';
import { uploadLogToMclogs } from '../../services/log-service';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export function GlobalCrashReportModal() {
  const { isCrashModalOpen, crashData, closeCrashModal } = useCrashModalStore();
  const [profileName, setProfileName] = useState<string>('');
  const [mclogsUrl, setMclogsUrl] = useState<string | null>(null); // Still needed for upload logic

  useEffect(() => {
    if (crashData?.profile_id) {
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
      setMclogsUrl(null);
    } else {
      setProfileName('');
      setMclogsUrl(null);
    }
  }, [crashData]);

  if (!isCrashModalOpen || !crashData) {
    return null;
  }

  const handleUploadLogs = async () => {
    if (!crashData?.profile_id) return;
    if (mclogsUrl) {
      try {
        await writeText(mclogsUrl);
        toast.success("mclogs.com URL copied to clipboard!");
      } catch (error) {
        toast.error("Error copying URL to clipboard.");
        console.error("Failed to copy mclogs URL to clipboard:", error);
      }
      return;
    }

    const uploadPromise = getProfileLatestLogContent(crashData.profile_id)
      .then(logContent => {
        if (!logContent || logContent.trim() === "") {
          throw new Error("No log content found to upload.");
        }
        return uploadLogToMclogs(logContent);
      })
      .then(async (url) => {
        setMclogsUrl(url); // Store the URL, but won't display it in modal body
        try {
          await writeText(url);
          return "Log uploaded successfully & URL copied!";
        } catch (copyError) {
          console.error("Failed to copy mclogs URL to clipboard after upload:", copyError);
          return `Log uploaded: ${url} (Copying failed)`;
        }
      });

    toast.promise(uploadPromise, {
      loading: 'Fetching log and uploading to mclogs.com...',
      success: (message) => message,
      error: (err) => err.message || 'Error uploading log.',
    });
  };

  const handleContactSupport = () => {
    toast("Contact support function not yet implemented.", { icon: '헬멧' });
  };

  const modalFooter = (
    <div className="flex flex-wrap justify-end gap-3">
      <Button onClick={handleUploadLogs} variant="secondary" icon={<Icon icon="solar:upload-linear" className="w-5 h-5" />}>
        Upload Logs
      </Button>
      <Button onClick={handleContactSupport} variant="default" icon={<Icon icon="solar:letter-linear" className="w-5 h-5" />}>
        Contact Support
      </Button>
    </div>
  );

  const titleSubtitleNode = (
    <p className="text-xs font-minecraft-ten text-gray-400"> 
      Profile: {profileName || 'Loading...'}
    </p>
  );

  return (
    <Modal
      title="Minecraft Crash Report"
      titleIcon={<Icon icon="solar:danger-bold" className="w-7 h-7 text-red-400" />}
      titleSubtitle={titleSubtitleNode}
      onClose={closeCrashModal}
      width="md" // Changed width to md as content is less
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