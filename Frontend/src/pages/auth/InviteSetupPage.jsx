import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Wrench } from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner, PasswordInput } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import { acceptInvite, getInviteDetails } from '../../lib/authApi';
import { getPasswordChecklist, validatePasswordReset } from '../../lib/authValidation';

export const InviteSetupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const passwordChecklist = useMemo(() => getPasswordChecklist(form.password), [form.password]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadingError('This invite link is missing a token.');
      return;
    }

    getInviteDetails(token)
      .then((details) => setInvite(details))
      .catch((error) => setLoadingError(error.message || 'Unable to load invite details.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordReset(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      await acceptInvite({ token, ...form });
      navigate('/dashboard');
    } catch (error) {
      setLoadingError(error.message || 'Unable to complete technician setup.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />
          <div className="py-16 text-center text-sm text-muted-foreground">Loading invite...</div>
        </div>
      </div>
    );
  }

  if (loadingError && !invite) {
    return (
      <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />
          <div className="mx-auto max-w-xl py-8">
        <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-8 text-center">
          <h1 className="text-3xl font-semibold">Invite unavailable</h1>
          <p className="auth-copy mt-4 text-sm leading-7">{loadingError}</p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth">
              <Button className="auth-primary-button rounded-full px-8 text-white" size="lg">Back to Sign In</Button>
            </Link>
          </div>
        </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />
        <div className="mx-auto max-w-xl py-8">
      <Link to="/auth" className="auth-link mb-6 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[rgba(47,91,255,0.1)] p-3 text-[var(--auth-accent)] dark:bg-[rgba(125,167,255,0.14)]"><Wrench size={20} /></div>
          <div>
            <p className="auth-kicker text-xs font-bold uppercase tracking-[0.24em]">Technician invite</p>
            <h1 className="mt-1 text-2xl font-semibold">Complete your setup</h1>
          </div>
        </div>

        {loadingError && (
          <NoticeBanner className="mb-6" variant="error" onDismiss={() => setLoadingError('')}>
            {loadingError}
          </NoticeBanner>
        )}

        <div className="rounded-[22px] border border-[color:var(--auth-input-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,247,251,0.96))] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{invite.fullName}</p>
              <p className="auth-copy mt-1 text-sm">{invite.email}</p>
            </div>
            <Badge variant="info">{invite.status}</Badge>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm font-semibold">
            <span>Password</span>
            <PasswordInput className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Confirm Password</span>
            <PasswordInput className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
            {errors.confirmPassword && <p className="text-sm text-danger">{errors.confirmPassword}</p>}
          </label>

          <div className="rounded-[22px] border border-[color:var(--auth-input-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,247,251,0.96))] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
            <p className="text-sm font-semibold">Password checklist</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {passwordChecklist.map((item) => (
                <Badge key={item.label} variant={item.valid ? 'success' : 'neutral'}>
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
          <Button type="submit" className="auth-primary-button w-full rounded-full text-white" size="lg" isLoading={submitting} disabled={submitting}>Activate Technician Account</Button>

          <div className="rounded-[22px] border border-[color:var(--auth-input-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,247,251,0.96))] px-4 py-4 text-sm leading-7 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground"><ShieldCheck size={16} className="text-[var(--auth-accent)]" /> Access policy</div>
            Technician accounts stay invite-controlled and local-only. After setup, sign in again with the invited email address and password instead of Google.
          </div>
        </form>
      </Card>
        </div>
      </div>
    </div>
  );
};
