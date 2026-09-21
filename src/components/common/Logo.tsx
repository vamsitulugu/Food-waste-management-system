import { HeartHandshake } from 'lucide-react';

/** Brand mark: orange gradient tile + wordmark (Swiggy/Zomato style). */
export function Logo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const tile = size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl';
  const icon = size === 'lg' ? 22 : size === 'sm' ? 15 : 19;
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-600 text-white shadow-md shadow-brand-500/30 ${tile}`}
      >
        <HeartHandshake size={icon} strokeWidth={2.25} />
      </span>
      <span className={`font-display ${text} ${light ? 'text-white' : 'text-brand-500'}`}>Second Serving</span>
    </span>
  );
}
