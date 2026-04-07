import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock3, MapPin, ShieldAlert, UserRoundCog, Wrench } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { MOCK_RESOURCES, MOCK_TICKETS } from '../mockData';
import { useAuth } from '../context/AuthContext';

export const AdminTicketsPage = () => {
  const { user } = useAuth();
  const myAssignments = MOCK_TICKETS.filter((item) => item.assignedTo === user?.id);

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C operations view</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Incident Desk helps technicians and admins triage maintenance load, urgency, and assignment ownership.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover treats maintenance and incident ticketing as a separate functional module. This desk turns the sidebar route into an actionable queue with priority, ownership, and asset context.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <DeskMetric label="Open issues" value={`${MOCK_TICKETS.filter((item) => item.status === 'OPEN').length}`} />
            <DeskMetric label="In progress" value={`${MOCK_TICKETS.filter((item) => item.status === 'IN_PROGRESS').length}`} />
            <DeskMetric label="Assigned to you" value={`${myAssignments.length}`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Incident queue</h2>
          <Badge variant="danger">High priority monitored</Badge>
        </div>

        <div className="space-y-3">
          {MOCK_TICKETS.map((ticket) => {
            const resource = MOCK_RESOURCES.find((item) => item.id === ticket.resourceId);

            return (
              <Card key={ticket.id} className="bg-white/70 p-6 dark:bg-white/5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ticket.priority === 'HIGH' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                        {ticket.priority} priority
                      </Badge>
                      <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'OPEN' ? 'warning' : 'success'}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold">{ticket.description}</h3>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-2"><MapPin size={14} /> {resource?.name} • {resource?.location}</p>
                      <p className="flex items-center gap-2"><Clock3 size={14} /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                      <p className="flex items-center gap-2"><AlertTriangle size={14} /> Category: {ticket.category}</p>
                      <p className="flex items-center gap-2"><UserRoundCog size={14} /> Assigned: {ticket.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5">
                      Preferred contact: {ticket.preferredContact}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-52">
                    <Button className="gap-2"><Wrench size={16} /> Update status</Button>
                    <Button variant="outline" className="gap-2"><ShieldAlert size={16} /> Assign technician</Button>
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
