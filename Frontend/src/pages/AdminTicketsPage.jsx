import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowRight, Clock3, MapPin, Paperclip, ShieldAlert, UserRoundCog, Wrench, X } from 'lucide-react';
import { Card, Badge, Button, Input, NoticeBanner } from '../components/ui/Primitives';
import { assignTechnician, getTicketSummary, getTickets, updateTicketStatus, toBackendRole } from '../lib/moduleCApi';
import { formatTicketStatusLabel, statusBadgeVariant } from '../lib/moduleCLabels';
import { getDemoUsers } from '../lib/operationsApi';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['REJECTED'];

export const AdminTicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [statusTicket, setStatusTicket] = useState(null);
  const [assignForm, setAssignForm] = useState({ technicianId: '', technicianName: '' });
  const [statusForm, setStatusForm] = useState({ status: 'REJECTED', resolutionNotes: '', detail: '' });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: 'ALL', priority: 'ALL', category: 'ALL' });
  const [archiveFilter, setArchiveFilter] = useState('ALL');

  const technicianDirectory = useMemo(
    () => technicians.reduce((lookup, technician) => ({ ...lookup, [technician.id]: technician }), {}),
    [technicians],
  );

  const loadDesk = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketData, summaryData, demoUsers] = await Promise.all([
        getTickets({ role: user?.role, userId: user?.id }),
        getTicketSummary(),
        getDemoUsers(),
      ]);
      setTickets(ticketData);
      setSummary(summaryData);
      setTechnicians(demoUsers.filter((account) => account.role === 'TECHNICIAN'));
    } catch (err) {
      setError(err.message || 'Unable to load the incident desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDesk();
  }, [user]);

  const activeTickets = useMemo(() => tickets.filter((ticket) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(ticket.status)), [tickets]);
  const finishedTickets = useMemo(() => tickets.filter((ticket) => ['RESOLVED', 'CLOSED', 'REJECTED'].includes(ticket.status)), [tickets]);

  const visibleTickets = useMemo(() => activeTickets.filter((ticket) => {
    if (filters.status !== 'ALL' && ticket.status !== filters.status) return false;
    if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) return false;
    if (filters.category !== 'ALL' && ticket.category !== filters.category) return false;
    return true;
  }), [activeTickets, filters]);

  const visibleFinishedTickets = useMemo(() => finishedTickets.filter((ticket) => archiveFilter === 'ALL' || ticket.status === archiveFilter), [finishedTickets, archiveFilter]);

  const myAssignments = tickets.filter((item) => item.assignedTechnicianId === user?.id);
  const urgentUnassigned = activeTickets.filter((item) => !item.assignedTechnicianId && (item.priority === 'HIGH' || item.priority === 'CRITICAL'));

  const assignableTechnicians = useMemo(() => {
    if (!assigningTicket) return [];
    const assignedId = assigningTicket.assignedTechnicianId;
    return technicians.filter((technician) => technician.available || technician.id === assignedId);
  }, [assigningTicket, technicians]);

  const openAssignPanel = (ticket) => {
    const assignmentState = getAssignmentState(ticket, technicianDirectory, technicians);
    const preferredTechnician = assignmentState.availableAlternatives[0]
      || technicians.find((technician) => technician.available)
      || null;

    setActionError('');
    setStatusTicket(null);
    setAssigningTicket(ticket);
    setAssignForm({
      technicianId: preferredTechnician?.id || '',
      technicianName: preferredTechnician?.name || '',
    });
  };

  const openStatusPanel = (ticket) => {
    setActionError('');
    setAssigningTicket(null);
    setStatusTicket(ticket);
    setStatusForm({
      status: 'REJECTED',
      resolutionNotes: '',
      detail: ticket.rejectionReason || 'Admin rejected the ticket during desk triage.',
    });
  };

  const closePanels = () => {
    setAssigningTicket(null);
    setStatusTicket(null);
    setSaving(false);
  };

  const handleAssignSubmit = async (event) => {
    event.preventDefault();
    if (!assigningTicket || !assignForm.technicianId || !assignForm.technicianName) return;

    try {
      setSaving(true);
      setActionError('');
      const selectedTechnician = technicians.find((item) => item.id === assignForm.technicianId);
      await assignTechnician(assigningTicket.id, {
        technicianId: assignForm.technicianId,
        technicianName: selectedTechnician?.fullName || '',
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
      });
      await loadDesk();
      closePanels();
    } catch (err) {
      setActionError(err.message || 'Unable to assign technician.');
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (!statusTicket) return;

    try {
      setSaving(true);
      setActionError('');
      await updateTicketStatus(statusTicket.id, {
        status: statusForm.status,
        resolutionNotes: statusForm.resolutionNotes,
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        detail: statusForm.detail,
      });
      await loadDesk();
      closePanels();
    } catch (err) {
      setActionError(err.message || 'Unable to update ticket status.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Incident desk admin workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Triage, assign, and reject when needed without taking over technician or reporter work.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls for a true admin ticket desk, not the same ticket page with extra buttons. This workspace emphasizes high-priority unassigned issues, clean assignment control, and finished outcomes stored separately from live operational work.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Open" value={`${summary?.open || 0}`} />
            <MetricCard label="In progress" value={`${summary?.inProgress || 0}`} />
            <MetricCard label="Urgent unassigned" value={`${urgentUnassigned.length}`} />
            <MetricCard label="Assigned to you" value={`${myAssignments.length}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Triage rule</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Unassigned high-priority tickets should visually stand out and move to technician ownership before lower-impact queue work.</p>
        </Card>
        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Desk filters</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Admin needs deeper filtering than reporters or technicians, so status, priority, and category stay visible for the active queue only.</p>
        </Card>
        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Archive policy</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Resolved, closed, and rejected tickets are separated into an outcome archive so the incident desk stays focused on unfinished operational work.</p>
        </Card>
      </section>

      <Card className="bg-white/75 p-5 dark:bg-white/5">
        <div className="grid gap-4 md:grid-cols-3">
          <FilterSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS']} />
          <FilterSelect label="Priority" value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} options={['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} />
          <FilterSelect label="Category" value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={['ALL', 'EQUIPMENT', 'FACILITY', 'NETWORK', 'SAFETY', 'OTHER']} />
        </div>
      </Card>

      <Card className="bg-white/70 p-5 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Finished work archive</p>
            <p className="mt-2 text-sm text-muted-foreground">Resolved, closed, and rejected outcomes are grouped here instead of mixing with live triage tickets.</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['ALL', 'RESOLVED', 'CLOSED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setArchiveFilter(status)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all ${archiveFilter === status ? 'border-primary bg-primary text-white shadow-md' : 'border-border bg-card text-muted-foreground hover:border-primary/50'}`}
              >
                {status === 'ALL' ? `All finished (${finishedTickets.length})` : formatTicketStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {(assigningTicket || statusTicket) && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          {assigningTicket && (
            <Card className="bg-white/75 p-6 dark:bg-white/5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{assigningTicket.assignedTechnicianId ? 'Reassign technician' : 'Assign technician'}</p>
                  <h2 className="mt-2 text-xl font-semibold">{assigningTicket.title}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={closePanels}><X size={16} /></Button>
              </div>
              <form className="space-y-4" onSubmit={handleAssignSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium">Available technician</label>
                  <select
                    className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5"
                    value={assignForm.technicianId}
                    onChange={(event) => {
                      const selected = assignableTechnicians.find((technician) => technician.id === event.target.value);
                      setAssignForm({
                        technicianId: selected?.id || '',
                        technicianName: selected?.name || '',
                      });
                    }}
                  >
                    <option value="">Select technician</option>
                    {assignableTechnicians.filter((technician) => technician.available).map((technician) => (
                      <option key={technician.id} value={technician.id}>{technician.name} ({technician.id})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  {assigningTicket.assignedTechnicianId && technicianDirectory[assigningTicket.assignedTechnicianId] && (
                    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm dark:bg-white/5">
                      <p className="font-semibold">Current technician</p>
                      <p className="mt-1 text-muted-foreground">
                        {technicianDirectory[assigningTicket.assignedTechnicianId].name} · {technicianDirectory[assigningTicket.assignedTechnicianId].id} · {technicianDirectory[assigningTicket.assignedTechnicianId].available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm dark:bg-white/5">
                    <p className="font-semibold">Available now</p>
                    <p className="mt-1 text-muted-foreground">
                      {technicians.filter((technician) => technician.available).map((technician) => `${technician.name} (${technician.id})`).join(', ') || 'No available technicians at the moment.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2" isLoading={saving} disabled={!assignForm.technicianId}><ShieldAlert size={16} /> Confirm assignment</Button>
                  <Button type="button" variant="outline" onClick={closePanels}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {statusTicket && (
            <Card className="bg-white/75 p-6 dark:bg-white/5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Desk rejection</p>
                  <h2 className="mt-2 text-xl font-semibold">{statusTicket.title}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={closePanels}><X size={16} /></Button>
              </div>
              <form className="space-y-4" onSubmit={handleStatusSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium">Desk decision</label>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}>
                    {statusOptions.map((status) => <option key={status} value={status}>{formatTicketStatusLabel(status)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Resolution notes</label>
                  <textarea className="min-h-28 w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={statusForm.resolutionNotes} onChange={(event) => setStatusForm((current) => ({ ...current, resolutionNotes: event.target.value }))} placeholder="Not required for rejection. Leave empty unless you want to record extra reference notes." />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Desk note</label>
                  <textarea className="min-h-24 w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={statusForm.detail} onChange={(event) => setStatusForm((current) => ({ ...current, detail: event.target.value }))} placeholder="Required for rejection and useful for auditability." />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2" isLoading={saving}><Wrench size={16} /> Reject ticket</Button>
                  <Button type="button" variant="outline" onClick={closePanels}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}
        </section>
      )}

      <div className="space-y-3">
        {error && (
          <NoticeBanner variant="error" onDismiss={() => setError('')}>
            {error}
          </NoticeBanner>
        )}
        {actionError && (
          <NoticeBanner variant="warning" onDismiss={() => setActionError('')}>
            {actionError}
          </NoticeBanner>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active incident queue</h2>
          <Badge variant="danger">Live admin triage</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading incident workspace...</Card>
        ) : (
          <div className="space-y-3">
            {visibleTickets.map((ticket) => {
              const assignmentState = getAssignmentState(ticket, technicianDirectory, technicians);
              return (
                <TicketDeskCard
                  key={ticket.id}
                  ticket={ticket}
                  assignmentState={assignmentState}
                  onOpen={() => navigate(`/tickets/${ticket.id}`)}
                  onReject={() => openStatusPanel(ticket)}
                  onAssign={() => openAssignPanel(ticket)}
                />
              );
            })}
            {!visibleTickets.length && <EmptyState title="No active admin tickets" copy="There are no unfinished incident records in this filter right now." />}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Finished work archive</h2>
          <Badge variant="warning">Resolved, closed, rejected</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading finished outcomes...</Card>
        ) : (
          <div className="space-y-3">
            {visibleFinishedTickets.map((ticket) => (
              <TicketDeskCard
                key={ticket.id}
                ticket={ticket}
                assignmentState={getAssignmentState(ticket, technicianDirectory, technicians)}
                onOpen={() => navigate(`/tickets/${ticket.id}`)}
                archived
              />
            ))}
            {!visibleFinishedTickets.length && <EmptyState title="No finished work found" copy="Resolved, closed, and rejected tickets will appear here instead of mixing with the live desk." />}
          </div>
        )}
      </section>
    </div>
  );
};

const getAssignmentState = (ticket, technicianDirectory, technicians) => {
  const assignedTechnician = ticket.assignedTechnicianId ? technicianDirectory[ticket.assignedTechnicianId] : null;
  const availableAlternatives = technicians.filter((technician) => technician.available && technician.id !== ticket.assignedTechnicianId);

  if (!ticket.assignedTechnicianId) {
    return {
      canAssign: technicians.some((technician) => technician.available),
      canReassign: false,
      availableAlternatives,
      assigneeCopy: 'Unassigned',
    };
  }

  if (assignedTechnician?.available) {
    return {
      canAssign: false,
      canReassign: false,
      availableAlternatives,
      assigneeCopy: `${assignedTechnician.name} · Available`,
    };
  }

  return {
    canAssign: false,
    canReassign: availableAlternatives.length > 0,
    availableAlternatives,
    assigneeCopy: `${ticket.assignedTechnicianName || ticket.assignedTechnicianId} · Unavailable`,
  };
};

const TicketDeskCard = ({ ticket, assignmentState, onOpen, onReject, onAssign, archived = false }) => (
  <Card className={`bg-white/70 p-6 dark:bg-white/5 ${!archived && !ticket.assignedTechnicianId && (ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') ? 'border-danger/35 shadow-[0_18px_36px_rgba(239,68,68,0.08)]' : ''}`}>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
          <Badge variant={statusBadgeVariant(ticket.status)}>{formatTicketStatusLabel(ticket.status)}</Badge>
          {archived && <Badge variant="neutral">Finished</Badge>}
        </div>
        <h3 className="text-xl font-semibold">{ticket.title}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{ticket.description}</p>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-2"><MapPin size={14} /> {ticket.resourceName} - {ticket.resourceLocation}</p>
          <p className="flex items-center gap-2"><Clock3 size={14} /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
          <p className="flex items-center gap-2"><AlertTriangle size={14} /> Category: {ticket.category}</p>
          <p className="flex items-center gap-2"><UserRoundCog size={14} /> Assigned: {assignmentState.assigneeCopy}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile title="Evidence references" icon={<Paperclip size={16} className="text-primary" />} copy={ticket.evidenceLabels?.length ? ticket.evidenceLabels.join(', ') : ticket.evidenceNotes || 'No evidence reference supplied.'} />
          <InfoTile title="Reporter contact" icon={<UserRoundCog size={16} className="text-primary" />} copy={ticket.preferredContact || ticket.reporterEmail} />
          <InfoTile title="Booking context" icon={<MapPin size={16} className="text-primary" />} copy={ticket.relatedBookingLabel || ticket.incidentLocation || ticket.resourceLocation || 'No linked booking context.'} />
          <InfoTile title={archived ? 'Outcome trail' : 'Recorded desk trail'} icon={<ShieldAlert size={16} className="text-primary" />} copy={ticket.rejectedAt ? `${ticket.rejectedByName || 'Operations Admin'} rejected this on ${formatDistanceToNow(new Date(ticket.rejectedAt), { addSuffix: true })}.` : ticket.closedAt ? `${ticket.closedByName || 'Student / Staff'} closed this on ${formatDistanceToNow(new Date(ticket.closedAt), { addSuffix: true })}.` : ticket.resolvedAt ? `${ticket.resolvedByName || ticket.assignedTechnicianName || 'Technician'} resolved this on ${formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}.` : ticket.assignedAt ? `${ticket.assignedByName || 'Operations Admin'} assigned this on ${formatDistanceToNow(new Date(ticket.assignedAt), { addSuffix: true })}.` : 'No recorded admin milestone yet.'} />
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:min-w-56">
        {!archived && ticket.status !== 'REJECTED' && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
          <Button className="gap-2" onClick={onReject}><Wrench size={16} /> Reject ticket</Button>
        )}
        {!archived && ticket.status !== 'REJECTED' && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && ticket.status !== 'IN_PROGRESS' && assignmentState.canAssign && (
          <Button variant="outline" className="gap-2" onClick={onAssign}><ShieldAlert size={16} /> Assign technician</Button>
        )}
        {!archived && ticket.status !== 'REJECTED' && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && ticket.status !== 'IN_PROGRESS' && assignmentState.canReassign && (
          <Button variant="outline" className="gap-2" onClick={onAssign}><ShieldAlert size={16} /> Reassign technician</Button>
        )}
        <Button variant="ghost" className="gap-2" onClick={onOpen}>
          {archived ? 'Open archived case' : 'Open case file'} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  </Card>
);

const MetricCard = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="space-y-2 text-sm font-semibold">
    <span>{label}</span>
    <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{formatTicketStatusLabel(option)}</option>)}
    </select>
  </label>
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

const EmptyState = ({ title, copy }) => (
  <Card className="p-8 text-sm text-muted-foreground">
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-2">{copy}</p>
  </Card>
);
