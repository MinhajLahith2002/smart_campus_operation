import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Button, Card, Input } from '../../components/ui/Primitives';
import { requestPasswordReset } from '../../lib/authApi';
import { validateForgotPassword } from '../../lib/authValidation';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailErrors = validateForgotPassword({ email });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError('');
    setMessage('');
    if (emailErrors.email) return;

    try {
      setSubmitting(true);
      const response = await requestPasswordReset({ email: email.trim().toLowerCase() });
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.message || 'Unable to start the reset flow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />

        <div className="mx-auto max-w-xl py-8">
          <Link to="/auth" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft size={16} /> Back to sign in
          </Link>

          <Card className="bg-white/70 p-8 dark:bg-white/5">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><MailCheck size={20} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Password reset</p>
                <h1 className="mt-1 text-2xl font-semibold">Request a reset link</h1>
              </div>
            </div>

            <p className="text-sm leading-7 text-muted-foreground">
              Enter your account email and we will send a reset link if that account exists and uses local password sign-in.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="space-y-2 text-sm font-semibold">
                <span>Email</span>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched(true)} />
                {touched && emailErrors.email && <p className="text-sm text-danger">{emailErrors.email}</p>}
              </label>

              {message && <div className="rounded-2xl border border-success/30 bg-success/5 px-4 py-4 text-sm text-success">{message}</div>}
              {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}

              <Button type="submit" isLoading={submitting} disabled={!!emailErrors.email || submitting}>Send Reset Link</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
