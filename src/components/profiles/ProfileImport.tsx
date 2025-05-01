"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from ".././ui/Modal";
import { Button } from ".././ui/Button";
import { StatusMessage } from ".././ui/StatusMessage";

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
        icon={<Icon icon="pixel:file-import-solid" className="w-4 h-4" />}
      >
        {isImporting ? (
          <>
            <Icon icon="pixel:spinner-solid" className="w-4 h-4 animate-spin" />
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
            <h3 className="text-xl font-minecraft text-white mb-4 lowercase tracking-wide">
              import profile pack
            </h3>
            <p className="text-white/70 mb-6 font-minecraft text-sm tracking-wide">
              Import a .mrpack or .noriskpack file to create a new profile. This
              will open a file selection dialog.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md border-2 border-white/20 p-5">
            <h3 className="text-white font-minecraft text-base mb-3 lowercase">
              Supported formats:
            </h3>
            <ul className="text-white/80 text-sm space-y-2 font-minecraft">
              <li className="flex items-center">
                <Icon
                  icon="pixel:file-solid"
                  className="w-4 h-4 mr-2 text-blue-400"
                />
                <span>.mrpack (Modrinth)</span>
              </li>
              <li className="flex items-center">
                <Icon
                  icon="pixel:file-solid"
                  className="w-4 h-4 mr-2 text-green-400"
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
