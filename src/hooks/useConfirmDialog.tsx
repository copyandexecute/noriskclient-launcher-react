"use client";

import { useState } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputInitialValue?: string;
  inputRequired?: boolean;
  type?: "confirm" | "input" | "warning" | "danger";
  fullscreen?: boolean;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "Confirm",
    fullscreen: true,
  });
  const [resolveRef, setResolveRef] = useState<(value: any) => void>(() => {});

  const confirm = (options: ConfirmOptions): Promise<string | boolean> => {
    return new Promise((resolve) => {
      setOptions({ ...options, fullscreen: options.fullscreen ?? true });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    resolveRef(false);
  };

  const handleConfirm = (value?: string) => {
    setIsOpen(false);
    resolveRef(value !== undefined ? value : true);
  };

  const confirmDialog = (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...options}
    />
  );

  return {
    confirm,
    confirmDialog,
  };
}
