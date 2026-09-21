import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SimpleDonateForm } from './SimpleDonateForm';

export function DonateModal({
  open,
  onClose,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted: (donationId: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Donate food">
      <button aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-base-900 shadow-card-hover sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-700 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl text-ink-100">Donate food</h2>
            <p className="text-sm text-ink-500">Takes less than a minute ⚡</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-base-800"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-5 sm:px-6">
          <SimpleDonateForm onDone={onPosted} onCancel={onClose} stickyFooter />
        </div>
      </div>
    </div>
  );
}
