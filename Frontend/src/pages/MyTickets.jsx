import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, ChevronRight, Clock, MapPin, MessageSquareMore, Paperclip, Ticket as TicketIcon, Trash2, Wrench } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { cn } from '../lib/utils';
import { deleteTicket, getTickets, toBackendRole } from '../lib/moduleCApi';
import { formatTicketStatusLabel, statusBadgeVariant } from '../lib/moduleCLabels';
import { useAuth } from '../context/AuthContext';

export const MyTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [adminRedirecting, setAdminRedirecting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [archiveFilter, setArchiveFilter] = useState('ALL');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingTicketId, setDeletingTicketId] = useState(null);

  const loadTickets = async (ignore = false) => {
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

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setAdminRedirecting(true);
      const timeoutId = window.setTimeout(() => {
        navigate('/admin/tickets', { replace: true });
      }, 1200);
      return () => window.clearTimeout(timeoutId);
    }
    let ignore = false;
    if (user) loadTickets();
    return () => { ignore = true; };
  }, [user, navigate]);

  if (adminRedirecting) {
    return (
      <Card className="p-6 text-sm">
        <p className="font-semibold text-foreground">Opening admin incident desk...</p>
        <p className="mt-2 text-muted-foreground">
          Admin assignment and rejection controls are available in the dedicated admin ticket workspace.
        </p>
        <div className="mt-4">
          <Button className="gap-2" onClick={() => navigate('/admin/tickets', { replace: true })}>
            <Wrench size={16} /> Open Admin Incident Desk
          </Button>
        </div>
      </Card>
    );
  }

  useEffect(() => {
    const onRefreshTickets = () => {
      if (user) loadTickets();
    };

    window.addEventListener('tickets:refresh', onRefreshTickets);
    return () => window.removeEventListener('tickets:refresh', onRefreshTickets);
  }, [user]);

  const handleDeleteTicket = async (ticket) => {
    const confirmed = window.confirm('Delete this ticket permanently? This removes the whole ticket record and cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingTicketId(ticket.id);
      setActionError('');
      await deleteTicket(ticket.id, {
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        note: 'Reporter permanently deleted the full ticket record from the ticket list.',
      });
      await loadTickets();
    } catch (err) {
      setActionError(err.message || 'Unable to delete this ticket.');
    } finally {
      setDeletingTicketId(null);
    }
  };

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => !['CLOSED', 'REJECTED'].includes(ticket.status)),
    [tickets]
  );

  const archiveTickets = useMemo(
    () => tickets.filter((ticket) => ['CLOSED', 'REJECTED'].includes(ticket.status)),
    [tickets]
  );

  const filteredActiveTickets = useMemo(
    () => activeTickets.filter((ticket) => activeFilter === 'ALL' || ticket.status === activeFilter),
    [activeTickets, activeFilter]
  );

  const filteredArchiveTickets = useMemo(
    () => archiveTickets.filter((ticket) => archiveFilter === 'ALL' || ticket.status === archiveFilter),
    [archiveTickets, archiveFilter]
  );

  const metrics = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    assigned: tickets.filter((ticket) => ticket.status === 'ASSIGNED').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    closed: tickets.filter((ticket) => ticket.status === 'CLOSED').length,
    rejected: tickets.filter((ticket) => ticket.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Incident hub user workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Track your incidents with visible progress, evidence context, and clear next-step decisions.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover treats the user view as more than a simple list. Your tickets now surface status, evidence references, latest activity, and the resolution flow you need to confirm or reopen issues.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
            <MetricCard label="Total" value={`${metrics.total}`} />
            <MetricCard label="Open" value={`${metrics.open}`} />
            <MetricCard label="Assigned" value={`${metrics.assigned}`} />
            <MetricCard label="In progress" value={`${metrics.inProgress}`} />
            <MetricCard label="Resolved" value={`${metrics.resolved}`} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={cn(
                'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                activeFilter === status
                  ? 'border-primary bg-primary text-white shadow-md'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              {formatTicketStatusLabel(status)}
            </button>
          ))}
        </div>

        <Button className="gap-2" onClick={() => navigate('/tickets/new')}>
          <Wrench size={16} /> Report New Issue
        </Button>
      </div>

      <Card className="bg-white/70 p-5 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Outcome archive</p>
            <p className="mt-2 text-sm text-muted-foreground">Closed and rejected tickets stay here so your active workflow remains clean.</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['ALL', 'CLOSED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setArchiveFilter(status)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  archiveFilter === status
                    ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                )}
              >
                {status === 'ALL' ? `All outcomes (${archiveTickets.length})` : `${formatTicketStatusLabel(status)} (${status === 'CLOSED' ? metrics.closed : metrics.rejected})`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error && <Card className="border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</Card>}
      {actionError && <Card className="border-danger/30 bg-danger/5 p-5 text-sm text-danger">{actionError}</Card>}

      {loading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading ticket history...</Card>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Active tickets</h2>
              <Badge variant="info">Live workflow</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredActiveTickets.map((ticket) => (
                <TicketListCard
                  key={ticket.id}
                  ticket={ticket}
                  onOpen={() => navigate(`/tickets/${ticket.id}`)}
                  onDelete={() => handleDeleteTicket(ticket)}
                  deleting={deletingTicketId === ticket.id}
                />
              ))}

              {!filteredActiveTickets.length && (
                <EmptyState title="No active tickets found" copy="There are no live incident records in this filter right now." />
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Outcome archive</h2>
              <Badge variant="warning">Closed and rejected only</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredArchiveTickets.map((ticket) => (
                <TicketListCard
                  key={ticket.id}
                  ticket={ticket}
                  onOpen={() => navigate(`/tickets/${ticket.id}`)}
                  onDelete={() => handleDeleteTicket(ticket)}
                  deleting={deletingTicketId === ticket.id}
                  archived
                />
              ))}

              {!filteredArchiveTickets.length && (
                <EmptyState title="No archived tickets found" copy="Closed and rejected tickets will appear here instead of mixing with active work." />
              )}
            </div>
          </section>
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
  <div className="min-w-0 rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">
      {icon}
      {title}
    </div>
    <p className="overflow-hidden break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">{copy}</p>
  </div>
);

const TicketListCard = ({ ticket, onOpen, onDelete, deleting = false, archived = false }) => {
  const canDelete = archived && ['CLOSED', 'REJECTED'].includes(ticket.status);

  return (
    <Card className="overflow-hidden p-0 transition-all hover:border-primary/30">
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
                <Badge variant={statusBadgeVariant(ticket.status)}>
                  {formatTicketStatusLabel(ticket.status)}
                </Badge>
                <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                  {ticket.priority} priority
                </Badge>
                {archived && <Badge variant="neutral">Archived outcome</Badge>}
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

            <div className="flex flex-col gap-2 xl:self-center">
              <Button variant="ghost" className="gap-2" onClick={onOpen}>
                View Details <ChevronRight size={18} />
              </Button>
              {canDelete && (
                <Button variant="outline" className="gap-2" onClick={onDelete} isLoading={deleting}>
                  <Trash2 size={16} /> Delete Ticket
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <InfoTile title="Latest activity" icon={<MessageSquareMore size={16} className="text-primary" />} copy={getLatestTicketActivityCopy(ticket)} />
            <InfoTile title="Admin handling" icon={<AlertCircle size={16} className="text-primary" />} copy={ticket.rejectedAt ? `${ticket.rejectedByName || 'Operations Admin'} rejected this ticket.` : ticket.assignedAt ? `${ticket.assignedByName || 'Operations Admin'} assigned it on ${format(new Date(ticket.assignedAt), 'MMM d, yyyy')}.` : 'Awaiting a recorded admin decision.'} />
            <InfoTile title="Technician progress" icon={<Wrench size={16} className="text-primary" />} copy={ticket.resolvedAt ? `${ticket.resolvedByName || ticket.assignedTechnicianName || 'Technician'} resolved it.` : ticket.technicianStartedAt ? `${ticket.technicianStartedByName || ticket.assignedTechnicianName || 'Technician'} started work.` : ticket.assignedTechnicianName || ticket.assignedTechnicianId || (ticket.status === 'ASSIGNED' ? 'Technician assigned' : 'Pending assignment')} />
            <InfoTile title={archived ? 'Final outcome' : 'Resolution note'} icon={<AlertCircle size={16} className="text-primary" />} copy={ticket.rejectionReason || ticket.resolutionNotes || 'No final outcome note yet.'} />
          </div>
        </div>
      </div>
    </Card>
  );
};

const getLatestTicketActivityCopy = (ticket) => {
  if (ticket.rejectedAt) return `${ticket.rejectedByName || 'Operations Admin'} rejected this ticket.`;
  if (ticket.closedAt) return `${ticket.closedByName || 'Reporter'} closed this ticket.`;
  if (ticket.resolvedAt) return `${ticket.resolvedByName || ticket.assignedTechnicianName || 'Technician'} resolved this ticket.`;
  if (ticket.technicianStartedAt) return `${ticket.technicianStartedByName || ticket.assignedTechnicianName || 'Technician'} started work on this ticket.`;
  if (ticket.assignedAt) return `${ticket.assignedByName || 'Operations Admin'} assigned this ticket for repair.`;
  return 'Ticket created and waiting for the next update.';
};

const EmptyState = ({ title, copy }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <TicketIcon size={24} />
    </div>
    <h3 className="font-bold">{title}</h3>
    <p className="text-muted-foreground">{copy}</p>
  </div>
);
