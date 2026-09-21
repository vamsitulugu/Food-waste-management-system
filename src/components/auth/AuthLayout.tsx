import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-950">
      <div className="h-52 bg-gradient-to-br from-brand-700 to-brand-600 sm:h-60" />
      <div className="-mt-40 flex justify-center px-4 pb-12 sm:-mt-44">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex justify-center" aria-label="Second Serving home">
            <Logo size="lg" light />
          </Link>
          <div className="rounded-3xl bg-base-900 p-8 shadow-card-hover">
            <h1 className="font-display text-2xl text-ink-100">{title}</h1>
            <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
