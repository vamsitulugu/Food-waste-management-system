import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { signUp } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 7-15 digits, optional leading +, spaces/dashes/brackets allowed. */
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

export function SignupForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fullName.trim().length < 1) next.fullName = 'Enter your full name.';
    if (fullName.trim().length > 120) next.fullName = 'Full name is too long.';
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address.';
    const digits = phone.replace(/\D/g, '');
    if (!PHONE_RE.test(phone.trim()) || digits.length < 7 || digits.length > 15) {
      next.phone = 'Enter a valid phone number so pickups can reach you.';
    }
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await signUp({ fullName: fullName.trim(), email, password, phone: phone.trim() });
      if (!result.session) {
        // Email confirmation is required by this Supabase project's auth settings.
        setAwaitingConfirmation(true);
      } else {
        showToast('success', 'Account created.');
        navigate('/browse', { replace: true });
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Sign up failed. Please try again.');
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="rounded-xl border border-base-700 bg-base-900 p-6 text-center">
        <p className="text-ink-100">Check your email to confirm your account.</p>
        <p className="mt-2 text-sm text-ink-500">
          We sent a confirmation link to {email}. Once confirmed, just sign in and you're ready to go.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Input
        label="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        autoComplete="name"
        required
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="email"
        required
      />
      <Input
        label="Phone number"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        autoComplete="tel"
        placeholder="+91 98765 43210"
        required
      />
      <p className="-mt-3 text-xs text-ink-500">
        Kept private. Only shared with the other person once a donor accepts a request, so you can call each other at
        pickup.
      </p>
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="new-password"
        required
      />

      <Button type="submit" loading={submitting}>
        Create account
      </Button>
    </form>
  );
}
