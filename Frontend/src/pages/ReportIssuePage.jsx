import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { createTicket, getTicket, getTickets, toBackendRole, updateTicket } from '../lib/moduleCApi';
import { getBookings, getResources } from '../lib/operationsApi';
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

const initialDraft = (user, resourceId = '') => ({
  title: '',
  issueContext: resourceId ? 'GENERAL' : '',
  resourceId,
  relatedBookingId: '',
  category: 'EQUIPMENT',
  priority: 'MEDIUM',
  description: '',
  preferredContact: user?.email || '',
  operationalImpact: '',
  incidentLocation: '',
  evidenceReference: '',
});

const bookingLabel = (booking) => `${booking.resourceName} - ${booking.bookingDate} - ${booking.startTime.slice(0, 5)}-${booking.endTime.slice(0, 5)}`;

export const ReportIssuePage = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditing = Boolean(ticketId);
  const queryResourceId = searchParams.get('resourceId') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [existingTickets, setExistingTickets] = useState([]);
  const [editingTicket, setEditingTicket] = useState(null);
  const [resources, setResources] = useState([]);
  const [bookingOptions, setBookingOptions] = useState([]);
  const [formData, setFormData] = useState(initialDraft(user, queryResourceId));

  useEffect(() => {
    if (!isEditing) {
      setFormData(initialDraft(user, queryResourceId));
    }
  }, [user, queryResourceId, isEditing]);

  useEffect(() => {
    let active = true;

    const loadEditingTicket = async () => {
      if (!isEditing || !user) return;
      try {
        setLoadingTicket(true);
        const ticket = await getTicket(ticketId, { role: user.role, userId: user.id });
        if (!active) return;
        setEditingTicket(ticket);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load the ticket for editing.');
      } finally {
        if (active) setLoadingTicket(false);
      }
    };

    loadEditingTicket();
    return () => {
      active = false;
    };
  }, [isEditing, ticketId, user]);

  useEffect(() => {
    let active = true;
    const loadSignals = async () => {
      try {
        setLoadingSignals(true);
        const [resourceData, ownBookings, tickets] = await Promise.all([
          getResources(),
          user ? getBookings({ role: user.role, userId: user.id }) : Promise.resolve([]),
          getTickets({ role: 'ADMIN' }),
        ]);
        if (!active) return;
        const usableBookings = (ownBookings || []).filter((booking) => booking.status === 'APPROVED');
        setResources(resourceData);
        setBookingOptions(usableBookings);
        setExistingTickets(tickets);
        setFormData((current) => ({
          ...current,
          issueContext: current.resourceId ? 'GENERAL' : usableBookings.length ? current.issueContext : 'GENERAL',
        }));
      } catch (_) {
        if (!active) return;
        setResources([]);
        setBookingOptions([]);
        setExistingTickets([]);
      } finally {
        if (active) setLoadingSignals(false);
      }
    };

    loadSignals();
    return () => {
      active = false;
    };
  }, [user]);

  const selectedBooking = bookingOptions.find((booking) => String(booking.id) === String(formData.relatedBookingId));
  const selectedResource = resources.find((resource) => String(resource.id) === String(formData.resourceId));
  const contextSelected = formData.issueContext === 'BOOKING' || formData.issueContext === 'GENERAL';
  const usingBookingContext = formData.issueContext === 'BOOKING' && bookingOptions.length > 0;
  const canProceedWithContext = usingBookingContext ? !!selectedBooking : !!selectedResource;

  useEffect(() => {
    if (!usingBookingContext || !selectedBooking) return;
    setFormData((current) => ({
      ...current,
      resourceId: String(selectedBooking.resourceId),
      incidentLocation: selectedBooking.resourceLocation,
    }));
  }, [selectedBooking, usingBookingContext]);

  useEffect(() => {
    if (usingBookingContext || !selectedResource) return;
    setFormData((current) => ({
      ...current,
      incidentLocation: current.incidentLocation?.trim() ? current.incidentLocation : selectedResource.location,
    }));
  }, [selectedResource, usingBookingContext]);

  useEffect(() => {
    if (!editingTicket || !resources.length || loadingSignals) return;

    const matchedResource = resources.find((resource) =>
      resource.name === editingTicket.resourceName
      && resource.location === editingTicket.resourceLocation
    );

    setFormData({
      title: editingTicket.title || '',
      issueContext: editingTicket.relatedBookingId ? 'BOOKING' : 'GENERAL',
      resourceId: matchedResource ? String(matchedResource.id) : '',
      relatedBookingId: editingTicket.relatedBookingId ? String(editingTicket.relatedBookingId) : '',
      category: editingTicket.category || 'EQUIPMENT',
      priority: editingTicket.priority || 'MEDIUM',
      description: editingTicket.description || '',
      preferredContact: editingTicket.preferredContact || user?.email || '',
      operationalImpact: editingTicket.operationalImpact || '',
      incidentLocation: editingTicket.incidentLocation || editingTicket.resourceLocation || '',
      evidenceReference: (editingTicket.evidenceLabels || []).join(', '),
    });
    setFieldErrors({});
  }, [editingTicket, resources, loadingSignals, user]);

  const evidenceItems = useMemo(() => parseEvidenceItems(formData.evidenceReference), [formData.evidenceReference]);
  const incidentScore = useMemo(() => scoreIncident({ ...formData, evidenceItems }), [formData, evidenceItems]);
  const suggestedPriority = useMemo(() => suggestedPriorityFromScore(incidentScore), [incidentScore]);
  const intakeCompleteness = useMemo(() => completenessScore({ ...formData, evidenceItems }), [formData, evidenceItems]);
  const similarTickets = useMemo(() => findSimilarTickets({
    tickets: existingTickets,
    resourceName: selectedResource?.name || selectedBooking?.resourceName || '',
    category: formData.category,
    title: formData.title,
  }), [existingTickets, selectedResource, selectedBooking, formData.category, formData.title]);
  const smartResponseTarget = responseTargetFromPriority(suggestedPriority);
  const safetyMode = incidentScore >= 82 || formData.category === 'SAFETY';

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleContextChange = (nextContext) => {
    setFormData((current) => ({
      ...initialDraft(user, queryResourceId),
      preferredContact: current.preferredContact || user?.email || '',
      issueContext: nextContext,
      resourceId: nextContext === 'GENERAL' ? current.resourceId : '',
    }));
    setFieldErrors({});
    setError('');
  };

  const handleResourceChange = (value) => {
    const resource = resources.find((item) => String(item.id) === String(value));
    setFormData((current) => ({
      ...current,
      resourceId: value,
      incidentLocation: resource?.location || current.incidentLocation,
    }));
    setFieldErrors((current) => ({ ...current, resourceId: '', incidentLocation: '' }));
  };

  const handleEvidenceUpload = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const nextEvidence = Array.from(new Set([
      ...evidenceItems,
      ...selectedFiles.map((file) => file.name),
    ])).slice(0, 3);

    setFormData((current) => ({
      ...current,
      evidenceReference: nextEvidence.join(', '),
    }));
    setFieldErrors((current) => ({ ...current, evidenceReference: '' }));
    setError('');
    event.target.value = '';
  };

  const removeEvidenceItem = (itemToRemove) => {
    const nextEvidence = evidenceItems.filter((item) => item !== itemToRemove);
    setFormData((current) => ({
      ...current,
      evidenceReference: nextEvidence.join(', '),
    }));
    setFieldErrors((current) => ({ ...current, evidenceReference: '' }));
  };

  const fillDemoScenario = () => {
    setFormData((current) => ({
      ...current,
      title: 'Projector overheating during lecture',
      category: 'EQUIPMENT',
      priority: 'HIGH',
      description: 'The projector turns off after a few minutes, produces a burnt smell, and interrupts the session every time it is used.',
      operationalImpact: 'Lecture delivery stops and the room cannot continue the session as planned.',
      incidentLocation: current.incidentLocation || selectedResource?.location || selectedBooking?.resourceLocation || 'Engineering Lab 2, east presentation wall',
      evidenceReference: 'projector-front.jpg, error-screen.png',
      preferredContact: user?.email || current.preferredContact,
    }));
    setFieldErrors({});
    setError('');
  };

  const applySuggestedPriority = () => handleChange('priority', suggestedPriority);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const currentResource = usingBookingContext
      ? resources.find((resource) => String(resource.id) === String(selectedBooking?.resourceId))
      : selectedResource;

    if (!user || !currentResource) {
      setError('Select the correct booking or resource before submitting the ticket.');
      return;
    }

    const nextErrors = validateTicketDraft({ ...formData, evidenceItems });
    if (usingBookingContext && !formData.relatedBookingId) {
      nextErrors.relatedBookingId = 'Choose the booking that was affected before raising the ticket.';
    }
    if (!usingBookingContext && !formData.resourceId) {
      nextErrors.resourceId = 'Choose the affected resource before submitting.';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError('Please correct the highlighted Module C validation issues before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        reporterId: user.id,
        reporterName: user.name,
        reporterEmail: user.email,
        reporterRole: toBackendRole(user.role),
        resourceName: currentResource.name,
        resourceLocation: currentResource.location,
        incidentLocation: formData.incidentLocation.trim(),
        relatedBookingId: usingBookingContext && formData.relatedBookingId ? Number(formData.relatedBookingId) : null,
        relatedBookingLabel: usingBookingContext && selectedBooking ? bookingLabel(selectedBooking) : null,
        resourceType: currentResource.type,
        preferredContact: formData.preferredContact.trim(),
        operationalImpact: formData.operationalImpact.trim(),
        evidenceNotes: formData.evidenceReference.trim(),
        evidenceLabels: evidenceItems,
      };

      if (isEditing) {
        await updateTicket(ticketId, payload);
      } else {
        await createTicket(payload);
      }
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
        <h2 className="mb-4 text-3xl font-semibold">{isEditing ? 'Ticket updated' : 'Incident report submitted'}</h2>
        <p className="mb-8 text-muted-foreground">
          {isEditing
            ? 'Your open ticket was updated successfully before admin or technician work began.'
            : 'Your maintenance request entered Module C with the right asset, exact incident spot, and session context for the admin and technician workflow.'}
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate(isEditing ? `/tickets/${ticketId}` : '/tickets/my')}>{isEditing ? 'View Ticket Detail' : 'View My Tickets'}</Button>
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
        {loadingTicket && <div className="mb-4 text-sm text-muted-foreground">Loading ticket for editing...</div>}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">{isEditing ? 'Module C ticket edit' : 'Module C incident intake'}</div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{isEditing ? 'Edit your open ticket before operational work begins.' : 'Raise a ticket only after linking it to the right booking or asset.'}</h1>
              {safetyMode && <Badge variant="danger">Safety mode</Badge>}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {isEditing
                ? 'Only open tickets can be edited. Update the booking or asset context, evidence, and issue wording before the desk starts handling the case.'
                : 'Choose the correct booking or asset first. Only the exact location is filled from that context by default, while the title and impact stay for the user to describe properly.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" onClick={fillDemoScenario} disabled={!canProceedWithContext}>Load Demo Incident</Button>
              <Button variant="ghost" onClick={applySuggestedPriority} disabled={!canProceedWithContext}>Use Suggested Priority</Button>
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Smart submission radar</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedResource?.name || selectedBooking?.resourceName || 'Select incident source first'}</h2>
            <div className="mt-5 grid gap-3">
              <InfoRow icon={<MapPin size={14} />} label="Incident spot" value={formData.incidentLocation || 'Choose booking or resource'} />
              <InfoRow icon={<Gauge size={14} />} label="Incident score" value={`${incidentScore}/100`} />
              <InfoRow icon={<AlertTriangle size={14} />} label="Suggested priority" value={suggestedPriority} />
              <InfoRow icon={<Radar size={14} />} label="Response target" value={smartResponseTarget} />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
              {!contextSelected
                ? 'Choose whether the issue came from a booking or a general campus asset.'
                : usingBookingContext && selectedBooking
                  ? `Linked booking selected: ${bookingLabel(selectedBooking)}.`
                  : similarTickets.length
                    ? `${similarTickets.length} similar active incident(s) found. This looks like a repeat issue cluster and may need deeper root-cause attention.`
                    : 'Select the exact asset before continuing so the desk receives a clear, actionable ticket.'}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/70 p-8 dark:bg-white/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold"><ClipboardList size={18} className="text-primary" /> Context first</div>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleContextChange('BOOKING')}
                  disabled={!bookingOptions.length}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${usingBookingContext ? 'border-primary bg-primary text-white' : 'border-border bg-muted/50 text-foreground'} ${!bookingOptions.length ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <p className="font-semibold">Booking-related issue</p>
                  <p className={`mt-2 text-sm ${usingBookingContext ? 'text-white/80' : 'text-muted-foreground'}`}>Use this when the issue happened during one of your approved bookings.</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleContextChange('GENERAL')}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${formData.issueContext === 'GENERAL' ? 'border-primary bg-primary text-white' : 'border-border bg-muted/50 text-foreground'}`}
                >
                  <p className="font-semibold">General asset issue</p>
                  <p className={`mt-2 text-sm ${formData.issueContext === 'GENERAL' ? 'text-white/80' : 'text-muted-foreground'}`}>Use this when the issue was found outside a specific booking session.</p>
                </button>
              </div>
              {!contextSelected && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  Start here. Pick the ticket source first so the report is attached to the correct booking or campus asset.
                </div>
              )}
              {usingBookingContext ? (
                <label className="space-y-2 text-sm font-semibold">
                  <span>Affected booking/session</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.relatedBookingId} onChange={(event) => handleChange('relatedBookingId', event.target.value)}>
                    <option value="">Select the booking that had the issue</option>
                    {bookingOptions.map((booking) => <option key={booking.id} value={booking.id}>{bookingLabel(booking)}</option>)}
                  </select>
                  {fieldErrors.relatedBookingId && <FieldError message={fieldErrors.relatedBookingId} />}
                </label>
              ) : contextSelected ? (
                <label className="space-y-2 text-sm font-semibold">
                  <span>Affected resource</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.resourceId} onChange={(event) => handleResourceChange(event.target.value)}>
                    <option value="">Select resource</option>
                    {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                  </select>
                  {fieldErrors.resourceId && <FieldError message={fieldErrors.resourceId} />}
                </label>
              ) : null}
              {contextSelected && !canProceedWithContext && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  {usingBookingContext
                    ? 'Select the affected booking before the rest of the ticket opens.'
                    : 'Select the affected resource before the rest of the ticket opens.'}
                </div>
              )}
            </section>

            {contextSelected && canProceedWithContext && (
              <>
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold"><ClipboardList size={18} className="text-primary" /> Incident context</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold md:col-span-2">
                      <span>Ticket title</span>
                      <Input value={formData.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="Projector failure during lecture" required />
                      {fieldErrors.title && <FieldError message={fieldErrors.title} />}
                    </label>
                    <label className="space-y-2 text-sm font-semibold">
                      <span>Category</span>
                      <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={formData.category} onChange={(event) => handleChange('category', event.target.value)}>
                        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-semibold">
                      <span>Exact incident location</span>
                      <Input value={formData.incidentLocation} onChange={(event) => handleChange('incidentLocation', event.target.value)} placeholder="Engineering Lab 2, east presentation wall" required />
                      {fieldErrors.incidentLocation && <FieldError message={fieldErrors.incidentLocation} />}
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
                    Up to 3 images are allowed by the handover. Use the uploader below and the selected filenames will be attached as evidence references for this demo build.
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                    <Upload size={18} />
                    <span>Upload evidence images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleEvidenceUpload}
                    />
                  </label>
                  {fieldErrors.evidenceReference && <FieldError message={fieldErrors.evidenceReference} />}
                  {!!evidenceItems.length && (
                    <div className="flex flex-wrap gap-2">
                      {evidenceItems.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeEvidenceItem(item)}
                          className="rounded-full"
                          aria-label={`Remove ${item}`}
                        >
                          <Badge variant="info">{item}</Badge>
                        </button>
                      ))}
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
              </>
            )}

            {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}

            <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-border bg-[var(--panel)]/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">This flow now blocks the report until the affected booking or asset is selected, and only the exact location is prefilled from that context.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" className="gap-2" isLoading={isSubmitting || loadingTicket} disabled={!contextSelected || !canProceedWithContext || loadingTicket}>{isEditing ? 'Save Changes' : 'Submit Ticket'} {!isSubmitting && !loadingTicket && <ArrowRight size={18} />}</Button>
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
            <div className="mb-4 flex items-center gap-2 font-semibold"><ShieldAlert size={18} className="text-secondary-accent" /> Why this is better</div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Students with many bookings cannot submit an issue without identifying which session was affected.</li>
              <li>Only the exact location comes from the selected booking or resource by default.</li>
              <li>Users still describe the ticket title and the operational impact themselves.</li>
            </ul>
          </Card>

          <Card className="bg-white/70 p-6 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2 font-semibold"><Lightbulb size={18} className="text-primary" /> Intake guidance</div>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Choose booking-related mode when the fault interrupted an approved reservation.</li>
              <li>Choose general asset mode when the issue was found outside a booking session.</li>
              <li>Keep the incident location precise enough for technicians to walk straight there.</li>
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
