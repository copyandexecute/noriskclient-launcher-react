"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Portal } from "./Portal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value?: string) => void;
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

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  inputLabel,
  inputPlaceholder,
  inputInitialValue = "",
  inputRequired = false,
  type = "confirm",
  fullscreen = true,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState(inputInitialValue);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(inputInitialValue);
      setIsClosing(false);

      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, inputInitialValue]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    if (inputLabel && inputRequired && !inputValue.trim()) {
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      onConfirm(inputLabel ? inputValue : undefined);
      onClose();
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "warning":
        return "border-yellow-400/50";
      case "danger":
        return "border-red-400/50";
      default:
        return "border-white/30";
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "warning":
        return (
          <Icon
            icon="pixel:warning-solid"
            className="w-6 h-6 text-yellow-400"
          />
        );
      case "danger":
        return (
          <Icon icon="pixel:warning-solid" className="w-6 h-6 text-red-400" />
        );
      case "input":
        return (
          <Icon icon="pixel:edit-solid" className="w-6 h-6 text-white/70" />
        );
      default:
        return (
          <Icon icon="pixel:info-solid" className="w-6 h-6 text-white/70" />
        );
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className={cn(
          "bg-black/80 backdrop-blur-lg border-2 transition-all duration-200",
          getTypeStyles(),
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100",
          fullscreen ? "w-full max-w-2xl mx-auto" : "w-full max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <h3 className="text-2xl font-minecraft text-white lowercase">
              {title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <Icon icon="pixel:x-solid" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {message && (
            <p className="text-lg font-minecraft text-white/80 mb-4">
              {message}
            </p>
          )}

          {inputLabel && (
            <div className="mb-4">
              <label className="block text-lg font-minecraft text-white/80 mb-2 lowercase">
                {inputLabel}
                {inputRequired && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full bg-black/40 border-2 border-white/30 p-3 text-lg font-minecraft text-white focus:border-white/50 outline-none"
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleClose}
              className="backdrop-blur-sm border-2 border-white/30 bg-black/40 py-2 px-4 text-lg text-white/80 font-minecraft hover:bg-black/60 transition-colors uppercase"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                "backdrop-blur-sm border-2 py-2 px-4 text-lg font-minecraft transition-colors uppercase",
                type === "danger"
                  ? "border-red-400/50 bg-red-900/30 text-white hover:bg-red-900/40"
                  : "border-white/30 bg-black/40 text-white hover:bg-black/60",
                inputLabel &&
                  inputRequired &&
                  !inputValue.trim() &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return <Portal>{dialogContent}</Portal>;
}
