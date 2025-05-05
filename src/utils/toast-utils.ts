import { toast } from 'sonner';
import { CustomToast } from '../components/ui/CustomToast';
import React from 'react';

// Prop-Typen für CustomToast (sollte idealerweise aus der Komponente exportiert werden)
interface CustomToastProps {
  toastId: string | number;
  message: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'loading';
}

// Typdefinition für die Daten, die unsere Utility-Funktionen annehmen
interface ToastConfig {
  message: string;
  description?: string;
  type?: CustomToastProps['type'];
}

// Basis-Funktion (muss VOR den anderen show* Funktionen definiert sein)
const showToast = (
  config: ToastConfig,
  options?: { duration?: number; [key: string]: any },
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
      duration: options?.duration ?? 100000,
      ...options,
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

// Passe showLoadingToast an, um showToast mit Typ 'loading' zu verwenden
export const showLoadingToast = (
  message: string,
  description?: string,
  options?: { duration?: number; [key: string]: any },
) => {
  // Verwende showToast mit Typ 'loading'
  return showToast(
    { message, description, type: 'loading' }, // Verwende den 'loading'-Typ
    // Setze eine sehr lange Dauer statt 0 zum Testen
    { duration: 9999999, ...options } 
  );
};

// Neue Funktion für Promise-basierte Toasts
interface PromiseToastMessages {
  loading: string;
  success: string | ((data: any) => string);
  error: string | ((error: any) => string);
}

interface PromiseToastDescriptions {
  loading?: string;
  success?: string | ((data: any) => string);
  error?: string | ((error: any) => string);
}

export const showPromiseToast = <T = any>(
  promise: Promise<T>,
  messages: PromiseToastMessages,
  descriptions?: PromiseToastDescriptions,
  options?: { duration?: number; [key: string]: any }
) => {
  // Toast-ID vom Loading-Toast speichern
  const toastId = showLoadingToast(
    messages.loading, 
    descriptions?.loading,
    { ...options, duration: 9999999 } // Sehr lange Dauer, da wir nicht wissen, wie lange das Promise braucht
  );

  // Promise auflösen und entsprechend Erfolgs- oder Fehlertoast anzeigen
  promise
    .then((data) => {
      // Erfolgsfall: Loading-Toast durch Success-Toast ersetzen
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success;
      
      const successDescription = descriptions?.success 
        ? (typeof descriptions.success === 'function' 
            ? descriptions.success(data) 
            : descriptions.success)
        : undefined;

      showSuccessToast(
        successMessage,
        successDescription,
        { ...options, id: toastId } // ID vom Loading-Toast wiederverwenden
      );
      
      return data; // Daten durchreichen, damit sie in weiteren .then() verfügbar sind
    })
    .catch((error) => {
      // Fehlerfall: Loading-Toast durch Error-Toast ersetzen
      const errorMessage = typeof messages.error === 'function' 
        ? messages.error(error) 
        : messages.error;
      
      const errorDescription = descriptions?.error 
        ? (typeof descriptions.error === 'function' 
            ? descriptions.error(error) 
            : descriptions.error)
        : undefined;

      showErrorToast(
        errorMessage,
        errorDescription,
        { ...options, id: toastId } // ID vom Loading-Toast wiederverwenden
      );
      
      throw error; // Fehler weiterwerfen, damit er in weiteren .catch() verfügbar ist
    });

  return promise; // Das Original-Promise zurückgeben
};

// Exportiere dismissToast
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
}; 