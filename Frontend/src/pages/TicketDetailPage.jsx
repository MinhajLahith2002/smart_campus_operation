import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Image as ImageIcon, MapPin, MessageSquare, Paperclip, Pencil, PhoneCall, ShieldAlert, Trash2, UserRoundCog, Wrench, X } from 'lucide-react';
import { Badge, Button, Card, Input } from '../components/ui/Primitives';
import { addComment, assignTechnician, closeTicket, deleteComment, getTicket, reopenTicket, toBackendRole, updateComment, updateTicketStatus } from '../lib/moduleCApi';
import { useAuth } from '../context/AuthContext';

export const TicketDetailPage = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err.message || 'Unable to load the ticket case file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTicket(); }, [ticketId]);

  const isReporter = ticket && user?.id === ticket.reporterId;
  const isAdmin = user?.role === 'ADMIN';
  const isTechnician = user?.role === 'TECHNICIAN' && user?.id === ticket?.assignedTechnicianId;
  const canComment = ticket && ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(ticket.status) && (isReporter || isAdmin || isTechnician);

  const timeline = useMemo(() => {
    if (!ticket) return [];
    if (ticket.status === 'REJECTED') {
      return [
        { key: 'OPEN', title: 'Open', active: true },
        { key: 'REJECTED', title: 'Rejected', active: true, danger: true },
      ];
    }
    return [
      { key: 'OPEN', title: 'Open', active: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(ticket.status) },
      { key: 'IN_PROGRESS', title: 'In Progress', active: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(ticket.status) },
      { key: 'RESOLVED', title: 'Resolved', active: ['RESOLVED', 'CLOSED'].includes(ticket.status) },
      { key: 'CLOSED', title: 'Closed', active: ticket.status === 'CLOSED' },
    ];
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

  const handleConfirmFixed = () => runAction('close', () => closeTicket(ticket.id, {
    actorId: user.id,
    actorName: user.name,
    actorRole: toBackendRole(user.role),
    note: 'Reporter confirmed the fix and closed the ticket.',
  }));

  const handleStillBroken = () => {
    const note = window.prompt('Describe what is still broken', 'The issue still persists after the reported fix.');
    if (!note) return;
    runAction('reopen', () => reopenTicket(ticket.id, {
      actorId: user.id,
      actorName: user.name,
      actorRole: toBackendRole(user.role),
      note,
    }));
  };

  const handleTechnicianProgress = (status) => runAction(status, () => updateTicketStatus(ticket.id, {
    status,
    resolutionNotes: status === 'RESOLVED' ? (window.prompt('Resolution notes', ticket.resolutionNotes || 'Issue resolved after inspection and corrective work.') || '') : ticket.resolutionNotes || '',
    actorId: user.id,
    actorName: user.name,
    actorRole: toBackendRole(user.role),
    detail: status === 'IN_PROGRESS' ? 'Technician began active work on this ticket.' : 'Technician marked the ticket resolved with a resolution note.',
  }));

  const handleAdminAssign = () => {
    const technicianId = window.prompt('Technician ID', ticket.assignedTechnicianId || 'tech-17');
    if (!technicianId) return;
    const technicianName = window.prompt('Technician name', ticket.assignedTechnicianName || 'Kasun Silva');
    if (!technicianName) return;
    runAction('assign', () => assignTechnician(ticket.id, {
      technicianId,
      technicianName,
      actorId: user.id,
      actorName: user.name,
      actorRole: toBackendRole(user.role),
    }));
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
            <div className="eyebrow mb-4">Module C case file</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{ticket.priority} priority</Badge>
              <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'OPEN' ? 'warning' : ticket.status === 'REJECTED' ? 'danger' : 'success'}>{ticket.status.replace('_', ' ')}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{ticket.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{ticket.description}</p>
          </div>

          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ticket header</p>
            <h2 className="mt-2 text-2xl font-semibold">TK-{ticket.id}</h2>
            <div className="mt-5 grid gap-3">
              <InlineRow icon={<MapPin size={14} />} label="Location" value={ticket.resourceLocation || 'Unknown'} />
              <InlineRow icon={<Wrench size={14} />} label="Assignee" value={ticket.assignedTechnicianName || 'Unassigned'} />
              <InlineRow icon={<Clock3 size={14} />} label="Age" value={formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} />
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
              <DetailCard icon={<PhoneCall size={16} className="text-primary" />} title="Preferred contact" copy={ticket.preferredContact || 'Not provided'} />
              <DetailCard icon={<UserRoundCog size={16} className="text-primary" />} title="Assigned technician" copy={ticket.assignedTechnicianName || ticket.assignedTechnicianId || 'Unassigned'} />
              <DetailCard icon={<Paperclip size={16} className="text-primary" />} title="Evidence references" copy={ticket.evidenceLabels?.length ? `${ticket.evidenceLabels.length} item(s)` : ticket.evidenceNotes || 'No evidence reference supplied.'} />
              <DetailCard icon={<AlertTriangle size={16} className="text-primary" />} title="Reported on" copy={format(new Date(ticket.createdAt), 'PPP p')} />
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
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button className="gap-2" onClick={submitComment} isLoading={busyAction === 'add-comment' || busyAction === 'edit-comment'} disabled={!canComment || !commentDraft.trim()}>
                    {editingCommentId ? 'Save Comment' : 'Post Comment'}
                  </Button>
                  {editingCommentId && <Button variant="outline" onClick={() => { setEditingCommentId(null); setCommentDraft(''); }}>Cancel Edit</Button>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><ShieldAlert size={18} className="text-primary" /> Activity trail</div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {ticket.activities?.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
                  <p className="font-semibold text-foreground">{activity.action.replace('_', ' ')}</p>
                  <p className="mt-1">{activity.detail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em]">{activity.actorName} · {activity.actorRole}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold"><Wrench size={18} className="text-primary" /> Lifecycle</div>
            <div className="space-y-3">
              {timeline.map((step, index) => (
                <div key={step.key} className={`rounded-2xl border px-4 py-4 ${step.active ? step.danger ? 'border-danger/30 bg-danger/5' : 'border-primary/20 bg-white/50 dark:bg-white/5' : 'border-border bg-muted/40 dark:bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${step.active ? step.danger ? 'bg-danger text-white' : 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.active ? 'Reached in current workflow' : 'Pending step'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Role actions</div>
            <div className="space-y-3">
              {isReporter && ticket.status === 'RESOLVED' && (
                <>
                  <Button className="w-full gap-2" isLoading={busyAction === 'close'} onClick={handleConfirmFixed}>Confirm Fixed</Button>
                  <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'reopen'} onClick={handleStillBroken}>Report Still Broken</Button>
                </>
              )}
              {isAdmin && (
                <>
                  <Button className="w-full gap-2" isLoading={busyAction === 'assign'} onClick={handleAdminAssign}>Assign Technician</Button>
                  {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
                    <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'admin-progress'} onClick={() => runAction('admin-progress', () => updateTicketStatus(ticket.id, {
                      status: ticket.status === 'IN_PROGRESS' ? 'RESOLVED' : 'IN_PROGRESS',
                      resolutionNotes: ticket.status === 'IN_PROGRESS' ? (window.prompt('Resolution notes', ticket.resolutionNotes || 'Issue fixed and tested successfully.') || '') : ticket.resolutionNotes || '',
                      actorId: user.id,
                      actorName: user.name,
                      actorRole: toBackendRole(user.role),
                      detail: ticket.status === 'IN_PROGRESS' ? 'Admin resolved the ticket after reviewing work.' : 'Admin moved the ticket into active progress.',
                    }))}>
                      {ticket.status === 'IN_PROGRESS' ? 'Mark Resolved' : 'Move To In Progress'}
                    </Button>
                  )}
                </>
              )}
              {isTechnician && (
                <>
                  {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && <Button className="w-full gap-2" isLoading={busyAction === 'IN_PROGRESS'} onClick={() => handleTechnicianProgress('IN_PROGRESS')}>Start Work</Button>}
                  {ticket.status === 'IN_PROGRESS' && <Button variant="outline" className="w-full gap-2" isLoading={busyAction === 'RESOLVED'} onClick={() => handleTechnicianProgress('RESOLVED')}>Mark Resolved</Button>}
                </>
              )}
              {!isReporter && !isAdmin && !isTechnician && <p className="text-sm text-muted-foreground">This case is visible, but no workflow actions are available for your current role.</p>}
            </div>
          </Card>
        </div>
      </div>

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
            <p className="mt-4 text-sm text-slate-300">This demo build stores evidence references instead of binary uploads, but the gallery and preview behavior are now represented in the Module C UI.</p>
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

const InlineRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-300">{icon}{label}</div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);
