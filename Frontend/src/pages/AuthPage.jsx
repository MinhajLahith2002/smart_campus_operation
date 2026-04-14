import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Chrome,
  Moon,
  ShieldCheck,
  Sun,
  UserCog,
  Wrench,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRoleCredentials } from '../lib/authDefaults';
import { demoLogin, getDemoUsers } from '../lib/operationsApi';
import { cn } from '../lib/utils';

const roleOptions = [
  {
    role: 'USER',
    title: 'Student / Staff',
    badge: 'Everyday access',
    icon: Building2,
    description: 'Book facilities, submit maintenance requests, and monitor approval status.',
    access: ['Browse catalogue and resource availability', 'Create bookings and track status', 'Report issues and receive notifications'],
  },
  {
    role: 'ADMIN',
    title: 'Operations Admin',
    badge: 'Decision layer',
    icon: UserCog,
    description: 'Review requests, coordinate demand, and enforce access boundaries across workflows.',
    access: ['Approve or reject booking demand', 'Monitor operational queues and notifications', 'Oversee role-sensitive workflow status'],
  },
  {
    role: 'TECHNICIAN',
    title: 'Technician',
    badge: 'Response layer',
    icon: Wrench,
    description: 'Handle incidents, triage resource issues, and restore service for campus spaces.',
    access: ['View and progress assigned tickets', 'Inspect maintenance-critical assets', 'Coordinate resolution updates with operations'],
  },
];

export const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const { setAuthenticatedUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [selectedRole, setSelectedRole] = useState(
    roleOptions.some((item) => item.role === requestedRole) ? requestedRole : 'USER'
  );
  const [demoUsers, setDemoUsers] = useState([]);
  const [form, setForm] = useState({
    email: '',
    campusId: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDemoUsers()
      .then((users) => {
        if (active) setDemoUsers(users);
      })
      .catch(() => {
        if (active) setDemoUsers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRole = useMemo(
    () => roleOptions.find((item) => item.role === selectedRole) ?? roleOptions[0],
    [selectedRole]
  );

  const activeDemoUser = useMemo(
    () => demoUsers.find((item) => item.role === selectedRole),
    [demoUsers, selectedRole]
  );

  useEffect(() => {
    const fallback = getRoleCredentials(selectedRole);
    setForm({
      email: activeDemoUser?.email || fallback.email,
      campusId: activeDemoUser?.campusId || fallback.campusId,
      password: fallback.password,
    });
    setError('');
  }, [selectedRole, activeDemoUser]);

  const handleDemoFill = () => {
    const fallback = getRoleCredentials(selectedRole);
    setForm({
      email: activeDemoUser?.email || fallback.email,
      campusId: activeDemoUser?.campusId || fallback.campusId,
      password: fallback.password,
    });
  };

  const handleGoogleSignIn = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const account = await demoLogin({
        email: form.email.trim(),
        password: form.password,
      });

      if (account.role !== selectedRole) {
        throw new Error(`This account belongs to ${account.title}. Switch the selected role before signing in.`);
      }
      if (form.campusId.trim() && account.campusId !== form.campusId.trim()) {
        throw new Error('Campus ID does not match the selected demo account.');
      }

      setAuthenticatedUser(account);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in with the demo backend account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel mb-8 flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Module E</p>
            <h1 className="mt-2 text-2xl font-semibold">Authentication, Authorization, and Theme</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The handover separates roles, permission boundaries, and theme rules, so the sign-in experience now exposes all three clearly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeChip active={theme === 'light'} icon={Sun} label="Light" onClick={() => setTheme('light')} />
            <ThemeChip active={theme === 'dark'} icon={Moon} label="Dark" onClick={() => setTheme('dark')} />
            <ThemeChip active={theme === 'system'} icon={ShieldCheck} label="System" onClick={() => setTheme('system')} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div>
              <div className="eyebrow mb-4">Role boundaries</div>
              <h2 className="section-title">Choose the role you are authenticating into before entering the workspace.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                Based on the handover outline, access should be role-scoped rather than globally shared. The page therefore makes the selected role visible up front and previews what that role can do once signed in.
              </p>
            </div>

            <div className="grid gap-4">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const active = option.role === selectedRole;

                return (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => setSelectedRole(option.role)}
                    className={cn(
                      'premium-card text-left p-6 transition-all',
                      active
                        ? 'border-primary/30 bg-primary text-white shadow-[0_18px_36px_rgba(15,118,110,0.24)]'
                        : 'bg-white/65 hover:-translate-y-0.5 dark:bg-white/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                            active ? 'bg-white/12 text-white' : 'bg-primary/10 text-primary'
                          )}
                        >
                          <Icon size={22} />
                        </div>
                        <div>
                          <Badge variant={active ? 'neutral' : 'info'} className={active ? 'bg-white/12 text-white border-white/10' : ''}>
                            {option.badge}
                          </Badge>
                          <h3 className="mt-4 text-xl font-semibold">{option.title}</h3>
                          <p className={cn('mt-2 text-sm leading-7', active ? 'text-white/78' : 'text-muted-foreground')}>
                            {option.description}
                          </p>
                        </div>
                      </div>
                      {active && <CheckCircle2 size={20} className="shrink-0" />}
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
                  <div className="eyebrow mb-4">Secure sign-in</div>
                  <h2 className="text-2xl font-semibold">Campus access for {activeRole.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Continue with your campus Google account. The selected role controls what navigation, approvals, and queues appear after sign-in.
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Chrome size={20} />
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleGoogleSignIn}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Campus Email</label>
                  <Input
                    type="email"
                    placeholder="name@campus.edu"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Campus ID</label>
                  <Input
                    placeholder="IT2026XXX"
                    value={form.campusId}
                    onChange={(event) => setForm((current) => ({ ...current, campusId: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </div>

                <div className="rounded-2xl border border-border bg-white/50 px-4 py-4 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                      <GoogleMark />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Google campus identity</p>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">
                        This demo build now validates against the backend auth module. Use the role-matched demo account below to enter the right workspace with backend-backed identity data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/60 px-4 py-4 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold">Demo credentials</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleDemoFill}>Use defaults</Button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Email: <span className="font-semibold text-foreground">{activeDemoUser?.email || getRoleCredentials(selectedRole).email}</span></p>
                    <p>Campus ID: <span className="font-semibold text-foreground">{activeDemoUser?.campusId || getRoleCredentials(selectedRole).campusId}</span></p>
                    <p>Password: <span className="font-semibold text-foreground">{getRoleCredentials(selectedRole).password}</span></p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/60 px-4 py-4 dark:bg-white/5">
                  <p className="text-sm font-semibold">Permission preview</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {activeRole.access.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}

                <Button type="submit" className="w-full gap-2" size="lg" isLoading={isSubmitting}>
                  <GoogleMark />
                  Continue with Google as {activeRole.title}
                  {!isSubmitting && <ArrowRight size={18} />}
                </Button>
              </form>
            </Card>

            <Card className="bg-slate-950 p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Authorization note</p>
              <h3 className="mt-3 text-xl font-semibold">What this update reflects from the handover</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                <p>The PDF clearly calls out user roles, permission boundaries, and a dedicated authentication and authorization module.</p>
                <p>This page therefore separates sign-in from the marketing landing page and makes role choice explicit before entering protected routes.</p>
                <p>The same module also mentions theme behavior, so theme choice is exposed directly in the auth experience instead of being buried later.</p>
              </div>
            </Card>

            <p className="text-sm text-muted-foreground">
              Need the public overview first? <Link to="/" className="font-semibold text-primary">Return to the landing page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

const ThemeChip = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all',
      active
        ? 'border-primary bg-primary text-white'
        : 'border-border bg-white/50 text-foreground dark:bg-white/5'
    )}
  >
    <Icon size={15} />
    {label}
  </button>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#EA4335" d="M9 7.364v3.491h4.85C13.637 11.978 11.66 13.5 9 13.5A4.5 4.5 0 1 1 9 4.5c1.278 0 2.438.48 3.32 1.267l2.475-2.475A8.727 8.727 0 0 0 9 1.125a7.875 7.875 0 1 0 0 15.75c4.538 0 7.538-3.188 7.538-7.688 0-.516-.055-1.002-.153-1.823z"/>
    <path fill="#4285F4" d="M16.538 9.188c0-.516-.055-1.002-.153-1.823H9v3.491h4.85c-.213 1.123-.99 2.078-2.1 2.72l3.222 2.497c1.878-1.73 2.966-4.278 2.966-6.885z"/>
    <path fill="#FBBC05" d="M4.31 10.188A4.736 4.736 0 0 1 4.062 9c0-.413.09-.805.248-1.188L1.008 5.25A7.875 7.875 0 0 0 1.125 12.75z"/>
    <path fill="#34A853" d="M9 16.875c2.16 0 3.973-.71 5.297-1.927l-3.222-2.497c-.895.6-2.04.95-3.075.95A4.5 4.5 0 0 1 4.31 10.19l-3.302 2.56A7.875 7.875 0 0 0 9 16.875z"/>
  </svg>
);
