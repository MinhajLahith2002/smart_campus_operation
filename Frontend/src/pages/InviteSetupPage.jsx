import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Wrench } from 'lucide-react';
import { Badge, Button, Card, Input } from '../components/ui/Primitives';
import { acceptInvite, getInviteDetails } from '../lib/authApi';
import { getPasswordChecklist, validatePasswordReset } from '../lib/authValidation';

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
    return <div className="px-4 py-16 text-center text-sm text-muted-foreground">Loading invite...</div>;
  }

  if (loadingError && !invite) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card className="bg-white/70 p-8 text-center dark:bg-white/5">
          <h1 className="text-3xl font-semibold">Invite unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{loadingError}</p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth"><Button>Back to Sign In</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <Link to="/auth" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <Card className="bg-white/70 p-8 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Wrench size={20} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Technician invite</p>
            <h1 className="mt-1 text-2xl font-semibold">Complete your setup</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{invite.fullName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{invite.email}</p>
            </div>
            <Badge variant="info">{invite.status}</Badge>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm font-semibold">
            <span>Password</span>
            <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Confirm Password</span>
            <Input type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
            {errors.confirmPassword && <p className="text-sm text-danger">{errors.confirmPassword}</p>}
          </label>

          <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
            <p className="text-sm font-semibold">Password checklist</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {passwordChecklist.map((item) => (
                <Badge key={item.label} variant={item.valid ? 'success' : 'neutral'}>
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>

          {loadingError && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{loadingError}</div>}

          <Button type="submit" isLoading={submitting} disabled={submitting}>Activate Technician Account</Button>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm leading-7 text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground"><ShieldCheck size={16} className="text-primary" /> Access policy</div>
            Technician accounts stay invite-controlled and local-only. After setup, sign in again with the invited email address and password instead of Google.
          </div>
        </form>
      </Card>
    </div>
  );
};
