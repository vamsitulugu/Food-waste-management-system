import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-300">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-xl border bg-base-900 px-3.5 py-3 text-sm text-ink-100 outline-none transition-shadow
          placeholder:text-ink-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
          ${error ? 'border-danger-500' : 'border-base-600'} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
}
