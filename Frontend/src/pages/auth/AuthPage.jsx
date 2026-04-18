import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Radar,
} from 'lucide-react';
import { Button, Input, NoticeBanner, PasswordInput } from '../../components/ui/Primitives';
import authCampusOperationsIllustration from '../../assets/auth-campus-operations-illustration.png';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { getAuthConfig, GOOGLE_LOGIN_URL } from '../../lib/authApi';
import { getPasswordChecklist, validateLogin } from '../../lib/authValidation';

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticating } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [dirty, setDirty] = useState({});
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const passwordChecklist = useMemo(() => getPasswordChecklist(form.password), [form.password]);
  const liveValidation = useMemo(() => validateLogin(form), [form]);
  const passwordScore = passwordChecklist.filter((item) => item.valid).length;
  const passwordIsStrong = passwordScore === passwordChecklist.length;
  const passwordStrengthLabel = passwordIsStrong ? 'Strong' : passwordScore >= 3 ? 'Medium' : 'Weak';
  const passwordStrengthClass = passwordIsStrong ? 'text-success' : passwordScore >= 3 ? 'text-warning' : 'text-danger';
  const passwordBarClass = passwordIsStrong ? 'bg-success' : passwordScore >= 3 ? 'bg-warning' : 'bg-danger';
  const shouldShowValidation = (field) => Boolean(dirty[field] || touched[field]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauthError');
    if (oauthError) {
      setAuthError(decodeURIComponent(oauthError));
    }
  }, [location.search]);

  useEffect(() => {
    let ignore = false;
    getAuthConfig()
      .then((config) => {
        if (!ignore) setGoogleEnabled(config.googleEnabled);
      })
      .catch(() => {
        if (!ignore) setGoogleEnabled(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setDirty((current) => ({ ...current, [field]: true }));
    if (dirty[field] || touched[field]) {
      setErrors(validateLogin(nextForm));
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateLogin(form));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLogin(form);
    setTouched({ email: true, password: true });
    setErrors(nextErrors);
    setAuthError('');
    if (Object.keys(nextErrors).length) return;

    try {
      await login({ email: form.email.trim().toLowerCase(), password: form.password });
      navigate('/dashboard');
    } catch (error) {
      setAuthError(error.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed showThemeSwitcher />

        <section className="surface-strong auth-shell overflow-hidden">
          <div className="grid min-h-[calc(100svh-12rem)] lg:min-h-[640px] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className="auth-divider order-2 flex items-center px-6 py-8 sm:px-10 lg:order-1 lg:items-start lg:border-r lg:px-14 lg:py-14">
              <div className="mx-auto w-full max-w-md">
                <p className="auth-kicker text-center text-xs font-bold uppercase tracking-[0.36em]">Shared login</p>
                <div className="mt-5 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Login</h1>
                  <p className="auth-copy mx-auto mt-4 max-w-sm text-sm leading-7">
                    Sign in with your verified email and password.
                  </p>
                </div>

                <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                  {authError && (
                    <NoticeBanner variant="error" onDismiss={() => setAuthError('')}>
                      {authError}
                    </NoticeBanner>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Email</label>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      onBlur={() => handleBlur('email')}
                      className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0"
                    />
                    {shouldShowValidation('email') && errors.email && <p className="text-sm text-danger">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold">Password</label>
                      <Link to="/forgot-password" className="auth-link text-sm font-semibold">
                        Forgot Password?
                      </Link>
                    </div>
                    <PasswordInput
                      placeholder="Password"
                      value={form.password}
                      onChange={(event) => handleChange('password', event.target.value)}
                      onBlur={() => handleBlur('password')}
                      className="auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0"
                    />

                    {form.password && (
                      <div className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,247,251,0.96))] px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                            Password strength
                          </p>
                          <span className={`text-sm font-semibold ${passwordStrengthClass}`}>
                            {passwordStrengthLabel}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {passwordChecklist.map((item, index) => (
                            <div
                              key={item.label}
                              className={`h-2.5 rounded-full transition-colors ${
                                index < passwordScore
                                  ? passwordBarClass
                                  : 'bg-slate-200 dark:bg-white/10'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {passwordChecklist.map((item) => (
                            <div key={item.label} className={`flex items-start gap-2 text-sm leading-5 ${item.valid ? 'text-success' : 'text-danger'}`}>
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                item.valid
                                  ? 'bg-success/12 text-success'
                                  : 'bg-danger/10 text-danger'
                              }`}>
                                {item.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              </span>
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {shouldShowValidation('password') && errors.password && <p className="text-sm text-danger">{errors.password}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="auth-primary-button mt-1 w-full rounded-full text-white"
                    size="lg"
                    isLoading={isAuthenticating}
                    disabled={isAuthenticating || Object.keys(liveValidation).length > 0}
                  >
                    Sign In
                    {!isAuthenticating && <ArrowRight size={18} />}
                  </Button>
                </form>

                <div className="auth-option-divider auth-copy my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]">
                  <div className="auth-option-divider-line h-px flex-1" />
                  Or
                  <div className="auth-option-divider-line h-px flex-1" />
                </div>

                <p className="auth-copy -mt-1 mb-5 text-center text-sm">
                  Students can sign in above or use Google login below.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="auth-google-button w-full gap-2 rounded-full disabled:opacity-80 disabled:text-muted-foreground"
                  onClick={() => window.location.assign(GOOGLE_LOGIN_URL)}
                  disabled={!googleEnabled}
                >
                  <GoogleMark />
                  Continue with Google
                </Button>

                {googleEnabled ? (
                  <p className="auth-copy mt-3 text-center text-sm">
                    Google sign-in is available for student accounts. Admin and technician access remains local only.
                  </p>
                ) : (
                  <p className="auth-copy mt-3 text-center text-sm text-warning">
                    Google sign-in is currently unavailable because backend Google OAuth credentials are not configured yet.
                  </p>
                )}

                <p className="auth-copy mt-5 text-center text-sm">
                  Don&apos;t have a student account?{' '}
                  <Link to="/register" className="auth-link font-semibold">
                    Create your account
                  </Link>
                </p>
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
                    Manage campus operations
                  </h2>
                  <p className="auth-copy mt-2 max-w-2xl text-base leading-7">
                    Review bookings, issue queues, and secure access in one place.
                  </p>
                </div>

                <div className="relative mt-4 flex-1">
                  <div className="auth-illustration-halo absolute inset-x-6 bottom-4 top-6 rounded-[40px] blur-3xl" />
                  <div className="relative overflow-hidden rounded-[38px] border border-transparent bg-transparent p-0 shadow-none">
                    <img
                      src={authCampusOperationsIllustration}
                      alt="Illustration of campus operations dashboards, support checklists, and live activity monitoring"
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
