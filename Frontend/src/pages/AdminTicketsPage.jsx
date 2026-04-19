import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowRight, Clock3, MapPin, Paperclip, ShieldAlert, Trash2, UserRoundCog, Wrench, X } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { assignTechnician, deleteTicket, getTicketSummary, getTickets, updateTicketStatus, toBackendRole } from '../lib/moduleCApi';
import { getAdminUsers } from '../lib/authApi';
import { formatTicketStatusLabel, statusBadgeVariant } from '../lib/moduleCLabels';
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
  const [deletingTicketId, setDeletingTicketId] = useState(null);
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
      const [ticketData, summaryData, technicianUsers] = await Promise.all([
        getTickets({ role: user?.role, userId: user?.id }),
        getTicketSummary(),
        getAdminUsers({ role: 'TECHNICIAN', status: 'ACTIVE' }),
      ]);
      setTickets(ticketData);
      setSummary(summaryData);
      setTechnicians((technicianUsers || []).map((account) => ({
        id: account.id,
        name: account.fullName,
        fullName: account.fullName,
        email: account.email,
        status: account.status,
        available: account.status === 'ACTIVE',
      })));
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

  const technicianWorkload = useMemo(() => buildTechnicianWorkload(technicians, tickets), [technicians, tickets]);

  const assignableTechnicians = useMemo(() => {
    if (!assigningTicket) return [];
    const assignedId = assigningTicket.assignedTechnicianId;
    return technicians
      .filter((technician) => technician.available || technician.id === assignedId)
      .sort((left, right) => {
        const leftWorkload = technicianWorkload[left.id];
        const rightWorkload = technicianWorkload[right.id];
        return (leftWorkload?.recommendationScore || Number.POSITIVE_INFINITY) - (rightWorkload?.recommendationScore || Number.POSITIVE_INFINITY);
      });
  }, [assigningTicket, technicianWorkload, technicians]);

  const recommendedTechnician = useMemo(() => {
    if (!assignableTechnicians.length) return null;
    return assignableTechnicians.find((technician) => technician.available) || assignableTechnicians[0];
  }, [assignableTechnicians]);
  const duplicateDispatchConflict = useMemo(
    () => (assigningTicket ? findDispatchedDuplicateConflict(assigningTicket, tickets) : null),
    [assigningTicket, tickets],
  );

  const openAssignPanel = (ticket) => {
    const assignmentState = getAssignmentState(ticket, technicianDirectory, technicians);
    const rankedTechnicians = technicians
      .filter((technician) => technician.available || technician.id === ticket.assignedTechnicianId)
      .sort((left, right) => {
        const leftWorkload = technicianWorkload[left.id];
        const rightWorkload = technicianWorkload[right.id];
        return (leftWorkload?.recommendationScore || Number.POSITIVE_INFINITY) - (rightWorkload?.recommendationScore || Number.POSITIVE_INFINITY);
      });
    const preferredTechnician = rankedTechnicians.find((technician) => technician.available)
      || assignmentState.availableAlternatives[0]
      || technicians.find((technician) => technician.available)
      || null;

    setActionError('');
    setStatusTicket(null);
    setAssigningTicket(ticket);
    setAssignForm({
      technicianId: preferredTechnician?.id || '',
      technicianName: (preferredTechnician?.fullName || preferredTechnician?.name) || '',
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
    if (duplicateDispatchConflict) {
      const assignedTechnician = duplicateDispatchConflict.assignedTechnicianName || 'another technician';
      setActionError(`A similar active ticket (#${duplicateDispatchConflict.id}) is already owned by ${assignedTechnician}. Reject or close the duplicate instead of dispatching a second technician.`);
      return;
    }

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
        note: 'Admin permanently deleted the full ticket record from the incident desk.',
      });
      closePanels();
      await loadDesk();
    } catch (err) {
      setActionError(err.message || 'Unable to delete ticket.');
    } finally {
      setDeletingTicketId(null);
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
                        technicianName: (selected?.fullName || selected?.name) || '',
                      });
                    }}
                  >
                    <option value="">Select technician</option>
                    {assignableTechnicians.filter((technician) => technician.available).map((technician) => {
                      const workload = technicianWorkload[technician.id];
                      return (
                        <option key={technician.id} value={technician.id}>
                          {technician.name} - {workload?.activeTickets || 0} active - {workload?.highPriorityTickets || 0} high - avg {workload?.averageResolutionLabel || 'No resolved tickets yet'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {recommendedTechnician && (
                  <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
                    <p className="font-semibold text-foreground">Recommended technician: {recommendedTechnician.name}</p>
                    <p className="mt-1 text-muted-foreground">
                      {describeTechnicianWorkload(technicianWorkload[recommendedTechnician.id])}
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="grid gap-3">
                    {assignableTechnicians.filter((technician) => technician.available).map((technician) => {
                      const workload = technicianWorkload[technician.id];
                      const isRecommended = recommendedTechnician?.id === technician.id;
                      const isSelected = assignForm.technicianId === technician.id;
                      return (
                        <button
                          key={technician.id}
                          type="button"
                          onClick={() => setAssignForm({ technicianId: technician.id, technicianName: technician.fullName || technician.name })}
                          className={`rounded-2xl border px-4 py-4 text-left transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-muted/35 hover:border-primary/35 dark:bg-white/5'} ${isRecommended ? 'ring-1 ring-success/35' : ''}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{technician.name}</p>
                            <Badge variant={isRecommended ? 'success' : 'outline'}>{isRecommended ? 'Recommended' : 'Available'}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{technician.id}{technician.email ? ` - ${technician.email}` : ''}</p>
                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                            <span>{workload?.activeTickets || 0} active tickets</span>
                            <span>{workload?.highPriorityTickets || 0} high priority</span>
                            <span>Avg {workload?.averageResolutionLabel || 'No resolved tickets yet'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
                {duplicateDispatchConflict && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                    A similar active ticket (#{duplicateDispatchConflict.id}) is already owned by {duplicateDispatchConflict.assignedTechnicianName || 'another technician'}. Reject or close this duplicate instead of assigning another technician.
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2" isLoading={saving} disabled={!assignForm.technicianId || Boolean(duplicateDispatchConflict)}><ShieldAlert size={16} /> Confirm assignment</Button>
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

      {error && <Card className="border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</Card>}
      {actionError && <Card className="border-warning/30 bg-warning/5 p-5 text-sm text-warning">{actionError}</Card>}

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
                  onDelete={() => handleDeleteTicket(ticket)}
                  deleting={deletingTicketId === ticket.id}
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
                onDelete={() => handleDeleteTicket(ticket)}
                deleting={deletingTicketId === ticket.id}
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

const ACTIVE_TECHNICIAN_STATUSES = new Set(['ASSIGNED', 'IN_PROGRESS']);
const HIGH_PRIORITY_LEVELS = new Set(['HIGH', 'CRITICAL']);
const ACTIVE_DUPLICATE_STATUSES = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS']);
const DUPLICATE_STOP_WORDS = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'have', 'into', 'during', 'after', 'before', 'when', 'where', 'which', 'issue', 'problem', 'reported', 'reporting', 'affecting', 'session', 'lecture', 'campus', 'building', 'floor', 'room', 'asset']);

const buildTechnicianWorkload = (technicians, tickets) => Object.fromEntries(technicians.map((technician) => {
  const technicianTickets = tickets.filter((ticket) => ticket.assignedTechnicianId === technician.id);
  const activeAssignedTickets = technicianTickets.filter((ticket) => ACTIVE_TECHNICIAN_STATUSES.has(ticket.status));
  const highPriorityTickets = activeAssignedTickets.filter((ticket) => HIGH_PRIORITY_LEVELS.has(ticket.priority));
  const resolvedDurations = technicianTickets
    .map((ticket) => {
      const startedAt = ticket.technicianStartedAt || ticket.assignedAt;
      const finishedAt = ticket.resolvedAt || ticket.closedAt;
      if (!startedAt || !finishedAt) return null;
      const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      return Number.isFinite(duration) && duration > 0 ? duration : null;
    })
    .filter(Boolean);

  const averageResolutionMs = resolvedDurations.length
    ? resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length
    : null;

  const recommendationScore = (activeAssignedTickets.length * 100)
    + (highPriorityTickets.length * 30)
    + Math.round((averageResolutionMs || 0) / (1000 * 60 * 60));

  return [technician.id, {
    activeTickets: activeAssignedTickets.length,
    highPriorityTickets: highPriorityTickets.length,
    averageResolutionMs,
    averageResolutionLabel: formatWorkloadDuration(averageResolutionMs),
    recommendationScore,
  }];
}));

const formatWorkloadDuration = (durationMs) => {
  if (!durationMs) return '';
  const totalMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const describeTechnicianWorkload = (workload) => {
  if (!workload) return 'No workload snapshot available.';
  return `${workload.activeTickets} active ticket(s), ${workload.highPriorityTickets} high-priority ticket(s), average resolution ${workload.averageResolutionLabel || 'not available yet'}.`;
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

const TicketDeskCard = ({ ticket, assignmentState, onOpen, onReject, onAssign, onDelete, deleting = false, archived = false }) => (
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
        {archived && (ticket.status === 'CLOSED' || ticket.status === 'REJECTED') && (
          <Button variant="outline" className="gap-2" onClick={onDelete} isLoading={deleting}>
            <Trash2 size={16} /> Delete ticket
          </Button>
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
  <div className="min-w-0 rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">
      {icon}
      {title}
    </div>
    <p className="overflow-hidden break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">{copy}</p>
  </div>
);

const EmptyState = ({ title, copy }) => (
  <Card className="p-8 text-sm text-muted-foreground">
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-2">{copy}</p>
  </Card>
);

const findDispatchedDuplicateConflict = (ticket, tickets) => tickets
  .filter((other) => other.id !== ticket.id)
  .filter((other) => ACTIVE_DUPLICATE_STATUSES.has(other.status))
  .filter((other) => isLikelySameIncident(ticket, other))
  .sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;
    return (left.id || 0) - (right.id || 0);
  })
  .find((other) => other.status === 'ASSIGNED' || other.status === 'IN_PROGRESS') || null;

const normalise = (value) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const extractKeywords = (...segments) => segments
  .filter(Boolean)
  .join(' ')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter((word) => word.length > 2 && !DUPLICATE_STOP_WORDS.has(word));

const isLikelySameIncident = (first, second) => {
  if (first.category !== second.category) return false;

  const firstResourceName = normalise(first.resourceName);
  const secondResourceName = normalise(second.resourceName);
  const firstResourceLocation = normalise(first.resourceLocation);
  const secondResourceLocation = normalise(second.resourceLocation);
  const firstIncidentLocation = normalise(first.incidentLocation);
  const secondIncidentLocation = normalise(second.incidentLocation);

  const sameResource = firstResourceName && firstResourceName === secondResourceName;
  const sameIncidentLocation = firstIncidentLocation && firstIncidentLocation === secondIncidentLocation;
  const sameBaseLocation = firstResourceLocation && firstResourceLocation === secondResourceLocation;
  if (!(sameResource || sameIncidentLocation || sameBaseLocation)) return false;

  const firstKeywords = new Set(extractKeywords(first.title, first.description, first.operationalImpact));
  const secondKeywords = new Set(extractKeywords(second.title, second.description, second.operationalImpact));
  const hasSharedKeyword = [...firstKeywords].some((keyword) => secondKeywords.has(keyword));

  return sameIncidentLocation || hasSharedKeyword;
};

