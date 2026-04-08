import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_RESOURCES } from '../mockData';
import { Button, Card, Input } from '../components/ui/Primitives';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { createTicket, toBackendRole } from '../lib/moduleCApi';
import { useAuth } from '../context/AuthContext';

const categories = ['EQUIPMENT', 'FACILITY', 'NETWORK', 'SAFETY', 'OTHER'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ReportIssuePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    resourceId: MOCK_RESOURCES[0]?.id || '',
    category: 'EQUIPMENT',
    priority: 'MEDIUM',
    description: '',
    preferredContact: user?.email || '',
    operationalImpact: '',
    evidenceReference: '',
  });

  const selectedResource = MOCK_RESOURCES.find((resource) => resource.id === formData.resourceId);

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !selectedResource) {
      setError('A signed-in user and valid resource are required to submit a ticket.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createTicket({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        reporterId: user.id,
        reporterName: user.name,
        reporterEmail: user.email,
        reporterRole: toBackendRole(user.role),
        resourceName: selectedResource.name,
        resourceLocation: selectedResource.location,
        resourceType: selectedResource.type,
        preferredContact: formData.preferredContact,
        operationalImpact: formData.operationalImpact,
        evidenceNotes: formData.evidenceReference,
        evidenceLabels: formData.evidenceReference
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Unable to submit the incident ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="mb-4 text-3xl font-semibold">Incident report submitted</h2>
        <p className="mb-8 text-muted-foreground">
          Your maintenance request has been logged with priority, asset context, and evidence notes for the incident desk.
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate('/tickets/my')}>
            View My Tickets
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C incident intake</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Capture maintenance issues with the context technicians need before triage starts.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The Module C handover calls for a dedicated create-ticket experience. This page keeps urgency, asset context, contact path, and evidence notes visible so the incident queue is easier to act on.
            </p>
          </div>

          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Asset snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedResource?.name}</h2>
            <div className="mt-5 grid gap-3">
              <InfoRow icon={<MapPin size={14} />} label="Location" value={selectedResource?.location || 'Select an asset'} />
              <InfoRow icon={<Wrench size={14} />} label="Resource type" value={selectedResource?.type?.replace('_', ' ') || 'Pending'} />
              <InfoRow icon={<ShieldAlert size={14} />} label="Current availability" value={selectedResource?.status?.replace('_', ' ') || 'Unknown'} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="bg-white/70 p-8 dark:bg-white/5">
            <h2 className="mb-6 text-2xl font-semibold">Create maintenance ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold md:col-span-2">
                  <span className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-primary" /> Ticket title
                  </span>
                  <Input
                    value={formData.title}
                    onChange={(event) => handleChange('title', event.target.value)}
                    placeholder="Projector failure during lecture"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Wrench size={16} className="text-primary" /> Affected resource
                  </span>
                  <select
                    className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                    value={formData.resourceId}
                    onChange={(event) => handleChange('resourceId', event.target.value)}
                  >
                    {MOCK_RESOURCES.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-primary" /> Category
                  </span>
                  <select
                    className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                    value={formData.category}
                    onChange={(event) => handleChange('category', event.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-primary" /> Priority
                  </span>
                  <select
                    className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                    value={formData.priority}
                    onChange={(event) => handleChange('priority', event.target.value)}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <PhoneCall size={16} className="text-primary" /> Preferred contact
                  </span>
                  <Input
                    type="email"
                    value={formData.preferredContact}
                    onChange={(event) => handleChange('preferredContact', event.target.value)}
                    placeholder="name@campus.edu"
                    required
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <ClipboardList size={16} className="text-primary" /> Incident description
                </span>
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                  value={formData.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  placeholder="Describe what happened, when it started, and whether it blocks teaching, events, or access."
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-primary" /> Operational impact
                </span>
                <Input
                  value={formData.operationalImpact}
                  onChange={(event) => handleChange('operationalImpact', event.target.value)}
                  placeholder="Lecture delivery blocked"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-primary" /> Evidence reference
                </span>
                <textarea
                  className="min-h-[100px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/5"
                  value={formData.evidenceReference}
                  onChange={(event) => handleChange('evidenceReference', event.target.value)}
                  placeholder="Add filenames separated by commas, screenshots, or where support staff can find logs and photos."
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-muted/60 px-4 py-4 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Triage note</p>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      High-priority tickets should explain the operational impact clearly. Evidence notes help technicians avoid duplicate follow-up and move directly into diagnosis.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 py-6 text-lg" isLoading={isSubmitting}>
                Submit Incident Ticket
                {!isSubmitting && <ArrowRight size={18} />}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <ClipboardList size={18} className="text-primary" /> Incident workflow
            </div>
            <div className="space-y-3">
              <WorkflowStep title="1. Intake" copy="Ticket enters the queue with asset, category, urgency, and contact details." />
              <WorkflowStep title="2. Triage" copy="Admin or technician reviews evidence and checks whether the issue blocks operations." />
              <WorkflowStep title="3. Assignment" copy="The case is routed to the right technician with a next-step update recorded." />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} className="text-secondary-accent" /> Submission guidance
            </div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Include what users can and cannot do because of the fault.</li>
              <li>Reference files, photos, or logs even if upload is handled later.</li>
              <li>Mention whether the issue affects a class, event, or safety condition.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

const WorkflowStep = ({ title, copy }) => (
  <div className="rounded-2xl border border-border bg-white/35 px-4 py-4 dark:bg-white/5">
    <p className="text-sm font-semibold">{title}</p>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy}</p>
  </div>
);

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {icon}
      {label}
    </div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);
