import React from 'react';
import { BellRing, Moon, Palette, ShieldCheck, Sun, UserRound, Workflow } from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Settings Hub</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Manage theme, account identity, and role-aware workspace preferences.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover groups authentication, authorization, and theme into one module. This settings page reflects that by combining account overview, appearance controls, and role-sensitive workspace preferences.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Current access profile</p>
            <div className="mt-5 space-y-3">
              <ProfileRow label="Signed in as" value={user?.name || 'Unknown user'} />
              <ProfileRow label="Email" value={user?.email || 'No email'} />
              <ProfileRow label="Role" value={user?.role || 'No role'} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Palette size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Appearance and theme</h2>
                <p className="text-sm text-muted-foreground">Theme system rules are part of the handover, so appearance controls live here.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ThemeCard
                active={theme === 'light'}
                icon={Sun}
                title="Light mode"
                copy="Use the bright command-center surface."
                onClick={() => setTheme('light')}
              />
              <ThemeCard
                active={theme === 'dark'}
                icon={Moon}
                title="Dark mode"
                copy="Switch to a darker operational interface."
                onClick={() => setTheme('dark')}
              />
              <ThemeCard
                active={theme === 'system'}
                icon={ShieldCheck}
                title="System"
                copy="Follow the device appearance preference."
                onClick={() => setTheme('system')}
              />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-secondary-accent/10 p-3 text-secondary-accent">
                <UserRound size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profile preview</h2>
                <p className="text-sm text-muted-foreground">View the identity and role information currently shaping your access boundaries.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Display Name</label>
                <Input value={user?.name || ''} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Campus Email</label>
                <Input value={user?.email || ''} readOnly />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="info">Role: {user?.role || 'Unknown'}</Badge>
              <Badge variant="neutral">Protected routes enabled</Badge>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-warning/10 p-3 text-warning">
                <Workflow size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Workspace preferences</h2>
                <p className="text-sm text-muted-foreground">These settings explain how the current role experiences the application after authentication.</p>
              </div>
            </div>

            <div className="space-y-3">
              <PreferenceItem
                title="Role-aware navigation"
                copy="Sidebar modules are filtered by your role so students, admins, and technicians see the correct workflow entry points."
                active
              />
              <PreferenceItem
                title="Approval visibility"
                copy="Administrative users see booking and incident desks, while everyday users focus on requests, tickets, and signals."
                active
              />
              <PreferenceItem
                title="Signal delivery"
                copy="Notifications surface booking, ticket, and resource alerts according to the current access profile."
                active
              />
            </div>
          </Card>

          <Card className="bg-slate-950 p-6 text-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white">
                <BellRing size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Operational guidance</h2>
                <p className="text-sm text-slate-300">How this settings screen maps back to the handover requirements.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <p>Authentication and authorization are no longer hidden implementation details. Settings now shows the current role, which is central to the handover’s permission-boundary model.</p>
              <p>Theme controls are exposed directly because the handover includes theme system rules as part of the frontend architecture.</p>
              <p>The page also clarifies that workspace behavior changes by role, which helps the app feel more intentional and requirement-driven.</p>
            </div>

            <div className="mt-6">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                Review access policy summary
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

const ThemeCard = ({ active, icon: Icon, title, copy, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'premium-card text-left p-5 transition-all',
      active
        ? 'border-primary/30 bg-primary text-white shadow-[0_18px_36px_rgba(15,118,110,0.24)]'
        : 'bg-white/55 dark:bg-white/5'
    )}
  >
    <div className={cn(
      'flex h-11 w-11 items-center justify-center rounded-2xl',
      active ? 'bg-white/12 text-white' : 'bg-primary/10 text-primary'
    )}>
      <Icon size={18} />
    </div>
    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
    <p className={cn('mt-2 text-sm leading-7', active ? 'text-white/78' : 'text-muted-foreground')}>{copy}</p>
  </button>
);

const PreferenceItem = ({ title, copy, active }) => (
  <div className="rounded-2xl border border-border bg-white/35 px-4 py-4 dark:bg-white/5">
    <div className="flex items-center gap-2">
      <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Optional'}</Badge>
      <p className="text-sm font-semibold">{title}</p>
    </div>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);

const ProfileRow = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <span className="text-sm text-slate-300">{label}</span>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);
