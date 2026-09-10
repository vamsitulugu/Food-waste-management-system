import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignupForm } from '../components/auth/SignupForm';

export function SignupPage() {
  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join the platform to donate, request, or help deliver surplus food."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
