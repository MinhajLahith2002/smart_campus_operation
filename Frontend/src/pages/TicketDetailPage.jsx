import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowLeft, Clock3, MapPin, Paperclip, PhoneCall, ShieldAlert, UserRoundCog, Wrench } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui/Primitives';
import { getTicket } from '../lib/moduleCApi';

export const TicketDetailPage = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadTicket = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getTicket(ticketId);
        if (!ignore) {
          setTicket(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Unable to load the ticket case file.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadTicket();

    return () => {
      ignore = true;
    };
  }, [ticketId]);

  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground">Loading case file...</Card>;
  }

  if (error || !ticket) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'The requested ticket could not be loaded.'}</p>
        <Button variant="ghost" onClick={() => navigate('/tickets/my')} className="mt-4">
          Back to tickets
        </Button>
      </div>
    );
  }

  const timeline = [
    {
      title: 'Ticket received',
      copy: `Incident captured on ${format(new Date(ticket.createdAt), 'MMM d, yyyy')}.`,
    },
    {
      title: ticket.assignedTechnicianId ? 'Technician assignment visible' : 'Awaiting assignment',
      copy: ticket.assignedTechnicianId ? `Current owner: ${ticket.assignedTechnicianName || ticket.assignedTechnicianId}.` : 'The incident desk has not yet attached a technician owner.',
    },
    {
      title: ticket.status === 'IN_PROGRESS' ? 'Diagnosis underway' : 'Next action pending',
      copy: ticket.resolutionNotes || 'No technical resolution note has been entered yet.',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C case file</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                {ticket.priority} priority
              </Badge>
              <Badge variant={ticket.status === 'IN_PROGRESS' ? 'info' : ticket.status === 'OPEN' ? 'warning' : 'success'}>
                {ticket.status.replace('_', ' ')}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{ticket.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{ticket.description}</p>
          </div>

          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Asset snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold">{ticket.resourceName}</h2>
            <div className="mt-5 grid gap-3">
              <InlineRow icon={<MapPin size={14} />} label="Location" value={ticket.resourceLocation || 'Unknown'} />
              <InlineRow icon={<Wrench size={14} />} label="Category" value={ticket.category} />
              <InlineRow icon={<Clock3 size={14} />} label="Age" value={formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <h2 className="text-xl font-semibold">Operational details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailCard icon={<PhoneCall size={16} className="text-primary" />} title="Preferred contact" copy={ticket.preferredContact || 'Not provided'} />
              <DetailCard icon={<UserRoundCog size={16} className="text-primary" />} title="Assigned technician" copy={ticket.assignedTechnicianName || ticket.assignedTechnicianId || 'Unassigned'} />
              <DetailCard icon={<Paperclip size={16} className="text-primary" />} title="Evidence references" copy={ticket.evidenceLabels?.length ? ticket.evidenceLabels.join(', ') : ticket.evidenceNotes || 'No evidence reference supplied.'} />
              <DetailCard icon={<AlertTriangle size={16} className="text-primary" />} title="Reported on" copy={format(new Date(ticket.createdAt), 'PPP p')} />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <ShieldAlert size={18} className="text-primary" /> Resolution and next step
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              {ticket.resolutionNotes || 'No resolution note exists yet. The case is waiting for the first diagnosis or assignment update from the incident desk.'}
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <Wrench size={18} className="text-primary" /> Case progress
            </div>
            <div className="space-y-3">
              {timeline.map((step) => (
                <div key={step.title} className="rounded-2xl border border-border bg-white/35 px-4 py-4 dark:bg-white/5">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.copy}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-3 text-sm font-semibold">Activity trail</div>
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
      </div>
    </div>
  );
};

const DetailCard = ({ icon, title, copy }) => (
  <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
    <div className="mb-2 flex items-center gap-2 font-semibold">
      {icon}
      {title}
    </div>
    <p className="text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);

const InlineRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {icon}
      {label}
    </div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);
