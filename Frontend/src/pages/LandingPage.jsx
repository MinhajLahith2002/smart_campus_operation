import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  Shield,
  Wrench,
} from 'lucide-react';
import { Card, Badge } from '../components/ui/Primitives';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const heroMetrics = [
  { label: 'Active spaces', value: '128', hint: 'lecture halls, labs, and shared rooms' },
  { label: 'Open maintenance jobs', value: '19', hint: 'ranked by severity and SLA risk' },
  { label: 'Approval turnaround', value: '2.4h', hint: 'median response for room requests' },
];

const workflowCards = [
  {
    icon: BookOpen,
    title: 'Facility booking',
    description: 'Search the catalogue, compare availability windows, and submit compliant requests without leaving the flow.',
  },
  {
    icon: Wrench,
    title: 'Incident ticketing',
    description: 'Capture operational issues fast, classify urgency, and surface the right queue for technicians and admins.',
  },
  {
    icon: BellRing,
    title: 'Role-based signaling',
    description: 'Keep students, staff, and operations teams aligned through status changes, alerts, and approval events.',
  },
];

const accessModes = [
  { role: 'USER', title: 'Student / Staff', description: 'Book rooms, track approvals, and raise maintenance issues with context.', badge: 'Everyday access' },
  { role: 'ADMIN', title: 'Operations Admin', description: 'Coordinate approvals, service demand, and campus-level visibility from one desk.', badge: 'Decision layer' },
  { role: 'TECHNICIAN', title: 'Technician', description: 'Pick up issues, triage facilities, and keep critical learning spaces available.', badge: 'Response layer' },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleAuthEntry = () => navigate('/auth');
  const handleWorkspace = () => navigate('/dashboard');
  const handleAccessAction = () => (isAuthenticated ? handleWorkspace() : handleAuthEntry());

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />

          <div id="overview" className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="eyebrow mb-6">
                <Shield size={14} />
                Campus command interface
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Run bookings, incidents, and campus service flow from a single operational surface.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                This frontend is now oriented around the handover idea: a smart campus control layer where people discover spaces, submit requests, respond to issues, and monitor system health without jumping between disconnected tools.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                Authentication is now policy-driven: students use local registration or Google onboarding, technicians are invite-only, and admins stay backend-controlled.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="neutral">Students: local registration or Google onboarding</Badge>
                <Badge variant="neutral">Technicians: admin invite only</Badge>
                <Badge variant="neutral">Admins: backend bootstrap only</Badge>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <Card key={metric.label} className="metric-glow bg-white/65 p-5 dark:bg-white/5">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{metric.hint}</p>
                  </Card>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
              className="relative"
            >
              <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-secondary-accent/20 blur-3xl" />
              <div className="absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

              <div className="surface-strong relative overflow-hidden p-4">
                <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live command board</p>
                      <h2 className="mt-2 text-2xl font-semibold">Campus activity pulse</h2>
                    </div>
                    <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Stable network</div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Panel title="Approvals waiting" value="12" accent="bg-warning" />
                    <Panel title="Critical incidents" value="03" accent="bg-danger" />
                    <Panel title="Spaces available now" value="46" accent="bg-success" />
                    <Panel title="Signals unread" value="08" accent="bg-secondary-accent" />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold">Today&apos;s operational queue</p>
                        <Badge variant="neutral">Realtime</Badge>
                      </div>
                      <div className="space-y-3">
                        <QueueRow title="Lecture Hall A1" meta="09:00 - AI guest lecture" status="Approved" />
                        <QueueRow title="Robotics Lab" meta="Projector reported flickering" status="Escalated" />
                        <QueueRow title="Library Pod 02" meta="14:00 - group study block" status="Pending" />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4">
                      <p className="text-sm font-semibold">Workflow map</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <FlowStep icon={CalendarClock} title="Search and request" copy="Check the catalogue and submit a policy-aware booking." />
                        <FlowStep icon={LayoutDashboard} title="Review and route" copy="Admins validate demand and protect against double-booking." />
                        <FlowStep icon={CheckCircle2} title="Notify and resolve" copy="Users and teams receive status signals through the same system." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="modules" className="scroll-mt-28 border-y border-border bg-white/35 px-4 py-20 backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="eyebrow mb-4">Core modules</div>
              <h2 className="section-title max-w-2xl">The interface now follows the handover modules instead of feeling like disconnected screens.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              Catalogue, bookings, ticketing, notifications, and operational oversight are treated as one coordinated experience with stronger state visibility.
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

      <section id="access-paths" className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-strong p-8">
            <div className="eyebrow mb-4">Access paths</div>
            <h2 className="section-title">Three role entry views, one shared operational backbone.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Students can onboard publicly through the controlled auth flow, while technician and admin access remain protected by invitation or bootstrap policy before they ever reach the workspace.
            </p>
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

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}) => (
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
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-300">{title}</p>
      <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
    </div>
    <p className="mt-4 text-4xl font-semibold">{value}</p>
  </div>
);

const QueueRow = ({ title, meta, status }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{status}</p>
  </div>
);

const FlowStep = ({
  icon: Icon,
  title,
  copy,
}) => (
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
