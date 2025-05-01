"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  children,
  required = false,
  error = null,
  className = "",
  description,
}: FormFieldProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label className="block text-2xl text-white font-minecraft mb-3 lowercase tracking-wide select-none">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {description && (
        <p className="text-xl text-white/70 mb-3 font-minecraft tracking-wide select-none">
          {description}
        </p>
      )}

      {children}

      {error && (
        <div className="mt-2 text-base text-red-400 font-minecraft tracking-wide select-none">
          {error}
        </div>
      )}
    </div>
  );
}
