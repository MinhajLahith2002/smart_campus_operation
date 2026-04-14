import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_RESOURCES } from '../mockData';
import { Button, Card, Input, Badge } from '../components/ui/Primitives';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Lightbulb,
  MapPin,
  PhoneCall,
  Radar,
  ShieldAlert,
  Sparkles,
  Upload,
  Wrench,
} from 'lucide-react';
import { createTicket, getTickets, toBackendRole } from '../lib/moduleCApi';
import {
  completenessScore,
  findSimilarTickets,
  parseEvidenceItems,
  responseTargetFromPriority,
  scoreIncident,
  suggestedPriorityFromScore,
  validateTicketDraft,
} from '../lib/moduleCInsights';
import { useAuth } from '../context/AuthContext';

const categories = ['EQUIPMENT', 'FACILITY', 'NETWORK', 'SAFETY', 'OTHER'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const initialDraft = (user) => ({
  title: '',
  resourceId: MOCK_RESOURCES[0]?.id || '',
  category: 'EQUIPMENT',
  priority: 'MEDIUM',
  description: '',
  preferredContact: user?.email || '',
  operationalImpact: '',
  evidenceReference: '',
});

export const ReportIssuePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [existingTickets, setExistingTickets] = useState([]);
  const [formData, setFormData] = useState(initialDraft(user));

  useEffect(() => {
    setFormData(initialDraft(user));
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadSignals = async () => {
      try {
        setLoadingSignals(true);
        const tickets = await getTickets({ role: 'ADMIN' });
        if (active) setExistingTickets(tickets);
      } catch (_) {
        if (active) setExistingTickets([]);
      } finally {
        if (active) setLoadingSignals(false);
      }
    };

    loadSignals();
    return () => {
      active = false;
    };
  }, []);

  const selectedResource = MOCK_RESOURCES.find((resource) => resource.id === formData.resourceId);
  const evidenceItems = useMemo(() => parseEvidenceItems(formData.evidenceReference), [formData.evidenceReference]);
  const incidentScore = useMemo(() => scoreIncident({ ...formData, evidenceItems }), [formData, evidenceItems]);
  const suggestedPriority = useMemo(() => suggestedPriorityFromScore(incidentScore), [incidentScore]);
  const intakeCompleteness = useMemo(() => completenessScore({ ...formData, evidenceItems }), [formData, evidenceItems]);
  const similarTickets = useMemo(() => findSimilarTickets({
    tickets: existingTickets,
    resourceName: selectedResource?.name || '',
    category: formData.category,
    title: formData.title,
  }), [existingTickets, selectedResource, formData.category, formData.title]);
  const smartResponseTarget = responseTargetFromPriority(suggestedPriority);
  const safetyMode = incidentScore >= 82 || formData.category === 'SAFETY';

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const fillDemoScenario = () => {
    setFormData((current) => ({
      ...current,
      title: 'Projector overheating in Engineering Lab 2',
      category: 'EQUIPMENT',
      priority: 'HIGH',
      description: 'The projector turns off after a few minutes, produces a burnt smell, and interrupts the morning lecture every day this week.',
      operationalImpact: 'Lecture delivery stops for a full class of students and the room becomes unusable for presentations.',
      evidenceReference: 'projector-front.jpg, error-screen.png',
      preferredContact: user?.email || current.preferredContact,
    }));
    setFieldErrors({});
    setError('');
  };

  const applySuggestedPriority = () => handleChange('priority', suggestedPriority);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !selectedResource) {
      setError('A signed-in user and valid resource are required to submit a ticket.');
      return;
    }

    const nextErrors = validateTicketDraft({ ...formData, evidenceItems });
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError('Please correct the highlighted Module C validation issues before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createTicket({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        reporterId: user.id,
        reporterName: user.name,
        reporterEmail: user.email,
        reporterRole: toBackendRole(user.role),
        resourceName: selectedResource.name,
        resourceLocation: selectedResource.location,
        resourceType: selectedResource.type,
        preferredContact: formData.preferredContact.trim(),
        operationalImpact: formData.operationalImpact.trim(),
        evidenceNotes: formData.evidenceReference.trim(),
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
          Your maintenance request entered the Module C queue with smart triage context, evidence references, and validation-ready incident details.
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

      <section className={`surface-strong p-6 md:p-8 ${safetyMode ? 'ring-1 ring-danger/30' : ''}`}>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module C incident intake</div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Create a ticket with smart triage, duplicate awareness, and stronger incident validation.</h1>
              {safetyMode && <Badge variant="danger">Safety mode</Badge>}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This intake flow goes beyond a normal form. It scores urgency, checks for repeated failures, and helps the incident desk receive cleaner, faster-to-action reports.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" onClick={fillDemoScenario}>Load Demo Incident</Button>
              <Button variant="ghost" onClick={applySuggestedPriority}>Use Suggested Priority</Button>
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Smart submission radar</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedResource?.name || 'Select a resource'}</h2>
            <div className="mt-5 grid gap-3">
              <InfoRow icon={<MapPin size={14} />} label="Location" value={selectedResource?.location || 'Choose resource'} />
              <InfoRow icon={<Gauge size={14} />} label="Incident score" value={`${incidentScore}/100`} />
              <InfoRow icon={<AlertTriangle size={14} />} label="Suggested priority" value={suggestedPriority} />
              <InfoRow icon={<Radar size={14} />} label="Response target" value={smartResponseTarget} />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
              {similarTickets.length
                ? `${similarTickets.length} similar active incident(s) found. This looks like a repeat issue cluster and may need deeper root-cause attention.`
                : 'No active duplicates were detected for this incident pattern right now.'}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/70 p-8 dark:bg-white/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><ClipboardList size={18} className="text-primary" /> Incident context</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold md:col-span-2">
                  <span>Ticket title</span>
                  <Input value={formData.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="Projector failure during lecture" required />
                  {fieldErrors.title && <FieldError message={fieldErrors.title} />}
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Affected resource</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.resourceId} onChange={(event) => handleChange('resourceId', event.target.value)}>
                    {MOCK_RESOURCES.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
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
              {fieldErrors.priority && <FieldError message={fieldErrors.priority} />}
              <label className="space-y-2 text-sm font-semibold">
                <span>Incident description</span>
                <textarea className="min-h-[150px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm dark:bg-white/5" value={formData.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="Describe what happened, when it started, and how it affects teaching, access, or safety." required />
                {fieldErrors.description && <FieldError message={fieldErrors.description} />}
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Operational impact</span>
                <Input value={formData.operationalImpact} onChange={(event) => handleChange('operationalImpact', event.target.value)} placeholder="Lecture delivery blocked" required />
                {fieldErrors.operationalImpact && <FieldError message={fieldErrors.operationalImpact} />}
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
                {fieldErrors.evidenceReference && <FieldError message={fieldErrors.evidenceReference} />}
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
                {fieldErrors.preferredContact && <FieldError message={fieldErrors.preferredContact} />}
              </label>
            </section>

            {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}

            <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-border bg-[var(--panel)]/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Submission creates an `OPEN` ticket and sends it into the admin triage queue with smart severity and duplicate signals.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" className="gap-2" isLoading={isSubmitting}>Submit Ticket {!isSubmitting && <ArrowRight size={18} />}</Button>
              </div>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/20">
            <div className="mb-4 flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-primary" /> Smart triage assist</div>
            <div className="space-y-3">
              <WorkflowStep title="Incident confidence" copy={`${intakeCompleteness}/100 completeness. Higher completeness gives admins faster, cleaner triage.`} />
              <WorkflowStep title="Priority recommendation" copy={`The current wording suggests ${suggestedPriority} priority with a target response of ${smartResponseTarget.toLowerCase()}.`} />
              <WorkflowStep title="Duplicate awareness" copy={loadingSignals ? 'Checking recent incidents across the campus network.' : similarTickets.length ? `${similarTickets.length} similar active incident(s) detected. Consider mentioning if this is a repeat failure.` : 'No similar active incidents detected right now.'} />
            </div>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold"><ShieldAlert size={18} className="text-secondary-accent" /> Out-of-the-box value</div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>This intake now behaves like a campus command tool, not just a form.</li>
              <li>Priority is guided by issue language, impact, category, and evidence depth.</li>
              <li>Repeated failures surface before submission so the desk can see incident patterns early.</li>
            </ul>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold"><Lightbulb size={18} className="text-primary" /> Intake guidance</div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Explain what users can no longer do because of the fault.</li>
              <li>Keep evidence references specific so support staff can act faster.</li>
              <li>If the issue creates danger, mention safety symptoms directly in the description.</li>
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

const FieldError = ({ message }) => (
  <p className="text-sm text-danger">{message}</p>
);
