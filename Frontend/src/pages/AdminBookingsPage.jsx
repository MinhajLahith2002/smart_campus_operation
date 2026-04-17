import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, CircleOff, History, MapPin, Users, X } from 'lucide-react';
import { Card, Badge, Button, Input } from '../components/ui/Primitives';
import { approveBooking, cancelBooking, getBooking, getBookingSummary, getBookings, rejectBooking } from '../lib/operationsApi';
import { useAuth } from '../context/AuthContext';
import { toBackendRole } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

const statusTabs = ['ALL', 'PENDING', 'APPROVED', 'CANCELLATIONS', 'REJECTED', 'CANCELLED'];

export const AdminBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [auditLoadingId, setAuditLoadingId] = useState(null);
  const [rejectionDrafts, setRejectionDrafts] = useState({});
  const [filterMode, setFilterMode] = useState('ALL');
  const [auditBooking, setAuditBooking] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingData, summaryData] = await Promise.all([
        getBookings({ role: 'ADMIN' }),
        getBookingSummary(),
      ]);
      setBookings(bookingData);
      setSummary(summaryData);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load booking desk data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cancellationRequests = useMemo(
    () => bookings.filter((item) => (item.cancellationRequestedAt || item.cancellationRequestNote) && item.status !== 'CANCELLED'),
    [bookings],
  );

  const groupedBookings = useMemo(() => {
    const pending = bookings.filter((item) => item.status === 'PENDING' && !item.cancellationRequestedAt && !item.cancellationRequestNote);
    const approved = bookings.filter((item) => item.status === 'APPROVED' && !item.cancellationRequestedAt && !item.cancellationRequestNote);
    const rejected = bookings.filter((item) => item.status === 'REJECTED');
    const cancelled = bookings.filter((item) => item.status === 'CANCELLED');

    return {
      active: [...pending, ...approved],
      pending,
      approved,
      cancellations: cancellationRequests,
      rejected,
      cancelled,
    };
  }, [bookings, cancellationRequests]);

  const visibleGroups = useMemo(() => {
    if (filterMode === 'PENDING') return { active: groupedBookings.pending, cancellations: [], rejected: [], cancelled: [] };
    if (filterMode === 'APPROVED') return { active: groupedBookings.approved, cancellations: [], rejected: [], cancelled: [] };
    if (filterMode === 'CANCELLATIONS') return { active: [], cancellations: groupedBookings.cancellations, rejected: [], cancelled: [] };
    if (filterMode === 'REJECTED') return { active: [], cancellations: [], rejected: groupedBookings.rejected, cancelled: [] };
    if (filterMode === 'CANCELLED') return { active: [], cancellations: [], rejected: [], cancelled: groupedBookings.cancelled };
    return {
      active: groupedBookings.active,
      cancellations: groupedBookings.cancellations,
      rejected: groupedBookings.rejected,
      cancelled: groupedBookings.cancelled,
    };
  }, [filterMode, groupedBookings]);

  const adminActor = {
    actorId: user?.id,
    actorName: user?.name,
    actorRole: toBackendRole(user?.role),
  };

  const handleApprove = async (bookingId) => {
    try {
      setBusyBookingId(bookingId);
      await approveBooking(bookingId, { ...adminActor, note: 'Approved from booking desk.' });
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to approve this request.');
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleReject = async (bookingId) => {
    try {
      const note = rejectionDrafts[bookingId]?.trim() || 'Rejected by operations after policy review.';
      setBusyBookingId(bookingId);
      await rejectBooking(bookingId, { ...adminActor, note });
      setRejectionDrafts((current) => ({ ...current, [bookingId]: '' }));
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to reject this request.');
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleConfirmCancel = async (bookingId) => {
    try {
      setBusyBookingId(bookingId);
      await cancelBooking(bookingId, { ...adminActor, note: 'Cancellation request approved by admin.' });
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to confirm cancellation.');
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleOpenAuditTrail = async (bookingId) => {
    try {
      setAuditLoadingId(bookingId);
      const detail = await getBooking(bookingId);
      setAuditBooking(detail);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load the booking audit trail.');
    } finally {
      setAuditLoadingId(null);
    }
  };

  const metrics = {
    pending: summary?.pending ?? groupedBookings.pending.length,
    cancellationRequests: summary?.cancellationRequests ?? groupedBookings.cancellations.length,
    approved: summary?.approved ?? groupedBookings.approved.length,
    rejected: summary?.rejected ?? groupedBookings.rejected.length,
    cancelled: groupedBookings.cancelled.length,
  };

  const visibleCount = visibleGroups.active.length + visibleGroups.cancellations.length + visibleGroups.rejected.length + visibleGroups.cancelled.length;

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Booking desk admin view</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Keep the approval desk focused on live booking work, while cancelled and rejected outcomes stay in their own review areas.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Pending approvals, approved bookings, cancellation requests, rejected requests, and cancelled records are now separated so the admin does not review mixed statuses in one queue.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
            <DeskMetric label="Pending review" value={`${metrics.pending}`} />
            <DeskMetric label="Cancel requests" value={`${metrics.cancellationRequests}`} variant="danger" />
            <DeskMetric label="Approved" value={`${metrics.approved}`} />
            <DeskMetric label="Rejected" value={`${metrics.rejected}`} />
            <DeskMetric label="Cancelled" value={`${metrics.cancelled}`} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {statusTabs.map((status) => (
          <button
            key={status}
            onClick={() => setFilterMode(status)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
              filterMode === status
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            {status === 'ALL' ? 'All' : status === 'CANCELLATIONS' ? 'Cancellation Requests' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}
      {loading && <Card className="p-6 text-sm text-muted-foreground">Loading booking desk...</Card>}

      {!loading && (
        <div className="space-y-8">
          {(filterMode === 'ALL' || filterMode === 'PENDING' || filterMode === 'APPROVED') && (
            <BookingSection
              title="Live booking queue"
              badge={`Active (${visibleGroups.active.length})`}
              copy="Only pending and approved bookings remain here, so the main desk stays focused on live operational work."
              bookings={visibleGroups.active}
              emptyCopy="No active bookings found for this filter."
              renderBookingCard={(booking) => (
                <BookingCard
                  booking={booking}
                  busyBookingId={busyBookingId}
                  auditLoadingId={auditLoadingId}
                  rejectionDrafts={rejectionDrafts}
                  setRejectionDrafts={setRejectionDrafts}
                  handleApprove={handleApprove}
                  handleReject={handleReject}
                  handleConfirmCancel={handleConfirmCancel}
                  handleOpenAuditTrail={handleOpenAuditTrail}
                />
              )}
            />
          )}

          {(filterMode === 'ALL' || filterMode === 'CANCELLATIONS') && (
            <BookingSection
              title="Cancellation requests"
              badge={`Requests (${visibleGroups.cancellations.length})`}
              copy="User cancellation requests are isolated here for fast decision-making without cluttering the live approval desk."
              bookings={visibleGroups.cancellations}
              emptyCopy="No cancellation requests found."
              renderBookingCard={(booking) => (
                <BookingCard
                  booking={booking}
                  busyBookingId={busyBookingId}
                  auditLoadingId={auditLoadingId}
                  rejectionDrafts={rejectionDrafts}
                  setRejectionDrafts={setRejectionDrafts}
                  handleApprove={handleApprove}
                  handleReject={handleReject}
                  handleConfirmCancel={handleConfirmCancel}
                  handleOpenAuditTrail={handleOpenAuditTrail}
                />
              )}
            />
          )}

          {(filterMode === 'ALL' || filterMode === 'REJECTED') && (
            <BookingSection
              title="Rejected requests"
              badge={`Rejected (${visibleGroups.rejected.length})`}
              copy="Rejected requests stay archived here instead of mixing with the live booking workflow."
              bookings={visibleGroups.rejected}
              emptyCopy="No rejected bookings found."
              renderBookingCard={(booking) => (
                <BookingCard
                  booking={booking}
                  busyBookingId={busyBookingId}
                  auditLoadingId={auditLoadingId}
                  rejectionDrafts={rejectionDrafts}
                  setRejectionDrafts={setRejectionDrafts}
                  handleApprove={handleApprove}
                  handleReject={handleReject}
                  handleConfirmCancel={handleConfirmCancel}
                  handleOpenAuditTrail={handleOpenAuditTrail}
                />
              )}
            />
          )}

          {(filterMode === 'ALL' || filterMode === 'CANCELLED') && (
            <BookingSection
              title="Cancelled bookings"
              badge={`Cancelled (${visibleGroups.cancelled.length})`}
              copy="Confirmed cancellations are stored separately so the admin can review outcomes without crowding the active desk."
              bookings={visibleGroups.cancelled}
              emptyCopy="No cancelled bookings found."
              renderBookingCard={(booking) => (
                <BookingCard
                  booking={booking}
                  busyBookingId={busyBookingId}
                  auditLoadingId={auditLoadingId}
                  rejectionDrafts={rejectionDrafts}
                  setRejectionDrafts={setRejectionDrafts}
                  handleApprove={handleApprove}
                  handleReject={handleReject}
                  handleConfirmCancel={handleConfirmCancel}
                  handleOpenAuditTrail={handleOpenAuditTrail}
                />
              )}
            />
          )}

          {visibleCount === 0 && filterMode !== 'ALL' && (
            <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <p className="text-muted-foreground">No bookings found for this filter.</p>
            </div>
          )}
        </div>
      )}

      {auditBooking && <AuditTrailModal booking={auditBooking} onClose={() => setAuditBooking(null)} />}
    </div>
  );
};

const BookingCard = ({
  booking,
  busyBookingId,
  auditLoadingId,
  rejectionDrafts,
  setRejectionDrafts,
  handleApprove,
  handleReject,
  handleConfirmCancel,
  handleOpenAuditTrail,
}) => {
  const isPending = booking.status === 'PENDING';
  const isApproved = booking.status === 'APPROVED';
  const isRejected = booking.status === 'REJECTED';
  const isCancelled = booking.status === 'CANCELLED';
  const isCancellationRequested = (!!booking.cancellationRequestedAt || !!booking.cancellationRequestNote) && !isCancelled;

  return (
    <Card
      key={booking.id}
      className={cn(
        'bg-white/70 p-6 dark:bg-white/5 transition-all border-border/60',
        isCancellationRequested && 'border-danger/30 ring-1 ring-danger/20 shadow-lg shadow-danger/5'
      )}
    >
      {isCancellationRequested && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
          <div className="h-2 w-2 animate-pulse rounded-full bg-danger" />
          Pending Cancellation Request
        </div>
      )}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isApproved ? 'success' : isRejected ? 'danger' : isCancelled ? 'neutral' : 'warning'}>
              {booking.status}
            </Badge>
            <Badge variant="info">#{booking.id}</Badge>
          </div>
          <h3 className="text-xl font-semibold">{booking.resourceName}</h3>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-2"><CalendarClock size={14} /> {format(new Date(booking.bookingDate), 'MMM d, yyyy')} · {booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}</p>
            <p className="flex items-center gap-2"><Users size={14} /> {booking.attendees} attendees</p>
            <p className="flex items-center gap-2"><MapPin size={14} /> {booking.resourceLocation}</p>
          </div>

          {isCancellationRequested && (
            <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-4 dark:bg-danger/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-danger/80">User Cancellation Reason</p>
              <p className="mt-2 text-sm leading-6 text-foreground font-medium italic">"{booking.cancellationRequestNote || 'No reason provided.'}"</p>
            </div>
          )}

          {booking.rejectionReason && (
            <div className="rounded-2xl border border-danger/15 bg-danger/6 px-4 py-3 text-sm text-danger">
              <span className="font-semibold">Conflict note:</span> {booking.rejectionReason}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 xl:min-w-64">
          {isCancellationRequested ? (
            <Button
              className="gap-2 bg-danger hover:bg-danger/90 text-white border-transparent"
              isLoading={busyBookingId === booking.id}
              onClick={() => handleConfirmCancel(booking.id)}
            >
              <CircleOff size={16} /> Confirm Cancellation
            </Button>
          ) : null}

          {isPending && !isCancellationRequested ? (
            <>
              <Button className="gap-2" isLoading={busyBookingId === booking.id} onClick={() => handleApprove(booking.id)}><CheckCircle2 size={16} /> Approve Request</Button>
              <Input
                placeholder="Rejection reason if declining"
                value={rejectionDrafts[booking.id] || ''}
                onChange={(event) => setRejectionDrafts((current) => ({ ...current, [booking.id]: event.target.value }))}
              />
              <Button variant="outline" className="gap-2 text-danger border-danger/20 hover:bg-danger/10" isLoading={busyBookingId === booking.id} onClick={() => handleReject(booking.id)}><CircleOff size={16} /> Reject Request</Button>
            </>
          ) : null}

          {!isPending || isCancellationRequested ? (
            <Button variant="ghost" className="gap-2" isLoading={auditLoadingId === booking.id} onClick={() => handleOpenAuditTrail(booking.id)}>
              {auditLoadingId !== booking.id && <History size={16} />} View Audit Trail
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const BookingSection = ({ title, badge, copy, bookings, emptyCopy, renderBookingCard }) => (
  <section className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      </div>
      <Badge variant="info">{badge}</Badge>
    </div>

    <div className="space-y-4">
      {bookings.map(renderBookingCard)}
      {bookings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">{emptyCopy}</p>
        </div>
      )}
    </div>
  </section>
);

const DeskMetric = ({ label, value, variant }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className={cn('mt-3 text-3xl font-semibold', variant === 'danger' && 'text-danger')}>{value}</p>
  </Card>
);

const AuditTrailModal = ({ booking, onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
    <Card className="relative w-full max-w-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border p-6">
        <div>
          <h3 className="text-xl font-semibold">Booking Audit Trail</h3>
          <p className="mt-1 text-sm text-muted-foreground">Historical activity for #{booking.id} - {booking.resourceName}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-6">
        <div className="relative space-y-8 before:absolute before:left-3.5 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border">
          {booking.activities?.length > 0 ? (
            booking.activities.map((activity, index) => (
              <div key={activity.id} className="relative pl-10">
                <div className={cn(
                  'absolute left-0 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900',
                  index === 0 ? 'border-primary ring-4 ring-primary/10' : 'border-border'
                )}>
                  <div className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-foreground">{activity.action.replace(/_/g, ' ')}</span>
                    <Badge variant="neutral" className="px-1.5 py-0.5 text-[10px]">{activity.actorRole}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.detail}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60">
                    <span className="text-foreground/80">{activity.actorName}</span>
                    <span>·</span>
                    <span>{format(new Date(activity.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No historical activities recorded for this booking yet.</p>
              <p className="mt-2 text-xs text-muted-foreground/60 italic">A full audit record will appear here after booking actions are stored.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 p-4 flex justify-end">
        <Button onClick={onClose}>Close Trail</Button>
      </div>
    </Card>
  </div>
);
