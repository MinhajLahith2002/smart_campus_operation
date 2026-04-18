import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getAuthConfig } from '../lib/authApi';
import { getBookingSummary, getResourceSummary, getResources } from '../lib/operationsApi';
import { getTicketSummary } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

const workflowCards = [
  {
    icon: BookOpen,
    title: 'Facility booking',
    description: 'Search the live catalogue, compare availability windows, and submit compliant requests without leaving the flow.',
  },
  {
    icon: Wrench,
    title: 'Incident ticketing',
    description: 'Capture operational issues fast, classify urgency, and surface the right queue for technicians and admins.',
  },
  {
    icon: BellRing,
    title: 'Role-based signaling',
    description: 'Keep students, staff, and operations teams aligned through real status changes, alerts, and approval events.',
  },
];

const accessModes = [
  { role: 'USER', title: 'Student / Staff', description: 'Book rooms, track approvals, and raise maintenance issues with context.', badge: 'Everyday access' },
  { role: 'ADMIN', title: 'Operations Admin', description: 'Coordinate approvals, service demand, and campus-level visibility from one desk.', badge: 'Decision layer' },
  { role: 'TECHNICIAN', title: 'Technician', description: 'Pick up issues, triage facilities, and keep critical learning spaces available.', badge: 'Response layer' },
];

const defaultLiveState = {
  authConfig: null,
  resourceSummary: null,
  bookingSummary: null,
  incidentSummary: null,
  resources: [],
  backendOnline: false,
  loadTime: null,
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [liveState, setLiveState] = useState(defaultLiveState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadLiveState = async () => {
      if (!ignore) {
        setIsLoading(true);
        setLoadError('');
      }

      const [authResult, resourceSummaryResult, bookingSummaryResult, incidentSummaryResult, resourcesResult] = await Promise.allSettled([
        getAuthConfig(),
        getResourceSummary(),
        getBookingSummary(),
        getTicketSummary(),
        getResources(),
      ]);

      if (ignore) return;

      const authConfig = authResult.status === 'fulfilled' ? authResult.value : null;
      const resourceSummary = resourceSummaryResult.status === 'fulfilled' ? resourceSummaryResult.value : null;
      const bookingSummary = bookingSummaryResult.status === 'fulfilled' ? bookingSummaryResult.value : null;
      const incidentSummary = incidentSummaryResult.status === 'fulfilled' ? incidentSummaryResult.value : null;
      const resources = resourcesResult.status === 'fulfilled' && Array.isArray(resourcesResult.value)
        ? resourcesResult.value
        : [];

      const hasAnyLiveData = Boolean(authConfig || resourceSummary || bookingSummary || incidentSummary || resources.length);
      const backendOnline = authResult.status === 'fulfilled' || hasAnyLiveData;

      setLiveState({
        authConfig,
        resourceSummary,
        bookingSummary,
        incidentSummary,
        resources,
        backendOnline,
        loadTime: new Date(),
      });

      if (!hasAnyLiveData && authResult.status === 'rejected') {
        setLoadError('Live backend data is not reachable right now. The landing page will keep the workspace ready and reconnect automatically.');
      }

      setIsLoading(false);
    };

    loadLiveState();
    const refreshTimer = window.setInterval(loadLiveState, 45000);
    return () => {
      ignore = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const handleAuthEntry = () => navigate('/auth');
  const handleWorkspace = () => navigate('/dashboard');
  const handleAccessAction = () => (isAuthenticated ? handleWorkspace() : handleAuthEntry());
  const openCatalogue = () => navigate('/catalogue');

  const heroMetrics = useMemo(() => {
    const activeResources = liveState.resourceSummary?.activeResources ?? liveState.resources.filter((resource) => resource.status === 'ACTIVE').length;
    const totalResources = liveState.resourceSummary?.totalResources ?? liveState.resources.length;
    const pendingBookings = liveState.bookingSummary?.pending ?? 0;
    const openIncidents = liveState.incidentSummary?.open ?? 0;

    return [
      {
        label: 'Active spaces',
        value: totalResources ? `${activeResources}/${totalResources}` : '--',
        hint: totalResources ? 'live asset availability from the backend' : 'waiting for catalogue data',
      },
      {
        label: 'Pending approvals',
        value: `${pendingBookings}`,
        hint: 'live booking demand waiting for review',
      },
      {
        label: 'Open maintenance jobs',
        value: `${openIncidents}`,
        hint: 'current module C incident workload',
      },
    ];
  }, [liveState]);

  const commandPanels = useMemo(() => {
    const activeResources = liveState.resourceSummary?.activeResources ?? liveState.resources.filter((resource) => resource.status === 'ACTIVE').length;
    const totalResources = liveState.resourceSummary?.totalResources ?? liveState.resources.length;
    const approvedBookings = liveState.bookingSummary?.approved ?? 0;
    const pendingBookings = liveState.bookingSummary?.pending ?? 0;
    const unassignedIncidents = liveState.incidentSummary?.unassigned ?? 0;
    const openIncidents = liveState.incidentSummary?.open ?? 0;

    return [
      { title: 'Approved bookings', value: `${approvedBookings}`, accent: 'bg-emerald-400' },
      { title: 'Pending approvals', value: `${pendingBookings}`, accent: 'bg-amber-400' },
      { title: 'Open incidents', value: `${openIncidents}`, accent: 'bg-rose-400' },
      { title: 'Unassigned jobs', value: `${unassignedIncidents}`, accent: 'bg-cyan-400' },
      { title: 'Assets active', value: totalResources ? `${activeResources}/${totalResources}` : '--', accent: 'bg-sky-400' },
      {
        title: 'Google onboarding',
        value: liveState.authConfig?.googleEnabled ? 'Enabled' : 'Local only',
        accent: liveState.authConfig?.googleEnabled ? 'bg-violet-400' : 'bg-slate-400',
      },
    ];
  }, [liveState]);

  const queueRows = useMemo(() => {
    const items = liveState.resources.slice(0, 3).map((resource) => ({
      title: resource.name,
      meta: `${resource.location} • ${resource.capacity ? `${resource.capacity} seats` : 'capacity ready'}`,
      status: resource.status === 'ACTIVE' ? 'Available' : resource.status,
    }));

    if (items.length) return items;

    return [
      { title: 'Catalogue sync pending', meta: 'Connect the backend to stream live room and asset data here.', status: 'Standby' },
      { title: 'Booking desk monitoring', meta: 'Pending approvals and slot pressure will appear as the backend responds.', status: 'Queued' },
      { title: 'Incident desk monitoring', meta: 'Module C tickets will surface here once live summaries are available.', status: 'Watching' },
    ];
  }, [liveState.resources]);

  const flowSteps = [
    {
      icon: CalendarClock,
      title: 'Discover and reserve',
      copy: 'The landing page now reflects the live catalogue and booking desk instead of frozen showcase numbers.',
    },
    {
      icon: LayoutDashboard,
      title: 'Review and route',
      copy: 'Admins can see real pending approvals and unassigned tickets the moment backend summaries are available.',
    },
    {
      icon: CheckCircle2,
      title: 'Resolve with confidence',
      copy: 'Technician work and student-facing ticket progress stay tied to the same shared operational state.',
    },
  ];

  const backendStatusLabel = liveState.backendOnline ? 'Live backend' : isLoading ? 'Connecting' : 'Offline';
  const lastSyncLabel = liveState.loadTime
    ? liveState.loadTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';
  const campusTimeLabel = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_680px] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="eyebrow mb-6">
                <Shield size={14} />
                Campus command interface
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                From static showcase to live campus operations pulse.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                The landing page now listens to the real backend and surfaces live booking pressure, resource availability, and module C incident load so the first screen already feels like part of the product.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Students can discover resources, admins can gauge current demand, and technicians inherit a workspace that starts with actual operational context instead of brochure copy.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant={liveState.backendOnline ? 'success' : 'warning'}>{backendStatusLabel}</Badge>
                <Badge variant="neutral">Campus time {campusTimeLabel}</Badge>
                <Badge variant="neutral">Last sync {lastSyncLabel}</Badge>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="gap-2" onClick={isAuthenticated ? handleWorkspace : handleAuthEntry}>
                  {isAuthenticated ? 'Open workspace' : 'Sign in to workspace'}
                  <ArrowRight size={18} />
                </Button>
                <Button variant="outline" className="gap-2" onClick={openCatalogue}>
                  <BookOpen size={18} />
                  Explore live catalogue
                </Button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <Card key={metric.label} className="metric-glow bg-white/65 p-5 dark:bg-white/5">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{metric.hint}</p>
                  </Card>
                ))}
              </div>

              {loadError ? (
                <Card className="mt-6 border border-warning/30 bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <WifiOff className="mt-0.5 text-warning" size={18} />
                    <div>
                      <p className="text-sm font-semibold">Live connection is warming up</p>
                      <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                    </div>
                  </div>
                </Card>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
              className="relative"
            >
              <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-secondary-accent/20 blur-3xl" />
              <div className="absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

              <div className="surface-strong relative overflow-hidden p-3 sm:p-4">
                <div className="rounded-[28px] border border-border bg-slate-950 p-4 text-white sm:p-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live command board</p>
                      <h2 className="mt-2 text-2xl font-semibold">Campus activity pulse</h2>
                    </div>
                    <div className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      liveState.backendOnline ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                    )}>
                      {liveState.backendOnline ? 'Realtime sync active' : 'Waiting for backend'}
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <MiniPulse label="Backend" value={backendStatusLabel} icon={liveState.backendOnline ? Wifi : WifiOff} />
                    <MiniPulse label="Campus clock" value={campusTimeLabel} icon={Activity} />
                    <MiniPulse label="Refresh cycle" value={isLoading ? 'Refreshing' : '45 sec'} icon={RefreshCw} spinning={isLoading} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {commandPanels.map((panel) => (
                      <Panel key={panel.title} title={panel.title} value={panel.value} accent={panel.accent} />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold">Live resource rail</p>
                        <Badge variant="neutral">{liveState.resources.length ? `${liveState.resources.length} assets loaded` : 'Public pulse'}</Badge>
                      </div>
                      <div className="space-y-3">
                        {queueRows.map((row) => (
                          <QueueRow key={`${row.title}-${row.status}`} title={row.title} meta={row.meta} status={row.status} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4">
                      <p className="text-sm font-semibold">Workflow map</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        {flowSteps.map((step) => (
                          <FlowStep key={step.title} icon={step.icon} title={step.title} copy={step.copy} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white/35 px-4 py-20 backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="eyebrow mb-4">Core modules</div>
              <h2 className="section-title max-w-2xl">The first page now reflects what the backend is doing, not just what the product claims.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              Catalogue, bookings, ticketing, notifications, and operational oversight are shown as one connected live surface with graceful fallbacks when protected data needs sign-in.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workflowCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <FeatureCard {...card} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-strong p-8">
            <div className="eyebrow mb-4">Access paths</div>
            <h2 className="section-title">Three role entry views, one shared operational backbone.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Students can onboard publicly through the controlled auth flow, while technician and admin access remain protected by invitation or bootstrap policy before they ever reach the workspace.
            </p>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              <LiveLine label="Student onboarding" value={liveState.authConfig?.googleEnabled ? 'Google + local available' : 'Local flow ready'} />
              <LiveLine label="Booking desk" value={`${liveState.bookingSummary?.pending ?? 0} waiting approvals`} />
              <LiveLine label="Module C queue" value={`${liveState.incidentSummary?.open ?? 0} open incidents`} />
            </div>
          </div>

          <div className="grid gap-4">
            {accessModes.map((mode) => (
              <button
                key={mode.role}
                onClick={handleAccessAction}
                className="premium-card flex items-start justify-between gap-4 p-6 text-left hover:-translate-y-0.5"
              >
                <div>
                  <Badge variant="info">{mode.badge}</Badge>
                  <h3 className="mt-4 text-xl font-semibold">{mode.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{mode.description}</p>
                </div>
                <div className="mt-1 rounded-2xl bg-primary/10 p-3 text-primary">
                  <ArrowRight size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <Card className="h-full bg-white/70 p-7 dark:bg-white/5">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon size={24} />
    </div>
    <h3 className="mt-6 text-xl font-semibold">{title}</h3>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
  </Card>
);

const Panel = ({ title, value, accent }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-300">{title}</p>
      <span className={cn('h-2.5 w-2.5 rounded-full', accent)} />
    </div>
    <p className="mt-4 text-3xl font-semibold">{value}</p>
  </div>
);

const QueueRow = ({ title, meta, status }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
    <p className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{status}</p>
  </div>
);

const FlowStep = ({ icon: Icon, title, copy }) => (
  <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-3">
    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
      <Icon size={18} />
    </div>
    <div>
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-6 text-slate-400">{copy}</p>
    </div>
  </div>
);

const MiniPulse = ({ label, value, icon: Icon, spinning = false }) => (
  <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
      <Icon size={14} className={spinning ? 'animate-spin' : ''} />
      {label}
    </div>
    <p className="mt-3 text-lg font-semibold text-white">{value}</p>
  </div>
);

const LiveLine = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/40 px-4 py-3 text-sm dark:bg-white/5">
    <span className="font-medium text-foreground">{label}</span>
    <span className="text-right text-muted-foreground">{value}</span>
  </div>
);

