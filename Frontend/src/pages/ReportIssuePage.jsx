import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_RESOURCES } from '../mockData';
import { Button, Card, Input, Badge, NoticeBanner } from '../components/ui/Primitives';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Upload,
  Wrench,
} from 'lucide-react';
import { createTicket, toBackendRole } from '../lib/moduleCApi';
import { getResources } from '../lib/moduleAApi';
import { useAuth } from '../context/AuthContext';

const categories = ['EQUIPMENT', 'FACILITY', 'NETWORK', 'SAFETY', 'OTHER'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ReportIssuePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
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

  const resourceOptions = useMemo(() => (resources.length ? resources : MOCK_RESOURCES), [resources]);
  const selectedResource = resourceOptions.find((resource) => String(resource.id) === String(formData.resourceId));
  const evidenceItems = formData.evidenceReference.split(',').map((item) => item.trim()).filter(Boolean);

  const handleChange = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

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

  useEffect(() => {
    if (!resourceOptions.length) return;
    const hasCurrentResource = resourceOptions.some((resource) => String(resource.id) === String(formData.resourceId));
    if (!hasCurrentResource) {
      setFormData((current) => ({ ...current, resourceId: resourceOptions[0].id }));
    }
  }, [formData.resourceId, resourceOptions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !selectedResource) {
      setError('A signed-in user and valid resource are required to submit a ticket.');
      return;
    }
    if (evidenceItems.length > 3) {
      setError('Module C allows up to 3 evidence references during intake.');
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
        evidenceLabels: evidenceItems,
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
          Your maintenance request has entered the Module C queue with resource context, priority, and evidence references.
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate('/tickets/my')}>View My Tickets</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C incident intake</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Create a ticket with enough context for fast triage and evidence-aware support.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls for a premium create-ticket flow with clear priority choice, evidence rules, and a visible summary of what happens after submission.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Submission summary</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedResource?.name || 'Select a resource'}</h2>
            <div className="mt-5 grid gap-3">
              <InfoRow icon={<MapPin size={14} />} label="Location" value={selectedResource?.location || 'Choose resource'} />
              <InfoRow icon={<Wrench size={14} />} label="Category" value={formData.category} />
              <InfoRow icon={<AlertTriangle size={14} />} label="Priority" value={formData.priority} />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
              After submission the incident desk reviews the ticket, assigns a technician if needed, and your ticket detail page shows the lifecycle updates.
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/70 p-8 dark:bg-white/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <NoticeBanner variant="error" onDismiss={() => setError('')}>
                {error}
              </NoticeBanner>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><ClipboardList size={18} className="text-primary" /> Incident context</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold md:col-span-2">
                  <span>Ticket title</span>
                  <Input value={formData.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="Projector failure during lecture" required />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Affected resource</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.resourceId} onChange={(event) => handleChange('resourceId', event.target.value)}>
                    {resourceOptions.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Category</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.category} onChange={(event) => handleChange('category', event.target.value)}>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={18} className="text-primary" /> Issue details</div>
              <div className="grid gap-4 md:grid-cols-4">
                {priorities.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleChange('priority', priority)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${formData.priority === priority ? 'border-primary bg-primary text-white' : 'border-border bg-muted/50 text-foreground'}`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
              <label className="space-y-2 text-sm font-semibold">
                <span>Incident description</span>
                <textarea className="min-h-[150px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={formData.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="Describe what happened, when it started, and how it affects teaching, access, or safety." required />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Operational impact</span>
                <Input value={formData.operationalImpact} onChange={(event) => handleChange('operationalImpact', event.target.value)} placeholder="Lecture delivery blocked" required />
              </label>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><Upload size={18} className="text-primary" /> Evidence references</div>
              <div className="rounded-2xl border border-dashed border-border bg-muted/45 px-4 py-4 text-sm text-muted-foreground dark:bg-white/5">
                Up to 3 images are allowed by the handover. In this demo build, add up to 3 filenames or evidence references separated by commas.
              </div>
              <label className="space-y-2 text-sm font-semibold">
                <span>Evidence references</span>
                <textarea className="min-h-[110px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={formData.evidenceReference} onChange={(event) => handleChange('evidenceReference', event.target.value)} placeholder="projector-front.jpg, power-port-closeup.png" />
              </label>
              {!!evidenceItems.length && (
                <div className="flex flex-wrap gap-2">
                  {evidenceItems.map((item) => <Badge key={item} variant="info">{item}</Badge>)}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><PhoneCall size={18} className="text-primary" /> Contact preference</div>
              <label className="space-y-2 text-sm font-semibold">
                <span>Preferred contact</span>
                <Input type="email" value={formData.preferredContact} onChange={(event) => handleChange('preferredContact', event.target.value)} placeholder="name@campus.edu" required />
              </label>
            </section>

            <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-border bg-[var(--panel)]/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Submission creates an `OPEN` ticket and sends it into the admin triage queue.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" className="gap-2" isLoading={isSubmitting}>Submit Ticket {!isSubmitting && <ArrowRight size={18} />}</Button>
              </div>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold"><ShieldAlert size={18} className="text-primary" /> What happens next</div>
            <div className="space-y-3">
              <WorkflowStep title="1. Ticket enters OPEN" copy="The incident desk sees resource, priority, impact, and evidence references." />
              <WorkflowStep title="2. Admin triages" copy="High-priority and unassigned issues are surfaced first for assignment and workflow control." />
              <WorkflowStep title="3. Technician works" copy="Assigned technicians move tickets to In Progress, then Resolved with notes." />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-secondary-accent" /> Intake guidance</div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Explain what users can no longer do because of the fault.</li>
              <li>Keep evidence references specific so support staff can act faster.</li>
              <li>Use HIGH or CRITICAL only when the issue is genuinely urgent.</li>
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
    <div className="flex items-center gap-2 text-sm text-slate-300">{icon}{label}</div>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);
