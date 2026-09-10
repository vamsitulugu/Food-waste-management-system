import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-base-950">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="font-display text-lg text-ink-100">Second Serving</span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="px-3 py-2 text-sm text-ink-300 hover:text-ink-100">
            Sign in
          </Link>
          <Link to="/signup">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl leading-tight text-ink-100 sm:text-5xl">
          Surplus food, put to use — not thrown away.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
          Second Serving connects restaurants, shops, and event organizers with recipients,
          NGOs, and volunteers, so good food reaches people instead of landfill.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup">
            <Button>Create an account</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-base-700 bg-base-900 p-6">
            <h2 className="font-display text-lg text-ink-100">Donate</h2>
            <p className="mt-2 text-sm text-ink-500">
              List surplus food with pickup details in a few minutes.
            </p>
          </div>
          <div className="rounded-lg border border-base-700 bg-base-900 p-6">
            <h2 className="font-display text-lg text-ink-100">Claim</h2>
            <p className="mt-2 text-sm text-ink-500">
              Recipients and NGOs browse and claim what's available nearby.
            </p>
          </div>
          <div className="rounded-lg border border-base-700 bg-base-900 p-6">
            <h2 className="font-display text-lg text-ink-100">Deliver</h2>
            <p className="mt-2 text-sm text-ink-500">
              Volunteers help bridge the gap when self-pickup isn't possible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
