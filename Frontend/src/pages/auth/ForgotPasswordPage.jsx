import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Radar } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Button, Input, NoticeBanner } from '../../components/ui/Primitives';
import authForgotPasswordIllustration from '../../assets/auth-forgot-password-illustration.png';
import { getAuthConfig, GOOGLE_LOGIN_URL, requestPasswordReset } from '../../lib/authApi';
import { validateForgotPassword } from '../../lib/authValidation';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(30);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const emailErrors = validateForgotPassword({ email });

  useEffect(() => {
    let ignore = false;
    getAuthConfig()
      .then((config) => {
        if (!ignore) {
          setGoogleEnabled(config.googleEnabled);
          setCooldownSeconds(config.forgotPasswordCooldownSeconds || 30);
        }
      })
      .catch(() => {
        if (!ignore) {
          setGoogleEnabled(true);
          setCooldownSeconds(30);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;

    const timerId = window.setTimeout(() => {
      setCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [cooldownRemaining]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError('');
    setMessage('');
    if (emailErrors.email || cooldownRemaining > 0) return;

    try {
      setSubmitting(true);
      const response = await requestPasswordReset({ email: email.trim().toLowerCase() });
      setMessage(response.message);
      setCooldownRemaining(cooldownSeconds);
    } catch (requestError) {
      const retryAfterSeconds = Number(requestError.details?.retryAfterSeconds || 0);
      if (retryAfterSeconds > 0) {
        setCooldownRemaining(retryAfterSeconds);
      }
      setError(requestError.message || 'Unable to start the reset flow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />

        <section className="surface-strong auth-shell overflow-hidden">
          <div className="grid min-h-[calc(100svh-12rem)] lg:min-h-[640px] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className="auth-divider order-2 flex items-center px-6 py-8 sm:px-10 lg:order-1 lg:items-start lg:border-r lg:px-14 lg:py-14">
              <div className="mx-auto w-full max-w-md">
                <Link to="/auth" className="auth-link inline-flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeft size={16} />
                  Back to sign in
                </Link>

                <p className="auth-kicker mt-6 text-center text-xs font-bold uppercase tracking-[0.36em]">
                  Password reset
                </p>
                <div className="mt-5 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgba(15,118,110,0.12)] text-[var(--auth-highlight)] dark:bg-[rgba(41,179,154,0.12)]">
                    <MailCheck size={24} />
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Request a reset link</h1>
                  <p className="auth-copy mx-auto mt-4 max-w-md text-sm leading-7">
                    Enter your account email and we will send a reset link if that account exists and uses local password sign-in.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {message && (
                    <NoticeBanner variant="success" autoHideMs={0} onDismiss={() => setMessage('')}>
                      {message}
                    </NoticeBanner>
                  )}
                  {error && (
                    <NoticeBanner variant="error" onDismiss={() => setError('')}>
                      {error}
                    </NoticeBanner>
                  )}
                </div>

                {message && (
                  <div className="mt-4 rounded-[22px] border border-border/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,247,251,0.96))] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
                    <p className="auth-copy text-sm leading-6">
                      Check your inbox and spam folder. If you usually sign in with Google, continue with Google instead.
                    </p>
                    {cooldownRemaining > 0 && (
                      <p className="mt-3 text-sm font-medium text-muted-foreground">
                        You can request another reset link in {formatCooldown(cooldownRemaining)}.
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Link
                        to="/auth"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--auth-input-border)] bg-[var(--auth-chip-bg)] px-4 text-sm font-semibold text-foreground transition hover:bg-white/80 dark:hover:bg-white/10"
                      >
                        Back to login
                      </Link>
                      {googleEnabled && (
                        <button
                          type="button"
                          onClick={() => window.location.assign(GOOGLE_LOGIN_URL)}
                          className="auth-primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition"
                        >
                          <GoogleMark />
                          Continue with Google
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  <label className="space-y-1.5 text-sm font-semibold">
                    <span>Email</span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="Email address"
                      className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0"
                    />
                    {touched && emailErrors.email && <p className="pt-0.5 text-sm text-danger">{emailErrors.email}</p>}
                  </label>

                  <Button
                    type="submit"
                    className="auth-primary-button mt-3 w-full rounded-full text-white"
                    size="lg"
                    isLoading={submitting}
                    disabled={!!emailErrors.email || submitting || cooldownRemaining > 0}
                  >
                    {cooldownRemaining > 0 ? `Try again in ${formatCooldown(cooldownRemaining)}` : 'Send Reset Link'}
                  </Button>

                  {cooldownRemaining > 0 && (
                    <p className="auth-copy -mt-1 text-center text-sm">
                      To protect accounts, another reset request can be sent after {formatCooldown(cooldownRemaining)}.
                    </p>
                  )}

                  <p className="auth-copy pt-1 text-center text-sm">
                    Remembered your password?{' '}
                    <Link to="/auth" className="auth-link font-semibold">
                      Login
                    </Link>
                  </p>
                </form>
              </div>
            </div>

            <div className="auth-aside auth-divider relative order-1 flex items-center border-b px-6 py-8 sm:px-10 lg:order-2 lg:items-start lg:border-b-0 lg:px-12 lg:py-14">
              <div className="relative mx-auto flex w-full max-w-none flex-col">
                <div className="inline-flex w-fit items-center gap-3">
                  <div className="auth-brand-icon flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Radar size={20} />
                  </div>
                  <div className="min-w-0 sm:min-w-max">
                    <p className="auth-brand-title text-xs font-bold uppercase tracking-[0.24em]">CampusHub</p>
                    <p className="auth-brand-copy text-sm font-semibold sm:whitespace-nowrap">Bookings, assets, and maintenance</p>
                  </div>
                </div>

                <div className="mt-2 max-w-[44rem]">
                  <h2 className="text-[clamp(2rem,2.5vw,3.1rem)] font-semibold tracking-tight leading-[1.04] text-balance">
                    Recover account access
                  </h2>
                  <p className="auth-copy mt-2 max-w-2xl text-base leading-7">
                    Reset your local password securely and get back to bookings, issue queues, and campus access in one place.
                  </p>
                </div>

                <div className="relative mt-4 flex-1">
                  <div className="auth-illustration-halo absolute inset-x-6 bottom-4 top-6 rounded-[40px] blur-3xl" />
                  <div className="relative overflow-hidden rounded-[38px] border border-transparent bg-transparent p-0 shadow-none">
                    <img
                      src={authForgotPasswordIllustration}
                      alt="Illustration of password recovery, access issues, and account reset support"
                      className="relative mx-auto w-full max-w-[620px] object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#EA4335" d="M9 7.364v3.491h4.85C13.637 11.978 11.66 13.5 9 13.5A4.5 4.5 0 1 1 9 4.5c1.278 0 2.438.48 3.32 1.267l2.475-2.475A8.727 8.727 0 0 0 9 1.125a7.875 7.875 0 1 0 0 15.75c4.538 0 7.538-3.188 7.538-7.688 0-.516-.055-1.002-.153-1.823z" />
    <path fill="#4285F4" d="M16.538 9.188c0-.516-.055-1.002-.153-1.823H9v3.491h4.85c-.213 1.123-.99 2.078-2.1 2.72l3.222 2.497c1.878-1.73 2.966-4.278 2.966-6.885z" />
    <path fill="#FBBC05" d="M4.31 10.188A4.736 4.736 0 0 1 4.062 9c0-.413.09-.805.248-1.188L1.008 5.25A7.875 7.875 0 0 0 1.125 12.75z" />
    <path fill="#34A853" d="M9 16.875c2.16 0 3.973-.71 5.297-1.927l-3.222-2.497c-.895.6-2.04.95-3.075.95A4.5 4.5 0 0 1 4.31 10.19l-3.302 2.56A7.875 7.875 0 0 0 9 16.875z" />
  </svg>
);

const formatCooldown = (seconds) => `${seconds}s`;
