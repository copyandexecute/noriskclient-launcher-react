"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from ".././ui/Modal.tsx";
import { Button } from ".././ui/Button";
import { StatusMessage } from ".././ui/StatusMessage.tsx";

interface ProfileImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function ProfileImport({
  onClose,
  onImportComplete,
}: ProfileImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);

      await invoke("import_profile_from_file");

      setSuccess("Profile successfully imported!");
      onImportComplete();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to import profile:", err);
      setError(
        `Failed to import profile: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsImporting(false);
    }
  };

  const renderFooter = () => (
    <div className="flex justify-end">
      <Button
        variant="primary"
        onClick={handleImport}
        disabled={isImporting}
        icon={<Icon icon="pixel:file-import-solid" className="w-5 h-5" />}
        className="text-2xl py-3 px-6"
      >
        {isImporting ? (
          <>
            <Icon icon="pixel:spinner-solid" className="w-5 h-5 animate-spin" />
            <span>importing...</span>
          </>
        ) : (
          "select file to import"
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      title="import profile"
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <div className="p-6">
        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-minecraft text-white mb-5 lowercase select-none">
              import profile pack
            </h3>
            <p className="text-xl text-white/70 mb-6 font-minecraft tracking-wide select-none">
              Import a .mrpack or .noriskpack file to create a new profile. This
              will open a file selection dialog.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md border-2 border-white/20 p-5">
            <h3 className="text-2xl text-white font-medium mb-3 select-none">
              Supported formats:
            </h3>
            <ul className="text-xl text-gray-300 space-y-2 select-none">
              <li className="flex items-center">
                <Icon
                  icon="pixel:file-solid"
                  className="w-5 h-5 mr-3 text-blue-400"
                />
                <span>.mrpack (Modrinth)</span>
              </li>
              <li className="flex items-center">
                <Icon
                  icon="pixel:file-solid"
                  className="w-5 h-5 mr-3 text-green-400"
                />
                <span>.noriskpack (NoRisk Launcher)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}
