import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, CircleOff, Layers3, MapPin, Users } from 'lucide-react';
import { Card, Badge, Button, Input } from '../components/ui/Primitives';
import { approveBooking, getBookingSummary, getBookings, rejectBooking, cancelBooking } from '../lib/operationsApi';
import { useAuth } from '../context/AuthContext';
import { toBackendRole } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

export const AdminBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [rejectionDrafts, setRejectionDrafts] = useState({});
  const [filterMode, setFilterMode] = useState('ALL');

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

  const pendingBookings = useMemo(() => bookings.filter((item) => item.status === 'PENDING'), [bookings]);
  const cancellationRequests = useMemo(() => bookings.filter((item) => item.cancellationRequestedAt || item.cancellationRequestNote), [bookings]);

  const filteredBookings = useMemo(() => {
    if (filterMode === 'CANCELLATIONS') return cancellationRequests;
    return bookings;
  }, [bookings, cancellationRequests, filterMode]);

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

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module B admin view</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Booking Desk gives operations staff a clear approval queue and conflict-aware review surface.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls out booking management, optimized booking rules, and double-booking handling. This page now runs against the live backend approval workflow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-1 xl:grid-cols-4">
            <DeskMetric label="Pending review" value={`${summary?.pending ?? pendingBookings.length}`} />
            <DeskMetric label="Cancel Requests" value={`${summary?.cancellationRequests ?? cancellationRequests.length}`} variant="danger" />
            <DeskMetric label="Approved today" value={`${summary?.approved ?? 0}`} />
            <DeskMetric label="Rejected" value={`${summary?.rejected ?? 0}`} />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}
      {loading && <Card className="p-6 text-sm text-muted-foreground">Loading approval queue...</Card>}

      {!loading && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Approval queue</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode('ALL')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  filterMode === 'ALL' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('CANCELLATIONS')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  filterMode === 'CANCELLATIONS' ? 'bg-danger text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Cancellation Requests
                <Badge variant={cancellationRequests.length > 0 ? 'danger' : 'neutral'} className="h-5 min-w-5 px-1 bg-white/20">{cancellationRequests.length}</Badge>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const isPending = booking.status === 'PENDING';
              const isCancellationRequested = !!booking.cancellationRequestedAt || !!booking.cancellationRequestNote;

              return (
                <Card 
                  key={booking.id} 
                  className={cn(
                    "bg-white/70 p-6 dark:bg-white/5 transition-all",
                    isCancellationRequested && booking.status !== 'CANCELLED' ? "border-danger/30 ring-1 ring-danger/20 shadow-lg shadow-danger/5" : "border-border/60"
                  )}
                >
                  {isCancellationRequested && booking.status !== 'CANCELLED' && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                      Pending Cancellation Request
                    </div>
                  )}
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={booking.status === 'APPROVED' ? 'success' : booking.status === 'REJECTED' ? 'danger' : 'warning'}>
                          {booking.status}
                        </Badge>
                        <Badge variant="info">#{booking.id}</Badge>
                      </div>
                      <h3 className="text-xl font-semibold">{booking.resourceName}</h3>
                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <p className="flex items-center gap-2"><CalendarClock size={14} /> {format(new Date(booking.bookingDate), 'MMM d, yyyy')} · {booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}</p>
                        <p className="flex items-center gap-2"><Users size={14} /> {booking.attendees} attendees</p>
                        <p className="flex items-center gap-2"><MapPin size={14} /> {booking.resourceLocation}</p>
                        <p className="flex items-center gap-2"><Layers3 size={14} /> {booking.purpose}</p>
                      </div>

                      {isCancellationRequested && booking.status !== 'CANCELLED' && (
                        <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-4 dark:bg-danger/10">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-danger/80">User Cancellation Reason</p>
                          <p className="mt-2 text-sm leading-6 text-foreground font-medium italic underline underline-offset-4 decoration-danger/20">
                            "{booking.cancellationRequestNote || 'No reason provided.'}"
                          </p>
                        </div>
                      )}

                      {booking.rejectionReason && (
                        <div className="rounded-2xl border border-danger/15 bg-danger/6 px-4 py-3 text-sm text-danger">
                          <span className="font-semibold">Conflict note:</span> {booking.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 xl:min-w-64">
                      {isCancellationRequested && booking.status !== 'CANCELLED' ? (
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
                          <Button className="gap-2" isLoading={busyBookingId === booking.id} onClick={() => handleApprove(booking.id)}><CheckCircle2 size={16} /> Approve request</Button>
                          <Input
                            placeholder="Rejection reason if declining"
                            value={rejectionDrafts[booking.id] || ''}
                            onChange={(event) => setRejectionDrafts((current) => ({ ...current, [booking.id]: event.target.value }))}
                          />
                          <Button variant="outline" className="gap-2 text-danger border-danger/20 hover:bg-danger/10" isLoading={busyBookingId === booking.id} onClick={() => handleReject(booking.id)}><CircleOff size={16} /> Reject request</Button>
                        </>
                      ) : null}
                      
                      {!isPending && !isCancellationRequested ? (
                        <Button variant="ghost">View audit trail</Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

const DeskMetric = ({ label, value, variant }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className={cn("mt-3 text-3xl font-semibold", variant === 'danger' && "text-danger")}>{value}</p>
  </Card>
);
