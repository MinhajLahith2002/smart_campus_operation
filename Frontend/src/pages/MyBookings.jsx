import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { Calendar, Clock, MapPin, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { getBookings, getResources, cancelBooking } from '../lib/operationsApi';
import { useAuth } from '../context/AuthContext';
import { toBackendRole } from '../lib/moduleCApi';
import { cn } from '../lib/utils';

export const MyBookings = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [bookings, setBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);

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

  const filteredBookings = useMemo(() => bookings, [bookings]);

  const handleCancel = async (bookingId) => {
    try {
      setBusyBookingId(bookingId);
      await cancelBooking(bookingId, {
        actorId: user.id,
        actorName: user.name,
        actorRole: toBackendRole(user.role),
        note: 'Booking cancelled by requester.',
      });
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to cancel this booking.');
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="mt-1 text-muted-foreground">Track and manage your facility reservations.</p>
      </div>

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
          {filteredBookings.map((booking) => {
            const resource = resourceMap[String(booking.resourceId)];
            return (
              <Card key={booking.id} className="p-6">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {resource?.imageUrl ? <img src={resource.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-lg font-bold">{booking.resourceName}</h3>
                        <Badge variant={
                          booking.status === 'APPROVED' ? 'success' :
                          booking.status === 'PENDING' ? 'warning' :
                          booking.status === 'REJECTED' ? 'danger' : 'neutral'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} /> {format(new Date(booking.bookingDate), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} /> {booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} /> {booking.resourceLocation}
                        </div>
                        <div className="flex items-center gap-2">
                          <Info size={14} /> {booking.purpose}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:self-start">
                    {booking.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-danger/20 text-danger hover:bg-danger/10"
                        isLoading={busyBookingId === booking.id}
                        onClick={() => handleCancel(booking.id)}
                      >
                        <XCircle size={16} /> Cancel
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">View Details</Button>
                  </div>
                </div>

                {booking.rejectionReason && (
                  <div className="mt-4 rounded-xl border border-danger/10 bg-danger/5 p-3 text-sm text-danger">
                    <span className="font-bold">Rejection Reason:</span> {booking.rejectionReason}
                  </div>
                )}
              </Card>
            );
          })}

          {filteredBookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <p className="text-muted-foreground">No bookings found for this status.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
