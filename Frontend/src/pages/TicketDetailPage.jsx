import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Gauge,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Paperclip,
  Pencil,
  PhoneCall,
  Radar,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRoundCog,
  Wrench,
  X,
} from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner } from '../components/ui/Primitives';
import { addComment, assignTechnician, closeTicket, deleteComment, deleteTicket, getTicket, reopenTicket, toBackendRole, updateComment, updateTicketStatus } from '../lib/moduleCApi';
import { formatTicketStatusLabel, statusBadgeVariant } from '../lib/moduleCLabels';
import { maintenanceHealth } from '../lib/moduleCInsights';
import { useAuth } from '../context/AuthContext';
import { getDemoUsers } from '../lib/operationsApi';

export const TicketDetailPage = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const { user, refreshSession } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [stillBrokenModalOpen, setStillBrokenModalOpen] = useState(false);
  const [stillBrokenNote, setStillBrokenNote] = useState('The issue still persists after the reported fix.');
  const [stillBrokenPhoto, setStillBrokenPhoto] = useState(null);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTicket(ticketId, { role: user?.role, userId: user?.id });
      setTicket(data);
    } catch (err) {
      setError(err.message || 'Unable to load the ticket case file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadTicket(); }, [ticketId, user]);
  useEffect(() => { setActionError(''); }, [ticket?.id, ticket?.status]);

  const isReporter = Boolean(ticket) && (
    user?.id === ticket.reporterId
    || (
      typeof user?.email === 'string'
      && typeof ticket?.reporterEmail === 'string'
      && user.email.trim().toLowerCase() === ticket.reporterEmail.trim().toLowerCase()
    )
  );
  const isAdmin = user?.role === 'ADMIN';
  const isTechnician = user?.role === 'TECHNICIAN' && user?.id === ticket?.assignedTechnicianId;
  const canResolveConfirmation = isReporter && ticket?.status === 'RESOLVED';
  const canComment = ticket && ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(ticket.status) && (isReporter || isAdmin || isTechnician);
  const canReporterDelete = isReporter && ['CLOSED', 'REJECTED'].includes(ticket?.status);
  const canAdminDelete = isAdmin && ['CLOSED', 'REJECTED'].includes(ticket?.status);
  const healthScore = maintenanceHealth({
    similarCount: Number(ticket?.similarOpenIncidents || 0),
    priority: ticket?.priority || 'LOW',
    evidenceCount: ticket?.evidenceLabels?.length || 0,
  });

  const timeline = useMemo(() => {
    if (!ticket) return [];

    const steps = [
      { key: 'OPEN', title: 'Open', owner: 'Operations Admin' },
      { key: 'ASSIGNED', title: 'Assigned', owner: 'Operations Admin' },
      { key: 'IN_PROGRESS', title: 'In Progress', owner: 'Technician' },
      { key: 'RESOLVED', title: 'Resolved', owner: 'Technician' },
      { key: 'CLOSED', title: 'Closed', owner: 'Student / Staff' },
    ];

    if (ticket.status === 'REJECTED') {
      return [
        { key: 'OPEN', title: 'Open', owner: 'Operations Admin', state: 'completed' },
        { key: 'REJECTED', title: 'Rejected', owner: 'Operations Admin', state: 'current', danger: true },
      ];
    }

    const stateMap = {
      OPEN: {
        OPEN: 'current',
      },
      TRIAGED: {
        OPEN: 'current',
      },
      ASSIGNED: {
        OPEN: 'completed',
        ASSIGNED: 'current',
      },
      IN_PROGRESS: {
        OPEN: 'completed',
        ASSIGNED: 'completed',
        IN_PROGRESS: 'current',
      },
      RESOLVED: {
        OPEN: 'completed',
        ASSIGNED: 'completed',
        IN_PROGRESS: 'completed',
        RESOLVED: 'current',
      },
      CLOSED: {
        OPEN: 'completed',
        ASSIGNED: 'completed',
        IN_PROGRESS: 'completed',
        RESOLVED: 'completed',
        CLOSED: 'current',
      },
    };

    const currentStates = stateMap[ticket.status] || stateMap.OPEN;
    return steps.map((step) => ({
      ...step,
      state: currentStates[step.key] || 'pending',
    }));
  }, [ticket]);

  const runAction = async (name, callback) => {
    try {
      setBusyAction(name);
      setActionError('');
      await callback();
      await loadTicket();
    } catch (err) {
      setActionError(err.message || 'Unable to complete that action.');
    } finally {
      setBusyAction('');
    }
  };

  const requireFreshUser = async (allowedRoles) => {
    const latestUser = await refreshSession().catch(() => null);
    if (!latestUser) {
      throw new Error('Your session expired. Please sign in again and retry.');
    }
    if (allowedRoles && !allowedRoles.includes(latestUser.role)) {
      throw new Error('Session role mismatch detected. Please sign in again with the correct role and retry.');
    }
    return latestUser;
  };

  if (loading) return <Card className="p-8 text-sm text-muted-foreground">Loading case file...</Card>;

  if (error || !ticket) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'The requested ticket could not be loaded.'}</p>
        <Button variant="ghost" onClick={() => navigate('/tickets')} className="mt-4">Back to tickets</Button>
      </div>
    );
  }

  const handleEditTicket = () => navigate(`/tickets/${ticket.id}/edit`);

  const handleDeleteTicket = () => {
    const confirmed = window.confirm('Delete this ticket permanently? This removes the whole ticket record and cannot be undone.');
    if (!confirmed) return;
    runAction('delete-ticket', async () => {
      await deleteTicket(ticket.id, {
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        note: isAdmin
          ? 'Admin permanently deleted the full ticket record.'
          : 'Reporter permanently deleted the full ticket record.',
      });
      navigate(isAdmin ? '/admin/tickets' : '/tickets/my');
    });
  };

  const handleConfirmFixed = () => runAction('close', async () => {
    const latestUser = await requireFreshUser(['USER', 'ADMIN']);
    await closeTicket(ticket.id, {
      actorId: latestUser.id,
      actorName: latestUser.name,
      actorRole: toBackendRole(latestUser.role),
      note: 'Reporter confirmed the fix and closed the ticket.',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tickets:refresh'));
    }
    navigate('/tickets/my');
  });

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read the selected photo.'));
    reader.readAsDataURL(file);
  });

  const openStillBrokenModal = () => {
    setStillBrokenNote('The issue still persists after the reported fix.');
    setStillBrokenPhoto(null);
    setStillBrokenModalOpen(true);
  };

  const closeStillBrokenModal = () => {
    if (busyAction === 'reopen') return;
    setStillBrokenModalOpen(false);
    setStillBrokenPhoto(null);
  };

  const handleStillBrokenEvidenceChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStillBrokenPhoto(null);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setStillBrokenPhoto({ name: file.name, dataUrl });
    } catch (err) {
      setActionError(err.message || 'Unable to read the selected photo.');
    }
  };

  const submitStillBrokenReport = () => {
    if (!stillBrokenNote.trim()) {
      setActionError('Add a short note about what is still broken before reopening the ticket.');
      return;
    }

    runAction('reopen', async () => {
      const latestUser = await requireFreshUser(['USER', 'ADMIN']);
      await reopenTicket(ticket.id, {
        actorId: latestUser.id,
        actorName: latestUser.name,
        actorRole: toBackendRole(latestUser.role),
        note: stillBrokenNote.trim(),
        evidenceLabel: stillBrokenPhoto?.name || '',
        evidenceDataUrl: stillBrokenPhoto?.dataUrl || '',
      });
      setStillBrokenModalOpen(false);
      setStillBrokenPhoto(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tickets:refresh'));
      }
      navigate('/tickets/my');
    });
  };

  const handleTechnicianProgress = (status) => runAction(status, async () => {
    const latestUser = await requireFreshUser(['TECHNICIAN']);
    await updateTicketStatus(ticket.id, {
      status,
      resolutionNotes: status === 'RESOLVED' ? (window.prompt('Resolution notes', ticket.resolutionNotes || 'Issue resolved after inspection and corrective work.') || '') : ticket.resolutionNotes || '',
      actorId: latestUser.id,
      actorName: latestUser.name,
      actorRole: toBackendRole(latestUser.role),
      detail: status === 'IN_PROGRESS' ? 'Technician began active work on this ticket.' : 'Technician marked the ticket resolved with a resolution note.',
    });
  });

  const handleAdminReject = () => {
    const detailNote = window.prompt('Rejection reason', ticket.rejectionReason || 'Admin rejected the ticket during desk triage.');
    if (!detailNote) return;
    runAction('reject', async () => {
      const latestUser = await requireFreshUser(['ADMIN']);
      await updateTicketStatus(ticket.id, {
        status: 'REJECTED',
        resolutionNotes: '',
        actorId: latestUser.id,
        actorName: latestUser.name,
        actorRole: toBackendRole(latestUser.role),
        detail: detailNote,
      });
    });
  };

  const handleAdminAssign = () => {
    const technicianId = window.prompt('Technician ID', ticket.assignedTechnicianId || 'tech-17');
    if (!technicianId) return;
    const technicianName = window.prompt('Technician name', ticket.assignedTechnicianName || 'Kasun Silva');
    if (!technicianName) return;
    runAction('assign', async () => {
      const latestUser = await requireFreshUser(['ADMIN']);
      await assignTechnician(ticket.id, {
        technicianId,
        technicianName,
        actorId: latestUser.id,
        actorName: latestUser.name,
        actorRole: toBackendRole(latestUser.role),
      });
    });
  };

  const submitComment = async () => {
    if (!commentDraft.trim()) return;
    const payload = {
      actorId: user.id,
      actorName: user.name,
      actorRole: toBackendRole(user.role),
      body: commentDraft,
    };

    await runAction(editingCommentId ? 'edit-comment' : 'add-comment', async () => {
      if (editingCommentId) {
        await updateComment(editingCommentId, payload);
      } else {
        await addComment(ticket.id, payload);
      }
      setCommentDraft('');
      setEditingCommentId(null);
    });
  };

  const beginEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setCommentDraft(comment.body === 'Comment removed' ? '' : comment.body);
  };

  const handleDeleteComment = (comment) => runAction('delete-comment', () => deleteComment(comment.id, {
    actorId: user.id,
    actorName: user.name,
    actorRole: toBackendRole(user.role),
    note: 'Comment removed from the thread.',
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Incident case file</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
              <Badge variant={statusBadgeVariant(ticket.status)}>{formatTicketStatusLabel(ticket.status)}</Badge>
              <Badge variant="info">Smart {ticket.smartPriorityLabel}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{ticket.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{ticket.description}</p>
          </div>

          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ticket header</p>
            <h2 className="mt-2 text-2xl font-semibold">TK-{ticket.id}</h2>
            <div className="mt-5 grid gap-3">
              <InlineRow icon={<MapPin size={14} />} label="Incident spot" value={ticket.incidentLocation || ticket.resourceLocation || 'Unknown'} />
              <InlineRow icon={<Wrench size={14} />} label="Assignee" value={ticket.assignedTechnicianName || ticket.assignedTechnicianId || 'Unassigned'} />
              <InlineRow icon={<Clock3 size={14} />} label="Age" value={formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} />
              <InlineRow icon={<Radar size={14} />} label="Response target" value={ticket.responseTarget || 'Under review'} />
            </div>
          </div>
        </div>
      </section>

      {actionError && <Card className="border-warning/30 bg-warning/5 p-5 text-sm text-warning">{actionError}</Card>}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <h2 className="text-xl font-semibold">Operational details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailCard icon={<MapPin size={16} className="text-primary" />} title="Exact incident location" copy={ticket.incidentLocation || ticket.resourceLocation || 'Not provided'} />
              <DetailCard icon={<MapPin size={16} className="text-primary" />} title="Asset base location" copy={ticket.resourceLocation || 'Not provided'} />
              <DetailCard icon={<PhoneCall size={16} className="text-primary" />} title="Preferred contact" copy={ticket.preferredContact || 'Not provided'} />
              <DetailCard icon={<UserRoundCog size={16} className="text-primary" />} title="Assigned technician" copy={ticket.assignedTechnicianName || ticket.assignedTechnicianId || 'Unassigned'} />
              <DetailCard icon={<Paperclip size={16} className="text-primary" />} title="Linked booking/session" copy={ticket.relatedBookingLabel || 'No booking context linked to this ticket.'} />
              <DetailCard icon={<AlertTriangle size={16} className="text-primary" />} title="Reported on" copy={format(new Date(ticket.createdAt), 'PPP p')} />
            </div>
          </Card>

          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><Sparkles size={18} className="text-primary" /> Incident intelligence</div>
            <div className="grid gap-4 md:grid-cols-3">
              <SignalCard icon={<Gauge size={16} className="text-primary" />} title="Smart priority score" value={`${ticket.smartPriorityScore || 0}/100`} copy={`System reading suggests ${ticket.smartPriorityLabel || 'LOW'} urgency.`} />
              <SignalCard icon={<Radar size={16} className="text-primary" />} title="Pattern watch" value={`${ticket.similarOpenIncidents || 0} active`} copy="Similar open incidents across the same resource or category." />
              <SignalCard icon={<ShieldAlert size={16} className="text-primary" />} title="Maintenance health" value={`${healthScore}%`} copy="Higher scores suggest fewer repeat-failure signals around this asset." />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><ImageIcon size={18} className="text-primary" /> Evidence gallery</div>
            {ticket.evidenceLabels?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ticket.evidenceLabels.map((item, index) => (
                  <button key={`${item}-${index}`} type="button" onClick={() => setLightboxItem(item)} className="overflow-hidden rounded-2xl border border-border bg-muted/45 text-left transition hover:-translate-y-1 hover:border-primary/30 dark:bg-white/5">
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-cyan-400/20 text-primary">
                      <ImageIcon size={28} />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold">{item}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reference {index + 1} of {ticket.evidenceLabels.length}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No evidence references were attached to this ticket.</p>
            )}
          </Card>

          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
            <Card className="bg-success/5 p-6 border-success/20">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><CheckCircle2 size={18} className="text-success" /> Resolution note</div>
              <p className="text-sm leading-7 text-muted-foreground">{ticket.resolutionNotes || 'A resolution note was not provided.'}</p>
            </Card>
          )}

          {ticket.status === 'REJECTED' && (
            <Card className="bg-danger/5 p-6 border-danger/20">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldAlert size={18} className="text-danger" /> Rejection reason</div>
              <p className="text-sm leading-7 text-muted-foreground">{ticket.activities?.[ticket.activities.length - 1]?.detail || 'This ticket was rejected by the incident desk.'}</p>
            </Card>
          )}

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><MessageSquare size={18} className="text-primary" /> Discussion</div>
            <div className="space-y-4">
              {ticket.comments?.length ? ticket.comments.map((comment) => {
                const ownComment = user?.id === comment.authorId;
                return (
                  <div key={comment.id} className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{comment.authorName}</p>
                          <Badge variant="info">{comment.authorRole}</Badge>
                          {comment.edited && <span className="text-xs text-muted-foreground">Edited</span>}
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">{format(new Date(comment.updatedAt), 'PPP p')}</p>
                      </div>
                      {(ownComment || isAdmin) && !comment.deleted && (
                        <div className="flex gap-2">
                          {ownComment && <Button variant="ghost" size="icon" onClick={() => beginEditComment(comment)}><Pencil size={14} /></Button>}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment)}><Trash2 size={14} /></Button>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{comment.body}</p>
                  </div>
                );
              }) : <p className="text-sm text-muted-foreground">No comments yet. This ticket thread is ready for updates.</p>}

              <div className="rounded-2xl border border-border bg-white/45 p-4 dark:bg-white/5">
                <label className="mb-2 block text-sm font-semibold">{editingCommentId ? 'Edit comment' : 'Add comment'}</label>
                <textarea className="min-h-28 w-full rounded-xl border border-border bg-white/60 px-3 py-3 text-sm dark:bg-white/5" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={canComment ? 'Add a contextual update to the discussion.' : 'Comments are disabled for this role or ticket state.'} disabled={!canComment} />
                <p className="mt-2 text-xs text-muted-foreground">Comments need at least 5 characters and are blocked after close or rejection.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button className="gap-2" onClick={submitComment} isLoading={busyAction === 'add-comment' || busyAction === 'edit-comment'} disabled={!canComment || commentDraft.trim().length < 5}>
                    {editingCommentId ? 'Save Comment' : 'Post Comment'}
                  </Button>
                  {editingCommentId && <Button variant="outline" onClick={() => { setEditingCommentId(null); setCommentDraft(''); }}>Cancel Edit</Button>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><UserRoundCog size={18} className="text-primary" /> Role records</div>
            <div className="grid gap-4 md:grid-cols-3">
              <DetailCard icon={<Paperclip size={16} className="text-primary" />} title="Reporter record" copy={`${ticket.reporterName} submitted this on ${formatTimestamp(ticket.createdAt)}.`} />
              <DetailCard icon={<ShieldAlert size={16} className="text-primary" />} title="Admin record" copy={ticket.rejectedAt ? `${ticket.rejectedByName || 'Operations Admin'} rejected this on ${formatTimestamp(ticket.rejectedAt)}.` : ticket.assignedAt ? `${ticket.assignedByName || 'Operations Admin'} assigned the technician on ${formatTimestamp(ticket.assignedAt)}.` : 'Admin review is still pending a recorded desk action.'} />
              <DetailCard icon={<Wrench size={16} className="text-primary" />} title="Technician record" copy={ticket.resolvedAt ? `${ticket.resolvedByName || ticket.assignedTechnicianName || 'Technician'} resolved this on ${formatTimestamp(ticket.resolvedAt)}.` : ticket.technicianStartedAt ? `${ticket.technicianStartedByName || ticket.assignedTechnicianName || 'Technician'} started work on ${formatTimestamp(ticket.technicianStartedAt)}.` : 'Technician work has not started yet.'} />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><ShieldAlert size={18} className="text-primary" /> Activity trail</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {ticket.activities?.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
                  <p className="font-semibold text-foreground">{activity.action.replace('_', ' ')}</p>
                  <p className="mt-1">{activity.detail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em]">{activity.actorName} - {activity.actorRole}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold"><Wrench size={18} className="text-primary" /> Lifecycle</div>
            <div className="space-y-3">
              {timeline.map((step, index) => {
                const isCompleted = step.state === 'completed';
                const isCurrent = step.state === 'current';
                const containerClass = isCurrent
                  ? step.danger
                    ? 'border-danger/30 bg-danger/5'
                    : 'border-primary/20 bg-white/50 dark:bg-white/5'
                  : isCompleted
                    ? 'border-success/20 bg-success/5'
                    : 'border-border bg-muted/40 dark:bg-white/5';
                const badgeClass = isCurrent
                  ? step.danger
                    ? 'bg-danger text-white'
                    : 'bg-primary text-white'
                  : isCompleted
                    ? 'bg-success text-white'
                    : 'bg-muted text-muted-foreground';
                const statusCopy = isCurrent
                  ? 'Current step'
                  : isCompleted
                    ? 'Completed'
                    : 'Pending step';

                return (
                  <div key={step.key} className={`rounded-2xl border px-4 py-4 ${containerClass}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${badgeClass}`}>{index + 1}</div>
                      <div>
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.owner} - {statusCopy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Role actions</div>
            <div className="space-y-3">
              {isReporter && ticket.status === 'OPEN' && (
                <>
                  <Button className="w-full gap-2" onClick={handleEditTicket}>Edit Ticket</Button>
                </>
              )}
              {(canReporterDelete || canAdminDelete) && (
                <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'delete-ticket'} onClick={handleDeleteTicket}>Delete Ticket</Button>
              )}
              {canResolveConfirmation && (
                <>
                  <Button className="w-full gap-2" isLoading={busyAction === 'close'} onClick={handleConfirmFixed}>Confirm Fixed</Button>
                  <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'reopen'} onClick={openStillBrokenModal}>Report Still Broken</Button>
                </>
              )}
              {isAdmin && ticket.status !== 'REJECTED' && (
                <>
                  {!ticket.assignedTechnicianId && ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                    <Button className="w-full gap-2" isLoading={busyAction === 'assign'} onClick={handleAdminAssign}>Assign Technician</Button>
                  )}
                  {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                    <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'reject'} onClick={handleAdminReject}>Reject Ticket</Button>
                  )}
                </>
              )}
              {isAdmin && ticket.status === 'REJECTED' && (
                <p className="text-sm text-muted-foreground">This ticket has been fully rejected and is now read-only in the admin workflow.</p>
              )}
              {isTechnician && (
                <>
                  {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && <Button className="w-full gap-2" isLoading={busyAction === 'IN_PROGRESS'} onClick={() => handleTechnicianProgress('IN_PROGRESS')}>Start Work</Button>}
                  {ticket.status === 'IN_PROGRESS' && <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'RESOLVED'} onClick={() => handleTechnicianProgress('RESOLVED')}>Mark Resolved</Button>}
                </>
              )}
              {!isReporter && !isAdmin && !isTechnician && !canResolveConfirmation && <p className="text-sm text-muted-foreground">This case is visible, but no workflow actions are available for your current role.</p>}
            </div>
          </Card>
        </div>
      </div>


      {stillBrokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-sm" onClick={closeStillBrokenModal}>
          <div className="w-full max-w-lg rounded-[24px] border border-white/10 bg-slate-950 text-slate-50 shadow-[0_24px_90px_rgba(15,23,42,0.48)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Report the issue as still broken</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Give a reason and optionally upload one photo.</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 border border-white/10 text-slate-200 hover:bg-white/10" onClick={closeStillBrokenModal}><X size={18} /></Button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Reason</label>
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/12 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
                  value={stillBrokenNote}
                  onChange={(event) => setStillBrokenNote(event.target.value)}
                  placeholder="Explain what is still broken."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Upload photo (optional)</label>
                <label htmlFor="still-broken-evidence" className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <Paperclip size={16} />
                    Choose photo
                  </span>
                  <span className="text-xs text-slate-400">One image</span>
                </label>
                <input id="still-broken-evidence" type="file" accept="image/*" onChange={handleStillBrokenEvidenceChange} className="hidden" />
                {stillBrokenPhoto && <p className="mt-2 text-sm text-cyan-200">Selected: {stillBrokenPhoto.name}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
              <Button variant="outline" className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10" onClick={closeStillBrokenModal}>Cancel</Button>
              <Button className="min-w-[150px]" isLoading={busyAction === 'reopen'} onClick={submitStillBrokenReport}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-6" onClick={() => setLightboxItem(null)}>
          <div className="max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Evidence preview</p>
                <h3 className="mt-2 text-xl font-semibold">{lightboxItem}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setLightboxItem(null)}><X size={18} /></Button>
            </div>
            <div className="flex h-72 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/20 via-indigo-500/15 to-cyan-400/25">
              <ImageIcon size={72} className="text-cyan-200" />
            </div>
            <p className="mt-4 text-sm text-slate-300">This demo build still stores evidence references rather than binary uploads, but the evidence experience now behaves like a richer operations gallery.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailCard = ({ icon, title, copy }) => (
  <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">{icon}{title}</div>
    <p className="text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);

const formatTimestamp = (value) => value ? format(new Date(value), 'PPP p') : 'Not recorded yet';

const SignalCard = ({ icon, title, value, copy }) => (
  <div className="rounded-2xl border border-border bg-white/45 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">{icon}{title}</div>
    <p className="text-2xl font-semibold">{value}</p>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);

const InlineRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-300">{icon}{label}</div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);

