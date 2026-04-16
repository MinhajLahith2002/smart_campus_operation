import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Search,
  Shield,
  Ticket,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/ui/Primitives';
import { getBookingSummary, getBookings, getNotificationSummary, getResources, getResourceSummary } from '../lib/operationsApi';
import { getTicketSummary, getTickets } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

export const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTechnician = user?.role === 'TECHNICIAN';
  const hasBookingAccess = !isTechnician;
  const firstName = user?.name.split(' ')[0] ?? 'Operator';
  const [incidentSummary, setIncidentSummary] = useState(null);
  const [incidentTickets, setIncidentTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [resourceSummary, setResourceSummary] = useState(null);
  const [resources, setResources] = useState([]);
  const [notificationSummary, setNotificationSummary] = useState(null);

  useEffect(() => {
    let ignore = false;
    const loadDashboard = async () => {
      try {
        const [ticketSummaryData, ticketData, bookingData, bookingSummaryData, resourceData, resourceSummaryData, notificationSummaryData] = await Promise.all([
          getTicketSummary(),
          getTickets({ role: user?.role, userId: user?.id, assignedToMe: isTechnician }),
          hasBookingAccess ? getBookings({ role: isAdmin ? 'ADMIN' : user?.role, userId: isAdmin ? undefined : user?.id }) : Promise.resolve([]),
          hasBookingAccess ? getBookingSummary() : Promise.resolve(null),
          getResources(),
          getResourceSummary(),
          getNotificationSummary({ role: user?.role, userId: user?.id }),
        ]);
        if (ignore) return;
        setIncidentSummary(ticketSummaryData);
        setIncidentTickets(ticketData.slice(0, 3));
        setBookings(bookingData.slice(0, 3));
        setBookingSummary(bookingSummaryData);
        setResources(resourceData);
        setResourceSummary(resourceSummaryData);
        setNotificationSummary(notificationSummaryData);
      } catch (_) {
        if (ignore) return;
        setIncidentSummary(null);
        setIncidentTickets([]);
      }
    };
    if (user) loadDashboard();
    return () => { ignore = true; };
  }, [user, isTechnician, isAdmin, hasBookingAccess]);

  const bookingRoute = isAdmin ? '/admin/bookings' : '/bookings/my';
  const bookingTitle = isAdmin ? 'Booking desk' : 'Upcoming bookings';
  const approvedBookings = hasBookingAccess ? (bookingSummary?.approved ?? bookings.filter((booking) => booking.status === 'APPROVED').length) : 0;
  const activeResources = resourceSummary?.activeResources ?? resources.filter((resource) => resource.status === 'ACTIVE').length;
  const resourceCount = resourceSummary?.totalResources ?? resources.length;
  const openTickets = incidentSummary?.open ?? incidentTickets.filter((ticket) => ticket.status !== 'CLOSED').length;
  const unreadSignals = notificationSummary?.unread ?? 0;
  const roleTicketRoute = isAdmin ? '/admin/tickets' : isTechnician ? '/tickets/assigned' : '/tickets/my';
  const incidentQueue = incidentTickets;
  const heroTitle = isAdmin
    ? `Welcome back, ${firstName}. The incident desk has decisions waiting.`
    : isTechnician
      ? `Welcome back, ${firstName}. Your assigned maintenance queue is ready.`
      : `Welcome back, ${firstName}. Your campus requests and repair updates are in view.`;
  const heroCopy = isAdmin
    ? 'Module C gives admins the triage and assignment workspace the handover expects, including deeper queue visibility and workflow control.'
    : isTechnician
      ? 'Module C now exposes a technician-first route with assigned work, urgency ordering, and resolution flow rather than the admin desk.'
      : 'Module C now keeps issue reporting, ticket tracking, and closure confirmation in the reporter-facing flow instead of sharing the admin workspace.';

  return (
    <div className="space-y-8">
      <section className="surface-strong overflow-hidden p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="eyebrow mb-5">Daily command briefing</div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{heroTitle}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{heroCopy}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {hasBookingAccess ? <Link to={isAdmin ? bookingRoute : '/catalogue'}><Button className="gap-2"><Plus size={18} /> {isAdmin ? 'Open booking desk' : 'New booking'}</Button></Link> : <Link to="/catalogue"><Button className="gap-2"><Search size={18} /> View assets</Button></Link>}
              <Link to={isAdmin || isTechnician ? roleTicketRoute : '/tickets/new'}><Button variant="outline" className="gap-2"><Wrench size={18} /> {isAdmin ? 'Open incident desk' : isTechnician ? 'Open assigned queue' : 'Report issue'}</Button></Link>
              <Link to="/notifications"><Button variant="ghost" className="gap-2"><Bell size={18} /> Review signals</Button></Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white shadow-[0_22px_60px_rgba(2,8,23,0.35)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live status</p>
                <h3 className="mt-2 text-xl font-semibold">Operational summary</h3>
              </div>
              <Badge variant="success">Healthy</Badge>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <SignalPanel label="Active bookings" value={`${approvedBookings}`} accent="text-emerald-300" />
              <SignalPanel label={isTechnician ? 'Assigned incidents' : 'Open incidents'} value={`${isTechnician ? incidentQueue.length : openTickets}`} accent="text-amber-300" />
              <SignalPanel label="Assets online" value={`${activeResources}/${resourceCount || 0}`} accent="text-cyan-300" />
              <SignalPanel label="Signals unread" value={`${unreadSignals}`} accent="text-violet-300" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bookings approved" value={`${approvedBookings}`} trend="Live booking desk summary" icon={<Calendar className="text-primary" />} />
        <StatCard label={isTechnician ? 'Assigned tickets' : 'Open tickets'} value={`${isTechnician ? incidentQueue.length : openTickets}`} trend={isAdmin ? 'Admin triage queue monitored' : isTechnician ? 'Technician work queue focused' : 'Reporter-visible progress tracking'} icon={<Ticket className="text-warning" />} />
        <StatCard label="Signals unread" value={`${unreadSignals}`} trend="Notification queue from backend" icon={<Bell className="text-secondary-accent" />} />
        <StatCard label="Assets active" value={`${activeResources}`} trend="Live resource availability" icon={<CheckCircle2 className="text-success" />} />
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <section className="space-y-4">
          <SectionHeader title={bookingTitle} to={bookingRoute} />
          <div className="space-y-3">
            {bookings.map((booking) => {
              const resource = resources.find((item) => item.id === booking.resourceId);
              return (
                <Card key={booking.id} className="group bg-white/70 p-5 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-muted">
                        {resource?.imageUrl ? <img src={resource.imageUrl} alt={resource?.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : null}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">{booking.resourceName}</h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar size={12} />{format(new Date(booking.bookingDate), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><Clock size={12} />{booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} />{booking.resourceLocation}</span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{booking.purpose}</p>
                      </div>
                    </div>
                    <Badge variant={booking.status === 'APPROVED' ? 'success' : booking.status === 'PENDING' ? 'warning' : booking.status === 'REJECTED' ? 'danger' : 'neutral'}>{booking.status}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title={isAdmin ? 'Incident desk' : isTechnician ? 'Assigned work' : 'My incident queue'} to={roleTicketRoute} />
          <div className="space-y-3">
            {incidentQueue.map((ticket) => (
              <Card key={ticket.id} className="bg-white/70 p-5 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : 'warning'}>{ticket.priority} priority</Badge>
                      <Badge variant="info">{ticket.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-4 text-base font-semibold">{ticket.title || ticket.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin size={12} />{ticket.resourceLocation || 'Campus asset'}</span>
                      <span className="flex items-center gap-1"><Clock size={12} />Reported {format(new Date(ticket.createdAt), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-danger/10 p-3 text-danger"><TriangleAlert size={18} /></div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="premium-card overflow-hidden bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Quick actions</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <QuickAction icon={<Search size={18} />} label="Find lab" to="/catalogue" />
              <QuickAction icon={<Calendar size={18} />} label={hasBookingAccess ? (isAdmin ? 'Desk' : 'Book room') : 'Assets'} to={hasBookingAccess ? bookingRoute : '/catalogue'} />
              <QuickAction icon={<Ticket size={18} />} label={isAdmin ? 'Desk' : isTechnician ? 'My work' : 'Open ticket'} to={isAdmin || isTechnician ? roleTicketRoute : '/tickets/new'} />
              <QuickAction icon={<Bell size={18} />} label="Signals" to="/notifications" />
            </div>
          </div>

          <Card className="space-y-4 bg-white/70 p-5 dark:bg-white/5">
            <p className="text-sm font-semibold">System readiness</p>
            <StatusItem label="Network" status="Operational" type="success" />
            <StatusItem label="Facilities" status={`${activeResources}/${resourceCount || 0} active`} type="success" />
            <StatusItem label="Maintenance queue" status={`${incidentSummary?.total ?? incidentQueue.length} tracked`} type="warning" />
            <StatusItem label="Signals" status={`${unreadSignals} unread`} type={unreadSignals ? 'danger' : 'success'} />
          </Card>

          {isAdmin && (
            <Card className="bg-primary/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/15 p-3 text-primary"><Shield size={18} /></div>
                <div>
                  <p className="text-sm font-semibold">Admin oversight</p>
                  <p className="text-xs text-muted-foreground">High-priority tickets needing assignment</p>
                </div>
              </div>
              <p className="mt-5 text-4xl font-semibold">{incidentSummary?.unassigned ?? 0}</p>
              <p className="mt-2 text-sm text-muted-foreground">Use the incident desk to assign and progress urgent maintenance work.</p>
              <Link to="/admin/tickets" className="mt-5 block"><Button size="sm" className="w-full">Open incident desk</Button></Link>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend, icon }) => (
  <Card className="bg-white/70 p-5 dark:bg-white/5">
    <div className="flex items-start justify-between">
      <div className="rounded-2xl bg-muted/80 p-3">{React.cloneElement(icon, { size: 20 })}</div>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    </div>
    <p className="mt-6 text-4xl font-semibold tracking-tight">{value}</p>
    <p className="mt-2 text-sm text-muted-foreground">{trend}</p>
  </Card>
);

const SectionHeader = ({ title, to }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-xl font-semibold">{title}</h3>
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View all <ArrowUpRight size={14} /></Link>
  </div>
);

const SignalPanel = ({ label, value, accent }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className={cn('mt-3 text-3xl font-semibold', accent)}>{value}</p>
  </div>
);

const QuickAction = ({ icon, label, to }) => (
  <Link to={to} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-colors hover:bg-white/10">
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">{icon}</div>
    <p className="mt-3 text-sm font-semibold text-white">{label}</p>
  </Link>
);

const StatusItem = ({ label, status, type }) => (
  <div className="flex items-center justify-between rounded-2xl border border-border bg-white/35 px-4 py-3 dark:bg-white/5">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{status}</span>
      <div className={cn('h-2.5 w-2.5 rounded-full', type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-danger')} />
    </div>
  </div>
);



