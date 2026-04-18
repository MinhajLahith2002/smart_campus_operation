import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Chrome,
  ShieldCheck,
  UserCog,
  Wrench,
} from 'lucide-react';
import { Badge, Button, Card, Input } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { getAuthConfig, GOOGLE_LOGIN_URL } from '../../lib/authApi';
import { getRoleCredentials } from '../../lib/authDefaults';
import { validateLogin } from '../../lib/authValidation';
import { cn } from '../../lib/utils';

const accessModes = [
  {
    key: 'student',
    role: 'USER',
    title: 'Student',
    icon: Building2,
    badge: 'Student onboarding',
    copy: 'Students can create one account through local registration or Google onboarding. Each student account keeps a single sign-in method instead of linking both.',
  },
  {
    key: 'admin',
    role: 'ADMIN',
    title: 'Operations Admin',
    icon: UserCog,
    badge: 'Local only',
    copy: 'Admin access comes from backend bootstrap configuration and uses controlled local sign-in only.',
  },
  {
    key: 'technician',
    role: 'TECHNICIAN',
    title: 'Technician',
    icon: Wrench,
    badge: 'Invite only',
    copy: 'Technicians do not self-register. An admin invite creates the account, setup completes through the invite flow, and sign-in stays local after activation.',
  },
];

const getModeCredentials = (mode) => {
  const defaults = getRoleCredentials(mode.role);
  return {
    email: defaults.email || '',
    password: defaults.password || '',
  };
};

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticating } = useAuth();
  const [selectedRole, setSelectedRole] = useState(accessModes[0].key);
  const [form, setForm] = useState(getModeCredentials(accessModes[0]));
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(true);

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
    if (touched[field]) {
      setErrors(validateLogin(nextForm));
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateLogin(form));
  };

  const handleAccessModeSelect = (mode) => {
    setSelectedRole(mode.key);
    setForm(getModeCredentials(mode));
    setTouched({});
    setErrors({});
    setAuthError('');
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
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed showThemeSwitcher />

        <div className="glass-panel mb-8 flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Authentication Hub</p>
            <h1 className="mt-2 text-2xl font-semibold">Secure campus access with backend-owned roles</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Local sign-in uses email and password, Google onboarding is student-only, and the backend decides the account role and status for every session.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div>
              <div className="eyebrow mb-4">Access policy</div>
              <h2 className="section-title">Roles stay backend-controlled, but demo access can fill instantly.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                Click any role card to auto-fill that seeded demo account. The backend still decides the real role and permissions after sign-in.
              </p>
            </div>

            <div className="grid gap-4">
              {accessModes.map((mode) => {
                const Icon = mode.icon;
                const selected = selectedRole === mode.key;
                return (
                  <button
                    key={mode.title}
                    type="button"
                    onClick={() => handleAccessModeSelect(mode)}
                    className={cn(
                      'premium-card w-full bg-white/65 p-6 text-left transition-all duration-200 dark:bg-white/5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                      selected
                        ? 'border-primary bg-primary/8 shadow-[0_20px_40px_rgba(15,118,110,0.12)]'
                        : 'hover:border-primary/35 hover:bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-primary',
                        selected ? 'bg-primary text-white' : 'bg-primary/10'
                      )}>
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="info">{mode.badge}</Badge>
                          {selected && <Badge>Autofill ready</Badge>}
                        </div>
                        <h3 className="mt-4 text-xl font-semibold">{mode.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{mode.copy}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <Card className="bg-white/70 p-7 dark:bg-white/5">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow mb-4">Sign in</div>
                  <h2 className="text-2xl font-semibold">Email and password for local access</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Local sign-in is for local student accounts, invited technicians, and seeded admins. Google is reserved for student Google accounts and onboarding only.
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <ShieldCheck size={20} />
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Email</label>
                  <Input
                    type="email"
                    placeholder="name@campus.edu"
                    value={form.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    onBlur={() => handleBlur('email')}
                  />
                  {touched.email && errors.email && <p className="text-sm text-danger">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold">Password</label>
                    <Link to="/forgot-password" className="text-sm font-semibold text-primary">
                      Forgot Password?
                    </Link>
                  </div>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    onBlur={() => handleBlur('password')}
                  />
                  {touched.password && errors.password && <p className="text-sm text-danger">{errors.password}</p>}
                </div>

                {authError && (
                  <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">
                    {authError}
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" size="lg" isLoading={isAuthenticating}>
                  Sign In
                  {!isAuthenticating && <ArrowRight size={18} />}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                Student Google onboarding
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={() => window.location.assign(GOOGLE_LOGIN_URL)}
                disabled={!googleEnabled}
              >
                <GoogleMark />
                Continue with Google
                <Chrome size={16} />
              </Button>

              {googleEnabled && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Use Google only for student accounts created through Google onboarding. Admin and technician access stays local-only.
                </p>
              )}

              <div className="mt-6 rounded-2xl border border-border bg-muted/60 px-4 py-4 dark:bg-white/5">
                <p className="text-sm font-semibold">Need a local student account?</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Student self-registration is available with validation for email, student ID, faculty, batch, campus, phone, and password strength. Local and Google accounts stay separate by design.
                </p>
                <Link to="/register" className="mt-3 inline-flex text-sm font-semibold text-primary">
                  Create a student account
                </Link>
              </div>
            </Card>
          </section>
        </div>
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

