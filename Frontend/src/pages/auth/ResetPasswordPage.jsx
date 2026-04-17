import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner, PasswordInput } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import { resetPassword } from '../../lib/authApi';
import { getPasswordChecklist, validatePasswordReset } from '../../lib/authValidation';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passwordChecklist = useMemo(() => getPasswordChecklist(form.password), [form.password]);

  const applyFieldUpdate = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    if (Object.keys(touched).length) {
      setErrors(validatePasswordReset(nextForm));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordReset(form);
    setTouched({ password: true, confirmPassword: true });
    setErrors(nextErrors);
    setServerError('');
    if (!token) {
      setServerError('This password reset link is missing a token.');
      return;
    }
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      const response = await resetPassword({ token, ...form });
      setMessage(response.message);
      window.setTimeout(() => navigate('/auth'), 1200);
    } catch (error) {
      if (error.details?.fields) setErrors(error.details.fields);
      setServerError(error.message || 'Unable to reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

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
              <div className="rounded-2xl bg-[rgba(47,91,255,0.1)] p-3 text-[var(--auth-accent)] dark:bg-[rgba(125,167,255,0.14)]"><ShieldCheck size={20} /></div>
              <div>
                <p className="auth-kicker text-xs font-bold uppercase tracking-[0.24em]">Reset password</p>
                <h1 className="mt-1 text-2xl font-semibold">Choose a new password</h1>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              {message && (
                <NoticeBanner variant="success" onDismiss={() => setMessage('')}>
                  {message}
                </NoticeBanner>
              )}
              {serverError && (
                <NoticeBanner variant="error" onDismiss={() => setServerError('')}>
                  {serverError}
                </NoticeBanner>
              )}
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="space-y-2 text-sm font-semibold">
                <span>New Password</span>
                <PasswordInput
                  className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0"
                  value={form.password}
                  onChange={(event) => applyFieldUpdate('password', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                />
                {touched.password && errors.password && <p className="text-sm text-danger">{errors.password}</p>}
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span>Confirm Password</span>
                <PasswordInput
                  className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0"
                  value={form.confirmPassword}
                  onChange={(event) => applyFieldUpdate('confirmPassword', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                />
                {touched.confirmPassword && errors.confirmPassword && <p className="text-sm text-danger">{errors.confirmPassword}</p>}
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
              <Button
                type="submit"
                className="auth-primary-button w-full rounded-full text-white"
                size="lg"
                isLoading={submitting}
                disabled={submitting}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
