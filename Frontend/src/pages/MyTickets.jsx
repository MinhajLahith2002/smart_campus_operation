import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, ChevronRight, Clock, MapPin, MessageSquareMore, Paperclip, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { cn } from '../lib/utils';
import { getTickets } from '../lib/moduleCApi';
import { useAuth } from '../context/AuthContext';

export const MyTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadTickets = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getTickets({ role: user?.role, userId: user?.id });
        if (!ignore) setTickets(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load your tickets.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (user) loadTickets();
    return () => { ignore = true; };
  }, [user]);

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => filter === 'ALL' || ticket.status === filter),
    [tickets, filter]
  );

  const metrics = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    closed: tickets.filter((ticket) => ticket.status === 'CLOSED').length,
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C user workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Track your incidents with visible progress, evidence context, and clear next-step decisions.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover treats the user view as more than a simple list. Your tickets now surface status, evidence references, latest activity, and the resolution flow you need to confirm or reopen issues.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
            <MetricCard label="Total" value={`${metrics.total}`} />
            <MetricCard label="Open" value={`${metrics.open}`} />
            <MetricCard label="In progress" value={`${metrics.inProgress}`} />
            <MetricCard label="Resolved" value={`${metrics.resolved}`} />
            <MetricCard label="Closed" value={`${metrics.closed}`} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                filter === status
                  ? 'border-primary bg-primary text-white shadow-md'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button className="gap-2" onClick={() => navigate('/tickets/new')}>
          <Wrench size={16} /> Report New Issue
        </Button>
      </div>

      {error && <Card className="border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</Card>}

      {loading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading ticket history...</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTickets.map((ticket) => {
            const latestActivity = ticket.activities?.[ticket.activities.length - 1];
            return (
              <Card key={ticket.id} className="overflow-hidden p-0 transition-all hover:border-primary/30">
                <div className="flex flex-col md:flex-row">
                  <div
                    className={cn(
                      'w-2 shrink-0 md:w-3',
                      ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL'
                        ? 'bg-danger'
                        : ticket.priority === 'MEDIUM'
                          ? 'bg-warning'
                          : 'bg-success'
                    )}
                  />
                  <div className="flex-1 space-y-5 p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">TK-{ticket.id}</span>
                          <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'OPEN' ? 'warning' : ticket.status === 'REJECTED' ? 'danger' : 'success'}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                            {ticket.priority} priority
                          </Badge>
                        </div>

                        <h3 className="text-xl font-semibold">{ticket.title}</h3>
                        <p className="text-sm leading-7 text-muted-foreground">{ticket.description}</p>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <p className="flex items-center gap-2"><MapPin size={14} /> {ticket.resourceName}</p>
                          <p className="flex items-center gap-2"><Clock size={14} /> {format(new Date(ticket.createdAt), 'MMM d, yyyy')}</p>
                          <p className="flex items-center gap-2"><AlertCircle size={14} /> {ticket.category}</p>
                          <p className="flex items-center gap-2"><Paperclip size={14} /> {ticket.evidenceLabels?.length || 0} evidence ref(s)</p>
                        </div>
                      </div>

                      <Button variant="ghost" className="gap-2 xl:self-center" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        View Details <ChevronRight size={18} />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoTile title="Latest activity" icon={<MessageSquareMore size={16} className="text-primary" />} copy={latestActivity ? latestActivity.detail : 'No follow-up activity yet.'} />
                      <InfoTile title="Assigned technician" icon={<Wrench size={16} className="text-primary" />} copy={ticket.assignedTechnicianName || 'Pending assignment'} />
                      <InfoTile title="Resolution note" icon={<AlertCircle size={16} className="text-primary" />} copy={ticket.resolutionNotes || 'No resolution note yet.'} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {!filteredTickets.length && (
            <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <TicketIcon size={24} />
              </div>
              <h3 className="font-bold">No tickets found</h3>
              <p className="text-muted-foreground">There are no incident records in this filter right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);

const InfoTile = ({ title, icon, copy }) => (
  <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">
      {icon}
      {title}
    </div>
    <p className="text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);
