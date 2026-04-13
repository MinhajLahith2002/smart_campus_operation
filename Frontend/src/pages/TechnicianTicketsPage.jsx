import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock3, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui/Primitives';
import { getTickets, toBackendRole, updateTicketStatus } from '../lib/moduleCApi';
import { useAuth } from '../context/AuthContext';

export const TechnicianTicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTickets({ role: user?.role, userId: user?.id, assignedToMe: true });
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Unable to load assigned work.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTickets();
  }, [user]);

  const orderedTickets = useMemo(() => [...tickets].sort((a, b) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99);
  }), [tickets]);

  const startWork = async (ticket) => {
    try {
      setActionError('');
      await updateTicketStatus(ticket.id, {
        status: 'IN_PROGRESS',
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        detail: 'Technician moved the ticket into active investigation.',
        resolutionNotes: ticket.resolutionNotes || '',
      });
      await loadTickets();
    } catch (err) {
      setActionError(err.message || 'Unable to start work on this ticket.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C technician queue</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Focus on assigned work, urgent incidents, and clear next actions without admin clutter.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The frontend handover explicitly asks for a dedicated technician work queue. This page prioritizes urgency, latest update age, and quick transition into active work.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Assigned" value={`${tickets.length}`} />
            <MetricCard label="In progress" value={`${tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length}`} />
            <MetricCard label="High priority" value={`${tickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL').length}`} />
          </div>
        </div>
      </section>

      {error && <Card className="border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</Card>}
      {actionError && <Card className="border-warning/30 bg-warning/5 p-5 text-sm text-warning">{actionError}</Card>}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Assigned work</h2>
          <Badge variant="info">Technician-only queue</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading assigned tickets...</Card>
        ) : orderedTickets.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {orderedTickets.map((ticket) => (
              <Card key={ticket.id} className="bg-white/70 p-6 dark:bg-white/5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
                    <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'RESOLVED' ? 'success' : 'warning'}>{ticket.status.replace('_', ' ')}</Badge>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{ticket.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{ticket.description}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p className="flex items-center gap-2"><MapPin size={14} /> {ticket.resourceName} - {ticket.resourceLocation}</p>
                    <p className="flex items-center gap-2"><Clock3 size={14} /> Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground dark:bg-white/5">
                    {ticket.resolutionNotes || 'No resolution notes yet. Start work to capture diagnostic progress.'}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && (
                      <Button className="gap-2" onClick={() => startWork(ticket)}><Wrench size={16} /> Start work</Button>
                    )}
                    <Button variant="outline" className="gap-2" onClick={() => navigate(`/tickets/${ticket.id}`)}><ShieldCheck size={16} /> Open detail</Button>
                    <Button variant="ghost" className="gap-2" onClick={() => navigate(`/tickets/${ticket.id}`)}>Resolution flow <ArrowRight size={16} /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-sm text-muted-foreground">No tickets are currently assigned to this technician.</Card>
        )}
      </section>
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);
