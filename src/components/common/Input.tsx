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
      <label htmlFor={inputId} className="text-sm text-ink-300">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-md border bg-base-900 px-3 py-2.5 text-sm text-ink-100 outline-none
          placeholder:text-ink-700 focus:border-brand-400
          ${error ? 'border-danger-500' : 'border-base-700'} ${className}`}
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
