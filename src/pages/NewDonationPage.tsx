import { useNavigate } from 'react-router-dom';
import { SimpleDonateForm } from '../components/donations/SimpleDonateForm';

export function NewDonationPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Donate food</h1>
      <p className="mt-1 text-sm text-ink-500">Add a photo and a few details. It goes live right away.</p>
      <div className="mt-6 rounded-3xl bg-base-900 p-5 shadow-card sm:p-6">
        <SimpleDonateForm onDone={(id) => navigate(`/donations/${id}`, { replace: true })} />
      </div>
    </div>
  );
}
