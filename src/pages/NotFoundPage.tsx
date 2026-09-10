import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-base-950 px-4 text-center">
      <h1 className="font-display text-3xl text-ink-100">Page not found</h1>
      <p className="text-sm text-ink-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-2 text-brand-400 hover:text-brand-300">
        Back home
      </Link>
    </div>
  );
}
