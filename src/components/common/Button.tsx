import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500 text-base-950 hover:bg-brand-400',
  secondary: 'bg-base-800 text-ink-100 border border-base-700 hover:bg-base-700',
  danger: 'bg-danger-500 text-base-950 hover:bg-danger-400',
  ghost: 'text-ink-300 hover:text-ink-100 hover:bg-base-850',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
