import { EventEmitter } from './event-emitter';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  showPromiseToast,
} from './toast-utils';

// Für die Promise-Toast-Funktionalität
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

// Event-Typen
export type ToastEventType = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'dismiss' | 'promise';

// Payload für Toast-Events
export interface ToastEventPayload {
  message: string;
  description?: string;
  options?: { duration?: number; id?: string | number; [key: string]: any };
  toastId?: string | number; // Für dismiss
  promise?: Promise<any>; // Für promise-toast
  messages?: PromiseToastMessages; // Für promise-toast
  descriptions?: PromiseToastDescriptions; // Für promise-toast
}

// Erstelle einen einzelnen EventEmitter für Toast-Events
export const toastEmitter = new EventEmitter();

// Toast-Events auslösen (wird von UI-Komponenten aufgerufen)
export const emitToastEvent = (type: ToastEventType, payload: ToastEventPayload) => {
  toastEmitter.emit(`toast:${type}`, payload);
};

// Convenience-Funktionen
export const emitSuccessToast = (message: string, description?: string, options?: { duration?: number; [key: string]: any }): string | number => {
  const result = showSuccessToast(message, description, options);
  emitToastEvent('success', { message, description, options });
  return result;
};

export const emitErrorToast = (message: string, description?: string, options?: { duration?: number; [key: string]: any }): string | number => {
  const result = showErrorToast(message, description, options);
  emitToastEvent('error', { message, description, options });
  return result;
};

export const emitInfoToast = (message: string, description?: string, options?: { duration?: number; [key: string]: any }): string | number => {
  const result = showInfoToast(message, description, options);
  emitToastEvent('info', { message, description, options });
  return result;
};

export const emitWarningToast = (message: string, description?: string, options?: { duration?: number; [key: string]: any }): string | number => {
  const result = showWarningToast(message, description, options);
  emitToastEvent('warning', { message, description, options });
  return result;
};

export const emitLoadingToast = (message: string, description?: string, options?: { duration?: number; [key: string]: any }): string | number => {
  const result = showLoadingToast(message, description, options);
  emitToastEvent('loading', { message, description, options });
  return result;
};

export const emitDismissToast = (toastId: string | number) => {
  emitToastEvent('dismiss', { message: '', toastId });
};

// Promise-Toast-Funktion
export const emitPromiseToast = <T = any>(
  promise: Promise<T>,
  messages: PromiseToastMessages,
  descriptions?: PromiseToastDescriptions,
  options?: { duration?: number; [key: string]: any }
): Promise<T> => {
  // Direkt die showPromiseToast-Funktion aufrufen, um die gleiche Funktionalität zu haben
  const result = showPromiseToast(promise, messages, descriptions, options);
  
  // Event emittieren (für Logging oder andere Anwendungsfälle)
  emitToastEvent('promise', { 
    message: messages.loading, 
    description: descriptions?.loading,
    options,
    promise,
    messages,
    descriptions
  });
  
  return result;
};

// Toast-Listener einrichten (wird an zentraler Stelle aufgerufen)
export const setupToastListeners = () => {
  // Erfolgs-Toast-Handler
  toastEmitter.on('toast:success', ({ message, description, options }: ToastEventPayload) => {
    showSuccessToast(message, description, options);
  });

  // Fehler-Toast-Handler
  toastEmitter.on('toast:error', ({ message, description, options }: ToastEventPayload) => {
    showErrorToast(message, description, options);
  });

  // Info-Toast-Handler
  toastEmitter.on('toast:info', ({ message, description, options }: ToastEventPayload) => {
    showInfoToast(message, description, options);
  });

  // Warn-Toast-Handler
  toastEmitter.on('toast:warning', ({ message, description, options }: ToastEventPayload) => {
    showWarningToast(message, description, options);
  });

  // Loading-Toast-Handler
  toastEmitter.on('toast:loading', ({ message, description, options }: ToastEventPayload) => {
    showLoadingToast(message, description, options);
  });

  // Dismiss-Toast-Handler
  toastEmitter.on('toast:dismiss', ({ toastId }: ToastEventPayload) => {
    if (toastId) {
      dismissToast(toastId);
    }
  });

  // Promise-Toast-Handler (optional, da wir bereits direkt showPromiseToast aufrufen)
  toastEmitter.on('toast:promise', ({ promise, messages, descriptions, options }: ToastEventPayload) => {
    if (promise && messages) {
      showPromiseToast(
        promise, 
        messages as PromiseToastMessages,
        descriptions as PromiseToastDescriptions,
        options
      );
    }
  });

  // Funktion zum Aufräumen zurückgeben
  return () => {
    toastEmitter.removeAllListeners('toast:success');
    toastEmitter.removeAllListeners('toast:error');
    toastEmitter.removeAllListeners('toast:info');
    toastEmitter.removeAllListeners('toast:warning');
    toastEmitter.removeAllListeners('toast:loading');
    toastEmitter.removeAllListeners('toast:dismiss');
    toastEmitter.removeAllListeners('toast:promise');
  };
}; 