"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string | null;
  children: ReactNode;
}

export function FormField({
  label,
  required = false,
  description,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-white font-minecraft mb-2 lowercase text-base">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {description && (
        <p className="text-white/70 mb-4 text-sm font-minecraft">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="mt-1 text-red-400 font-minecraft text-sm">{error}</p>
      )}
    </div>
  );
}
