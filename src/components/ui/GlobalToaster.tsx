import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export function GlobalToaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        className: 'font-minecraft tracking-wider uppercase text-shadow-sm',
        style: {
          borderWidth: '2px',
          borderBottomWidth: '4px',
          boxShadow: '0 6px 0 rgba(0,0,0,0.3), 0 8px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.1)',
          padding: '8px 16px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(var(--accent-rgb), 0.3)',
          borderColor: 'rgba(var(--accent-rgb), 0.8)',
          borderBottomColor: 'var(--accent)',
          color: '#f0f0f0',
          borderRadius: '0px',
          minWidth: '290px',
        },
        success: {
          style: {
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderBottomColor: '#059669',
            color: '#d1fae5',
            borderRadius: '0px',
          },
          iconTheme: {
            primary: '#059669',
            secondary: '#d1fae5',
          },
        },
        error: {
          style: {
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderBottomColor: '#dc2626',
            color: '#fee2e2',
            borderRadius: '0px',
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fee2e2',
          },
        },
      }}
    />
  );
} 