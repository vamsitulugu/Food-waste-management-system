import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold ' +
  'transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-400',
  secondary: 'bg-base-900 text-brand-400 border border-brand-500/40 hover:bg-brand-700/10',
  danger: 'bg-danger-500 text-white shadow-md shadow-danger-500/20 hover:bg-danger-400',
  ghost: 'text-ink-300 hover:text-ink-100 hover:bg-base-800',
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
