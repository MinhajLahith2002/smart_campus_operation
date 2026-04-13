import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowRight, Clock3, MapPin, Paperclip, ShieldAlert, UserRoundCog, Wrench, X } from 'lucide-react';
import { Card, Badge, Button, Input } from '../components/ui/Primitives';
import { assignTechnician, getTicketSummary, getTickets, updateTicketStatus, toBackendRole } from '../lib/moduleCApi';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export const AdminTicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [statusTicket, setStatusTicket] = useState(null);
  const [assignForm, setAssignForm] = useState({ technicianId: 'tech-17', technicianName: 'Kasun Silva' });
  const [statusForm, setStatusForm] = useState({ status: 'IN_PROGRESS', resolutionNotes: '', detail: '' });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: 'ALL', priority: 'ALL', category: 'ALL' });

  const loadDesk = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketData, summaryData] = await Promise.all([
        getTickets({ role: user?.role, userId: user?.id }),
        getTicketSummary(),
      ]);
      setTickets(ticketData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Unable to load the incident desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDesk();
  }, [user]);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    if (filters.status !== 'ALL' && ticket.status !== filters.status) return false;
    if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) return false;
    if (filters.category !== 'ALL' && ticket.category !== filters.category) return false;
    return true;
  }), [tickets, filters]);

  const myAssignments = tickets.filter((item) => item.assignedTechnicianId === user?.id);
  const urgentUnassigned = tickets.filter((item) => !item.assignedTechnicianId && (item.priority === 'HIGH' || item.priority === 'CRITICAL'));

  const openAssignPanel = (ticket) => {
    setActionError('');
    setStatusTicket(null);
    setAssigningTicket(ticket);
    setAssignForm({
      technicianId: ticket.assignedTechnicianId || 'tech-17',
      technicianName: ticket.assignedTechnicianName || 'Kasun Silva',
    });
  };

  const openStatusPanel = (ticket) => {
    setActionError('');
    setAssigningTicket(null);
    setStatusTicket(ticket);
    setStatusForm({
      status: ticket.status === 'OPEN' || ticket.status === 'ASSIGNED' || ticket.status === 'TRIAGED' ? 'IN_PROGRESS' : ticket.status === 'IN_PROGRESS' ? 'RESOLVED' : 'REJECTED',
      resolutionNotes: ticket.resolutionNotes || '',
      detail: ticket.status === 'IN_PROGRESS' ? 'Technician work is being advanced by the incident desk.' : 'Admin triage decision recorded.',
    });
  };

  const closePanels = () => {
    setAssigningTicket(null);
    setStatusTicket(null);
    setSaving(false);
  };

  const handleAssignSubmit = async (event) => {
    event.preventDefault();
    if (!assigningTicket) return;

    try {
      setSaving(true);
      setActionError('');
      await assignTechnician(assigningTicket.id, {
        technicianId: assignForm.technicianId,
        technicianName: assignForm.technicianName,
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
            <div className="eyebrow mb-4">Module C admin workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Triage, assign, and move the campus incident queue without losing operational clarity.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls for a true admin ticket desk, not the same ticket page with extra buttons. This workspace emphasizes high-priority unassigned issues, assignment control, and state progression for all tickets.
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
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Admin needs deeper filtering than reporters or technicians, so status, priority, and category stay visible here at list level.</p>
        </Card>
        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Assignment policy</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Assignment and workflow progression are separate decisions to keep Module C audit-friendly and less ambiguous.</p>
        </Card>
      </section>

      <Card className="bg-white/75 p-5 dark:bg-white/5">
        <div className="grid gap-4 md:grid-cols-3">
          <FilterSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']} />
          <FilterSelect label="Priority" value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} options={['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} />
          <FilterSelect label="Category" value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={['ALL', 'EQUIPMENT', 'FACILITY', 'NETWORK', 'SAFETY', 'OTHER']} />
        </div>
      </Card>

      {(assigningTicket || statusTicket) && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          {assigningTicket && (
            <Card className="bg-white/75 p-6 dark:bg-white/5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Assign technician</p>
                  <h2 className="mt-2 text-xl font-semibold">{assigningTicket.title}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={closePanels}><X size={16} /></Button>
              </div>
              <form className="space-y-4" onSubmit={handleAssignSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium">Technician ID</label>
                  <Input value={assignForm.technicianId} onChange={(event) => setAssignForm((current) => ({ ...current, technicianId: event.target.value }))} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Technician name</label>
                  <Input value={assignForm.technicianName} onChange={(event) => setAssignForm((current) => ({ ...current, technicianName: event.target.value }))} required />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2" isLoading={saving}><ShieldAlert size={16} /> Confirm assignment</Button>
                  <Button type="button" variant="outline" onClick={closePanels}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {statusTicket && (
            <Card className="bg-white/75 p-6 dark:bg-white/5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Workflow update</p>
                  <h2 className="mt-2 text-xl font-semibold">{statusTicket.title}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={closePanels}><X size={16} /></Button>
              </div>
              <form className="space-y-4" onSubmit={handleStatusSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium">Next status</label>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Resolution notes</label>
                  <textarea className="min-h-28 w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={statusForm.resolutionNotes} onChange={(event) => setStatusForm((current) => ({ ...current, resolutionNotes: event.target.value }))} placeholder="Required when resolving a ticket." />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Desk note</label>
                  <textarea className="min-h-24 w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={statusForm.detail} onChange={(event) => setStatusForm((current) => ({ ...current, detail: event.target.value }))} placeholder="Required for rejection and useful for auditability." />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2" isLoading={saving}><Wrench size={16} /> Save status</Button>
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
          <h2 className="text-xl font-semibold">Incident queue</h2>
          <Badge variant="danger">Admin triage view</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading incident workspace...</Card>
        ) : (
          <div className="space-y-3">
            {visibleTickets.map((ticket) => (
              <Card key={ticket.id} className={`bg-white/70 p-6 dark:bg-white/5 ${!ticket.assignedTechnicianId && (ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') ? 'border-danger/35 shadow-[0_18px_36px_rgba(239,68,68,0.08)]' : ''}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
                      <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'OPEN' ? 'warning' : ticket.status === 'REJECTED' ? 'danger' : 'success'}>{ticket.status.replace('_', ' ')}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold">{ticket.title}</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{ticket.description}</p>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-2"><MapPin size={14} /> {ticket.resourceName} - {ticket.resourceLocation}</p>
                      <p className="flex items-center gap-2"><Clock3 size={14} /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                      <p className="flex items-center gap-2"><AlertTriangle size={14} /> Category: {ticket.category}</p>
                      <p className="flex items-center gap-2"><UserRoundCog size={14} /> Assigned: {ticket.assignedTechnicianName || 'Unassigned'}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoTile title="Evidence references" icon={<Paperclip size={16} className="text-primary" />} copy={ticket.evidenceLabels?.length ? ticket.evidenceLabels.join(', ') : ticket.evidenceNotes || 'No evidence reference supplied.'} />
                      <InfoTile title="Reporter contact" icon={<UserRoundCog size={16} className="text-primary" />} copy={ticket.preferredContact || ticket.reporterEmail} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-56">
                    <Button className="gap-2" onClick={() => openStatusPanel(ticket)}><Wrench size={16} /> Update status</Button>
                    <Button variant="outline" className="gap-2" onClick={() => openAssignPanel(ticket)}><ShieldAlert size={16} /> Assign technician</Button>
                    <Button variant="ghost" className="gap-2" onClick={() => navigate(`/tickets/${ticket.id}`)}>Open case file <ArrowRight size={16} /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
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

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="space-y-2 text-sm font-semibold">
    <span>{label}</span>
    <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}
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
