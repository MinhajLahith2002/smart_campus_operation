import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock3, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui/Primitives';
import { getTickets, toBackendRole, updateTicketStatus } from '../lib/moduleCApi';
import { formatTicketStatusLabel, statusBadgeVariant } from '../lib/moduleCLabels';
import { useAuth } from '../context/AuthContext';

const getEffectiveTechnicianStatus = (ticket) => {
  if (ticket.assignedTechnicianId && ['OPEN', 'TRIAGED', 'ASSIGNED'].includes(ticket.status)) {
    return 'ASSIGNED';
  }
  return ticket.status;
};

export const TechnicianTicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTickets({ role: user?.role, userId: user?.id, assignedToMe: true });
      setTickets(
        data.filter((ticket) => ['ASSIGNED', 'IN_PROGRESS'].includes(getEffectiveTechnicianStatus(ticket)))
      );
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

  const runAction = async (name, callback) => {
    try {
      setBusyAction(name);
      setActionError('');
      await callback();
      await loadTickets();
    } catch (err) {
      setActionError(err.message || 'Unable to update this ticket.');
    } finally {
      setBusyAction('');
    }
  };

  const startWork = (ticket) => runAction(`start-${ticket.id}`, () => updateTicketStatus(ticket.id, {
    status: 'IN_PROGRESS',
    actorId: user.id,
    actorName: user.name,
    actorRole: toBackendRole(user.role),
    detail: 'Technician moved the ticket into active investigation.',
    resolutionNotes: ticket.resolutionNotes || '',
  }));

  const markResolved = (ticket) => {
    const resolutionNotes = window.prompt('Resolution notes', ticket.resolutionNotes || 'Issue resolved after inspection and corrective work.');
    if (!resolutionNotes) return;
    runAction(`resolve-${ticket.id}`, () => updateTicketStatus(ticket.id, {
      status: 'RESOLVED',
      actorId: user.id,
      actorName: user.name,
      actorRole: toBackendRole(user.role),
      detail: 'Technician completed the repair and marked the ticket resolved.',
      resolutionNotes,
    }));
  };

  const assignedCount = tickets.filter((ticket) => getEffectiveTechnicianStatus(ticket) === 'ASSIGNED').length;
  const inProgressCount = tickets.filter((ticket) => getEffectiveTechnicianStatus(ticket) === 'IN_PROGRESS').length;
  const highPriorityCount = tickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL').length;

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Incident hub technician queue</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Focus only on the work assigned to you and move each repair clearly from assigned to resolved.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This queue is now limited to live technician work only. Rejected, closed, and already resolved tickets do not stay here, so the technician sees only actionable tasks.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Assigned" value={`${assignedCount}`} />
            <MetricCard label="In progress" value={`${inProgressCount}`} />
            <MetricCard label="High priority" value={`${highPriorityCount}`} />
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
            {orderedTickets.map((ticket) => {
              const effectiveStatus = getEffectiveTechnicianStatus(ticket);
              return (
                <Card key={ticket.id} className="bg-white/70 p-6 dark:bg-white/5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
                      <Badge variant={statusBadgeVariant(effectiveStatus)}>{formatTicketStatusLabel(effectiveStatus)}</Badge>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{ticket.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{ticket.description}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-2"><MapPin size={14} /> {ticket.incidentLocation || ticket.resourceLocation}</p>
                      <p className="flex items-center gap-2"><Clock3 size={14} /> Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground dark:bg-white/5">
                        <p className="font-semibold text-foreground">Admin handoff</p>
                        <p className="mt-2">{ticket.assignedAt ? `${ticket.assignedByName || 'Operations Admin'} assigned this on ${formatDistanceToNow(new Date(ticket.assignedAt), { addSuffix: true })}.` : 'Assignment handoff was not recorded yet.'}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground dark:bg-white/5">
                        <p className="font-semibold text-foreground">Technician record</p>
                        <p className="mt-2">{ticket.resolvedAt ? `${ticket.resolvedByName || user.name} resolved this ticket.` : ticket.technicianStartedAt ? `${ticket.technicianStartedByName || user.name} already started work.` : 'No technician milestone has been recorded yet.'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground dark:bg-white/5">
                      {ticket.rejectionReason || ticket.resolutionNotes || 'No resolution notes yet. Start work and record the repair outcome here.'}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {effectiveStatus === 'ASSIGNED' && (
                        <Button className="gap-2" isLoading={busyAction === `start-${ticket.id}`} onClick={() => startWork(ticket)}><Wrench size={16} /> Start work</Button>
                      )}
                      {effectiveStatus === 'IN_PROGRESS' && (
                        <Button className="gap-2" isLoading={busyAction === `resolve-${ticket.id}`} onClick={() => markResolved(ticket)}><CheckCircle2 size={16} /> Mark resolved</Button>
                      )}
                      <Button variant="outline" className="gap-2" onClick={() => navigate(`/tickets/${ticket.id}`)}><ShieldCheck size={16} /> Open detail</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
