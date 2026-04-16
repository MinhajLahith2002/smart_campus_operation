import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { Calendar, Clock, Info, MapPin, Users, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { getBookings, getResources, cancelBooking, requestBookingCancellation } from '../lib/operationsApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toBackendRole } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

const statusConfig = {
  APPROVED: { badge: 'success', label: 'Approved' },
  PENDING: { badge: 'warning', label: 'Pending Review' },
  REJECTED: { badge: 'danger', label: 'Rejected' },
  CANCELLED: { badge: 'neutral', label: 'Cancelled' },
};

export const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [bookings, setBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [bookingData, resourceData] = await Promise.all([
        getBookings({ role: user.role, userId: user.id, status: filter }),
        getResources(),
      ]);
      setBookings(bookingData);
      setResourceMap(Object.fromEntries(resourceData.map((item) => [String(item.id), item])));
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, filter]);

  const metrics = useMemo(() => ({
    total: bookings.length,
    approved: bookings.filter((booking) => booking.status === 'APPROVED').length,
    pending: bookings.filter((booking) => booking.status === 'PENDING').length,
    outcomes: bookings.filter((booking) => ['REJECTED', 'CANCELLED'].includes(booking.status)).length,
  }), [bookings]);

  const isWithin24Hours = (createdAt) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMs = now - created;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours < 24;
  };

  const handleRequestCancellation = async (bookingId) => {
    const reason = window.prompt('Please provide a reason for cancellation (min 8 characters):', 'I no longer need this resource.');
    if (!reason) return;
    if (reason.length < 8) {
      setError('A cancellation reason of at least 8 characters is required.');
      return;
    }

    try {
      setBusyBookingId(bookingId);
      await requestBookingCancellation(bookingId, {
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        note: reason,
      });
      await loadData();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to send cancellation request.');
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Booking workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Track each reservation clearly, review the full booking context, and act without messy cards.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This view now separates booking identity, timing, location, and decision state more clearly so approved and rejected reservations do not feel crammed into one broken row.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total" value={`${metrics.total}`} />
            <MetricCard label="Approved" value={`${metrics.approved}`} />
            <MetricCard label="Pending" value={`${metrics.pending}`} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
              filter === status
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}
      {loading && <Card className="p-6 text-sm text-muted-foreground">Loading your bookings...</Card>}

      {!loading && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const resource = resourceMap[String(booking.resourceId)];
            const statusMeta = statusConfig[booking.status] || { badge: 'neutral', label: booking.status };
            return (
              <Card key={booking.id} className="overflow-hidden border-border/80 p-0">
                <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-muted">
                        {resource?.imageUrl ? <img src={resource.imageUrl} alt={booking.resourceName} className="h-full w-full object-cover" /> : null}
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-semibold tracking-tight">{booking.resourceName}</h3>
                          <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
                        </div>

                        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                          <InfoRow icon={<Calendar size={14} />} copy={format(new Date(booking.bookingDate), 'EEEE, MMMM d, yyyy')} />
                          <InfoRow icon={<Clock size={14} />} copy={`${booking.startTime.slice(0, 5)} - ${booking.endTime.slice(0, 5)}`} />
                          <InfoRow icon={<MapPin size={14} />} copy={booking.resourceLocation} />
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/45 px-4 py-4 dark:bg-white/5">
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Purpose</p>
                          <p className="mt-2 max-w-full break-all text-sm leading-7 text-foreground">{booking.purpose}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/70 bg-muted/35 p-6 xl:border-l xl:border-t-0 dark:bg-white/5">
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-white/55 px-4 py-4 dark:bg-white/5">
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Reservation summary</p>
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2"><Users size={14} /> {booking.attendees} attendee(s)</p>
                            <p className="flex items-center gap-2"><Info size={14} /> Booking #{booking.id}</p>
                          </div>
                        </div>

                        {booking.rejectionReason && (
                          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-danger">
                            <p className="font-semibold">Rejection reason</p>
                            <p className="mt-2 leading-7">{booking.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {booking.status === 'PENDING' && isWithin24Hours(booking.createdAt) && !booking.cancellationRequestedAt && (
                          <>
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => navigate(`/bookings/new?resourceId=${booking.resourceId}&editId=${booking.id}`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2 border-danger/20 text-danger hover:bg-danger/10"
                              isLoading={busyBookingId === booking.id}
                              onClick={() => handleRequestCancellation(booking.id)}
                            >
                              <XCircle size={16} /> Cancel Request
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" className="gap-2" onClick={() => setSelectedBooking(booking)}>View Details</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {bookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <p className="text-muted-foreground">No bookings found for this status.</p>
            </div>
          )}
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6" onClick={() => setSelectedBooking(null)}>
          <div className="w-full max-w-2xl rounded-[28px] border border-border bg-[var(--panel)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Booking detail</p>
                <h2 className="mt-2 text-2xl font-semibold">{selectedBooking.resourceName}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailTile title="Status" copy={selectedBooking.status} />
              <DetailTile title="Date" copy={format(new Date(selectedBooking.bookingDate), 'EEEE, MMMM d, yyyy')} />
              <DetailTile title="Time" copy={`${selectedBooking.startTime.slice(0, 5)} - ${selectedBooking.endTime.slice(0, 5)}`} />
              <DetailTile title="Location" copy={selectedBooking.resourceLocation} />
              <DetailTile title="Attendees" copy={`${selectedBooking.attendees} attendee(s)`} />
              <DetailTile title="Booking ID" copy={`#${selectedBooking.id}`} />
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-muted/45 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Purpose</p>
              <p className="mt-2 max-w-full break-all text-sm leading-7 text-foreground">{selectedBooking.purpose}</p>
            </div>

            {selectedBooking.rejectionReason && (
              <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-danger">
                <p className="font-semibold">Rejection reason</p>
                <p className="mt-2 leading-7">{selectedBooking.rejectionReason}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              {selectedBooking.status === 'PENDING' && isWithin24Hours(selectedBooking.createdAt) && !selectedBooking.cancellationRequestedAt && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate(`/bookings/new?resourceId=${selectedBooking.resourceId}&editId=${selectedBooking.id}`)}
                  >
                    Edit Request
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-danger/20 text-danger hover:bg-danger/10"
                    isLoading={busyBookingId === selectedBooking.id}
                    onClick={() => handleRequestCancellation(selectedBooking.id)}
                  >
                    <XCircle size={16} /> Cancel Request
                  </Button>
                </>
              )}
              <Button onClick={() => setSelectedBooking(null)}>Close</Button>
            </div>
          </div>
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

const InfoRow = ({ icon, copy }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {icon}
    <span>{copy}</span>
  </div>
);

const DetailTile = ({ title, copy }) => (
  <div className="rounded-2xl border border-border bg-muted/45 px-4 py-4 dark:bg-white/5">
    <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
    <p className="mt-2 text-sm leading-7 text-foreground">{copy}</p>
  </div>
);

