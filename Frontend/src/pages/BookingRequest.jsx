import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MOCK_RESOURCES } from '../mockData';
import { Card, Button, Input, Badge } from '../components/ui/Primitives';
import { Calendar, Clock, Users, Info, ArrowLeft, CheckCircle2, MapPin, ShieldCheck, ClipboardList, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export const BookingRequest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resourceId = searchParams.get('resourceId');
  const resource = MOCK_RESOURCES.find(r => r.id === resourceId);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    purpose: '',
    attendees: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!resource) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Resource not found</h2>
        <Button variant="ghost" onClick={() => navigate('/catalogue')} className="mt-4">
          Back to Catalogue
        </Button>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="mb-4 text-3xl font-semibold">Booking requested successfully</h2>
        <p className="mb-8 text-muted-foreground">
          Your request for <strong>{resource.name}</strong> has been submitted and is pending approval.
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate('/bookings/my')}>
            View My Bookings
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Booking workflow</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Submit a booking request with policy and resource context visible the whole way through.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This flow is redesigned around the handover idea of approval-aware requests. The form keeps the asset summary, operational rules, and approval journey close to the input fields.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Resource snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold">{resource.name}</h2>
            <div className="mt-5 grid gap-3">
              <InlineMetric icon={<MapPin size={14} />} label="Location" value={resource.location} />
              <InlineMetric icon={<Users size={14} />} label="Capacity" value={`${resource.capacity} attendees`} />
              <InlineMetric icon={<Clock size={14} />} label="Available window" value={`${resource.availableFrom} - ${resource.availableTo}`} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/70 p-8 dark:bg-white/5">
            <h2 className="mb-6 text-2xl font-semibold">Request details</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar size={16} className="text-primary" /> Date
                  </label>
                  <Input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Users size={16} className="text-primary" /> Expected Attendees
                  </label>
                  <Input 
                    type="number" 
                    min="1" 
                    max={resource.capacity}
                    value={formData.attendees}
                    onChange={e => setFormData({...formData, attendees: parseInt(e.target.value)})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} className="text-primary" /> Start Time
                  </label>
                  <Input 
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} className="text-primary" /> End Time
                  </label>
                  <Input 
                    type="time" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Purpose of Booking</label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                  placeholder="Describe the event or activity..."
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value})}
                  required
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/60 px-4 py-4 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Approval note</p>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      Requests are reviewed against availability, timing policy, and campus priorities. Clear purpose details help approvers move faster.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full py-6 text-lg gap-2" isLoading={isSubmitting}>
                  Submit Booking Request
                  {!isSubmitting && <ArrowRight size={18} />}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0 bg-white/70 dark:bg-white/5">
            <img src={resource.imageUrl} alt="" className="w-full h-40 object-cover" />
            <div className="p-6">
              <Badge variant="info" className="mb-2">{resource.type.replace('_', ' ')}</Badge>
              <h3 className="mb-2 text-xl font-semibold">{resource.name}</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin size={16} /> {resource.location}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} /> Max Capacity: {resource.capacity}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} /> Available: {resource.availableFrom} - {resource.availableTo}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Info size={18} className="text-primary" />
              Booking Rules
            </div>
            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
              <li>Requests must be submitted at least 24 hours in advance.</li>
              <li>Cancellations are allowed up to 2 hours before the start time.</li>
              <li>Users are responsible for the equipment and cleanliness of the facility.</li>
              <li>Approval is subject to availability and campus priorities.</li>
            </ul>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <ClipboardList size={18} className="text-secondary-accent" />
              Approval Journey
            </div>
            <div className="space-y-3">
              <JourneyStep title="1. Submission received" copy="Your request enters the booking queue with resource and timing details." />
              <JourneyStep title="2. Availability review" copy="Operations check conflicts, capacity, and booking policy compliance." />
              <JourneyStep title="3. Status notification" copy="You receive approval, rejection, or follow-up through the notifications flow." />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const InlineMetric = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {icon}
      {label}
    </div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);

const JourneyStep = ({ title, copy }) => (
  <div className="rounded-2xl border border-border bg-white/35 px-4 py-4 dark:bg-white/5">
    <p className="text-sm font-semibold">{title}</p>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);
