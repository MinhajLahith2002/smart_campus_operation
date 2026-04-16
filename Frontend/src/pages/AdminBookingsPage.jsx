import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, CircleOff, Layers3, MapPin, Users } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { MOCK_BOOKINGS, MOCK_RESOURCES } from '../mockData';
import { getResources } from '../lib/moduleAApi';

export const AdminBookingsPage = () => {
  const [resources, setResources] = useState([]);
  const pendingBookings = MOCK_BOOKINGS.filter((item) => item.status === 'PENDING');
  const resourceLookup = useMemo(
    () => new Map((resources.length ? resources : MOCK_RESOURCES).map((resource) => [String(resource.id), resource])),
    [resources]
  );

  useEffect(() => {
    let ignore = false;

    const loadResources = async () => {
      try {
        const data = await getResources();
        if (!ignore) setResources(data);
      } catch (_) {
        if (!ignore) setResources([]);
      }
    };

    loadResources();
    return () => { ignore = true; };
  }, []);

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module B admin view</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Booking Desk gives operations staff a clear approval queue and conflict-aware review surface.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls out booking management, optimized booking rules, and double-booking handling. This page turns the sidebar item into a proper administrative review queue with decisions and policy cues.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <DeskMetric label="Pending review" value={`${pendingBookings.length}`} />
            <DeskMetric label="Approved today" value={`${MOCK_BOOKINGS.filter((item) => item.status === 'APPROVED').length}`} />
            <DeskMetric label="Rejected/conflict" value={`${MOCK_BOOKINGS.filter((item) => item.status === 'REJECTED').length}`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Approval queue</h2>
          <Badge variant="warning">{pendingBookings.length} waiting</Badge>
        </div>

        <div className="space-y-3">
          {MOCK_BOOKINGS.map((booking) => {
            const resource = resourceLookup.get(String(booking.resourceId));
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
                    <h3 className="text-xl font-semibold">{resource?.name}</h3>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-2"><CalendarClock size={14} /> {format(new Date(booking.date), 'MMM d, yyyy')} • {booking.startTime} - {booking.endTime}</p>
                      <p className="flex items-center gap-2"><Users size={14} /> {booking.attendees} attendees</p>
                      <p className="flex items-center gap-2"><MapPin size={14} /> {resource?.location}</p>
                      <p className="flex items-center gap-2"><Layers3 size={14} /> {booking.purpose}</p>
                    </div>
                    {booking.rejectionReason && (
                      <div className="rounded-2xl border border-danger/15 bg-danger/6 px-4 py-3 text-sm text-danger">
                        <span className="font-semibold">Conflict note:</span> {booking.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-52">
                    {isPending ? (
                      <>
                        <Button className="gap-2"><CheckCircle2 size={16} /> Approve request</Button>
                        <Button variant="outline" className="gap-2 text-danger border-danger/20 hover:bg-danger/10"><CircleOff size={16} /> Reject request</Button>
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
    </div>
  );
};

const DeskMetric = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);
