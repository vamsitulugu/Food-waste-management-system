import { Link } from 'react-router-dom';
import { ArrowRight, HandHeart, Search, Truck, Building2, Leaf, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';

const CATEGORIES = [
  { emoji: '🍛', label: 'Cooked meals' },
  { emoji: '🥐', label: 'Bakery' },
  { emoji: '🥬', label: 'Produce' },
  { emoji: '🥛', label: 'Dairy' },
  { emoji: '📦', label: 'Packaged' },
  { emoji: '🥤', label: 'Beverages' },
  { emoji: '🌾', label: 'Grains' },
];

const STEPS = [
  {
    icon: HandHeart,
    title: 'Donate',
    text: 'List surplus food with pickup details in a few minutes.',
    to: '/signup',
    cta: 'Start donating',
  },
  {
    icon: Search,
    title: 'Claim',
    text: "Recipients and NGOs browse and claim what's available nearby.",
    to: '/signup',
    cta: 'Find food',
  },
  {
    icon: Truck,
    title: 'Deliver',
    text: "Volunteers help bridge the gap when self-pickup isn't possible.",
    to: '/signup',
    cta: 'Become a volunteer',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-base-900">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-500 to-brand-600 text-white">
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -right-20 -top-16 h-80 w-80 rounded-full bg-white/10" />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Logo light />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-400 shadow-md hover:bg-base-800"
            >
              Get started
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:pt-20">
          <h1 className="font-display max-w-3xl text-4xl leading-[1.1] sm:text-6xl">
            Hungry? Surplus food, delivered to those who need it.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            Second Serving connects restaurants, shops, and event organizers with recipients, NGOs, and
            volunteers, so good food reaches people instead of landfill.
          </p>

          {/* Swiggy-style search-bar CTA */}
          <Link
            to="/signup"
            className="mt-9 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 pl-5 text-ink-500 shadow-card-hover transition-transform hover:-translate-y-0.5"
          >
            <Search size={20} className="shrink-0 text-brand-500" />
            <span className="flex-1 text-left text-sm sm:text-base">Search for meals, bakery, produce near you…</span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white">
              Find food <ArrowRight size={16} />
            </span>
          </Link>
        </section>
      </div>

      {/* Categories */}
      <section className="mx-auto -mt-10 max-w-6xl px-4">
        <div className="scrollbar-none flex gap-5 overflow-x-auto rounded-3xl bg-base-900 p-5 shadow-card-hover sm:justify-between">
          {CATEGORIES.map((c) => (
            <div key={c.label} className="flex w-20 shrink-0 flex-col items-center gap-2">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-700/10 text-3xl">
                {c.emoji}
              </span>
              <span className="text-xs font-semibold text-ink-300">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl text-ink-100">How it works</h2>
        <p className="mt-1 text-ink-500">Three simple roles, one goal: zero waste.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text, to, cta }) => (
            <div key={title} className="flex flex-col rounded-2xl bg-base-900 p-6 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 text-white">
                <Icon size={22} />
              </div>
              <h3 className="font-display mt-4 text-xl text-ink-100">{title}</h3>
              <p className="mt-2 flex-1 text-sm text-ink-500">{text}</p>
              <Link to={to} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-400 hover:text-brand-300">
                {cta} <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-base-950 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: 'Live availability', text: 'Listings update in real time, so what you see is what is there.' },
            { icon: ShieldCheck, title: 'Verified organizations', text: 'NGOs and food banks are reviewed before they can claim.' },
            { icon: Building2, title: 'Track every step', text: 'From claimed to delivered, follow each donation on a clear timeline.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-500/10 text-success-400">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-display text-base text-ink-100">{title}</p>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA + footer */}
      <section className="bg-ink-100 px-4 py-16 text-center text-white">
        <Leaf className="mx-auto text-success-500" size={28} />
        <h2 className="font-display mx-auto mt-3 max-w-xl text-3xl">Ready to rescue some food today?</h2>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/signup">
            <Button>Create an account</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
        <p className="mt-12 text-xs text-white/50">© Second Serving — reducing food waste, one meal at a time.</p>
      </section>
    </div>
  );
}
