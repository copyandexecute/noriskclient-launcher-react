import { toast } from 'sonner';
import { CustomToast } from '../components/ui/CustomToast';
import React from 'react';

// Importiere den Typ direkt aus der Komponentendatei (falls exportiert)
// oder definiere ihn hier erneut, wenn nicht exportiert.
// Annahme: CustomToastProps wird nicht exportiert, daher Definition hier:
interface CustomToastProps {
  toastId: string | number;
  message: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

// Typdefinition für die Toast-Daten, die wir annehmen
interface ToastConfig {
  message: string;
  description?: string;
  type?: CustomToastProps['type']; // Korrekter Typ hier
}

// Basis-Funktion, die toast.custom aufruft
const showToast = (
  config: ToastConfig,
  options?: { duration?: number; [key: string]: any }, // Erlaube weitere Sonner-Optionen
) => {
  const { message, description, type = 'info' } = config;

  return toast.custom(
    (t) => React.createElement(CustomToast, {
      toastId: t,
      message: message,
      description: description,
      type: type,
    }),
    {
      duration: options?.duration ?? 5000, // Standarddauer 5s
      ...options, // Übergebe weitere Optionen an sonner
    },
  );
};

// Spezifische Wrapper-Funktionen
export const showSuccessToast = (
  message: string,
  description?: string,
  options?: { duration?: number; [key: string]: any },
) => {
  return showToast({ message, description, type: 'success' }, options);
};

export const showErrorToast = (
  message: string,
  description?: string,
  options?: { duration?: number; [key: string]: any },
) => {
  return showToast({ message, description, type: 'error' }, options);
};

export const showInfoToast = (
  message: string,
  description?: string,
  options?: { duration?: number; [key: string]: any },
) => {
  return showToast({ message, description, type: 'info' }, options);
};

export const showWarningToast = (
  message: string,
  description?: string,
  options?: { duration?: number; [key: string]: any },
) => {
  return showToast({ message, description, type: 'warning' }, options);
};

// Optional: Funktion zum Schließen von Toasts wieder exportieren
export const dismissToast = (toastId: string | number) => {
    toast.dismiss(toastId);
} 