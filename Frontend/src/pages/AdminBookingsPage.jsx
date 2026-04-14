import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, CircleOff, Layers3, MapPin, Users } from 'lucide-react';
import { Card, Badge, Button, Input } from '../components/ui/Primitives';
import { approveBooking, getBookingSummary, getBookings, rejectBooking } from '../lib/operationsApi';
import { useAuth } from '../context/AuthContext';
import { toBackendRole } from '../lib/moduleCApi';

export const AdminBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [rejectionDrafts, setRejectionDrafts] = useState({});

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
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <DeskMetric label="Pending review" value={`${summary?.pending ?? pendingBookings.length}`} />
            <DeskMetric label="Approved today" value={`${summary?.approved ?? 0}`} />
            <DeskMetric label="Rejected/conflict" value={`${summary?.rejected ?? 0}`} />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}
      {loading && <Card className="p-6 text-sm text-muted-foreground">Loading approval queue...</Card>}

      {!loading && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Approval queue</h2>
            <Badge variant="warning">{pendingBookings.length} waiting</Badge>
          </div>

          <div className="space-y-3">
            {bookings.map((booking) => {
              const isPending = booking.status === 'PENDING';

              return (
                <Card key={booking.id} className="bg-white/70 p-6 dark:bg-white/5">
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
                      {booking.rejectionReason && (
                        <div className="rounded-2xl border border-danger/15 bg-danger/6 px-4 py-3 text-sm text-danger">
                          <span className="font-semibold">Conflict note:</span> {booking.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 xl:min-w-64">
                      {isPending ? (
                        <>
                          <Button className="gap-2" isLoading={busyBookingId === booking.id} onClick={() => handleApprove(booking.id)}><CheckCircle2 size={16} /> Approve request</Button>
                          <Input
                            placeholder="Rejection reason if declining"
                            value={rejectionDrafts[booking.id] || ''}
                            onChange={(event) => setRejectionDrafts((current) => ({ ...current, [booking.id]: event.target.value }))}
                          />
                          <Button variant="outline" className="gap-2 text-danger border-danger/20 hover:bg-danger/10" isLoading={busyBookingId === booking.id} onClick={() => handleReject(booking.id)}><CircleOff size={16} /> Reject request</Button>
                        </>
                      ) : (
                        <Button variant="ghost">View audit trail</Button>
                      )}
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

const DeskMetric = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);
