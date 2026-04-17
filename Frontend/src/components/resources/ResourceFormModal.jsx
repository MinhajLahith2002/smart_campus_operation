import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button, Card, Input, Badge } from '../ui/Primitives';
import { RESOURCE_DAYS, RESOURCE_STATUSES, RESOURCE_TYPES, formatResourceType, formatResourceStatus } from '../../lib/moduleAApi';
import { cn } from '../../lib/utils';

const defaultForm = {
  name: '',
  type: 'LAB',
  capacity: 1,
  location: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
  availabilityWindow: {
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    openTime: '08:00',
    closeTime: '17:00',
    notes: '',
  },
};

const normalizeInitial = (initialData) => ({
  ...defaultForm,
  ...initialData,
  capacity: initialData?.capacity ?? defaultForm.capacity,
  availabilityWindow: {
    ...defaultForm.availabilityWindow,
    ...(initialData?.availabilityWindow || {}),
  },
});

export const ResourceFormModal = ({
  isOpen,
  initialData,
  onClose,
  onSubmit,
  submitLabel = 'Save resource',
  title = 'Resource form',
  busy = false,
  error = '',
}) => {
  const [form, setForm] = useState(defaultForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [previewErrored, setPreviewErrored] = useState(false);

  const selectedDays = useMemo(() => new Set(form.availabilityWindow.daysOfWeek), [form.availabilityWindow.daysOfWeek]);
  const daySummary = useMemo(() => {
    if (!form.availabilityWindow.daysOfWeek.length) return 'No operating days selected';
    if (form.availabilityWindow.daysOfWeek.length === RESOURCE_DAYS.length) return 'Available daily';
    return `${form.availabilityWindow.daysOfWeek.length} operating days selected`;
  }, [form.availabilityWindow.daysOfWeek]);

  useEffect(() => {
    if (isOpen) {
      setForm(normalizeInitial(initialData));
      setValidationErrors({});
      setPreviewErrored(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    setPreviewErrored(false);
  }, [form.imageUrl]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, isOpen, onClose]);

  if (!isOpen) return null;

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setWindowField = (field, value) => setForm((current) => ({
    ...current,
    availabilityWindow: {
      ...current.availabilityWindow,
      [field]: value,
    },
  }));

  const toggleDay = (day) => {
    const nextDays = selectedDays.has(day)
      ? form.availabilityWindow.daysOfWeek.filter((item) => item !== day)
      : [...form.availabilityWindow.daysOfWeek, day];
    setWindowField('daysOfWeek', nextDays);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!form.location.trim()) nextErrors.location = 'Location is required.';
    if (Number(form.capacity) < 0 || Number.isNaN(Number(form.capacity))) nextErrors.capacity = 'Capacity must be 0 or more.';
    if (!RESOURCE_TYPES.includes(form.type)) nextErrors.type = 'Choose a valid resource type.';
    if (!RESOURCE_STATUSES.includes(form.status)) nextErrors.status = 'Choose a valid status.';
    if (!form.availabilityWindow.daysOfWeek.length) nextErrors.daysOfWeek = 'Select at least one day.';
    if (form.availabilityWindow.openTime >= form.availabilityWindow.closeTime) nextErrors.closeTime = 'Closing time must be later than opening time.';
    if (form.imageUrl.trim()) {
      try {
        new URL(form.imageUrl.trim());
      } catch (_) {
        nextErrors.imageUrl = 'Image URL must be a valid absolute URL.';
      }
    }

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit({
      name: form.name.trim(),
      type: form.type,
      capacity: Number(form.capacity),
      location: form.location.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      status: form.status,
      availabilityWindow: {
        daysOfWeek: form.availabilityWindow.daysOfWeek,
        openTime: form.availabilityWindow.openTime,
        closeTime: form.availabilityWindow.closeTime,
        notes: form.availabilityWindow.notes.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={!busy ? onClose : undefined}>
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-[var(--panel-strong)] p-0" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 md:px-8">
            <div>
              <div className="eyebrow mb-3">Module A admin</div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Capture searchable metadata, status, and availability for future booking validation.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="Close resource form">
              <X size={18} />
            </Button>
          </div>

          <div className="grid gap-8 px-6 py-6 md:px-8 lg:grid-cols-[1fr_0.95fr]">
            <div className="space-y-5">
              <label className="space-y-2 text-sm font-semibold">
                <span>Name</span>
                <Input value={form.name} onChange={(event) => setField('name', event.target.value)} />
                {validationErrors.name && <p className="text-xs text-danger">{validationErrors.name}</p>}
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  <span>Type</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={form.type} onChange={(event) => setField('type', event.target.value)}>
                    {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{formatResourceType(type)}</option>)}
                  </select>
                  {validationErrors.type && <p className="text-xs text-danger">{validationErrors.type}</p>}
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Status</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={form.status} onChange={(event) => setField('status', event.target.value)}>
                    {RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{formatResourceStatus(status)}</option>)}
                  </select>
                  {validationErrors.status && <p className="text-xs text-danger">{validationErrors.status}</p>}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  <span>Capacity</span>
                  <Input type="number" min="0" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} />
                  {validationErrors.capacity && <p className="text-xs text-danger">{validationErrors.capacity}</p>}
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Location</span>
                  <Input value={form.location} onChange={(event) => setField('location', event.target.value)} />
                  {validationErrors.location && <p className="text-xs text-danger">{validationErrors.location}</p>}
                </label>
              </div>

              <label className="space-y-2 text-sm font-semibold">
                <span>Image URL</span>
                <Input value={form.imageUrl} onChange={(event) => setField('imageUrl', event.target.value)} placeholder="https://images.unsplash.com/..." />
                {validationErrors.imageUrl && <p className="text-xs text-danger">{validationErrors.imageUrl}</p>}
              </label>

              <label className="space-y-2 text-sm font-semibold">
                <span>Description</span>
                <textarea
                  className="min-h-[160px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm backdrop-blur-sm dark:bg-white/5"
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                />
              </label>
            </div>

            <div className="space-y-5">
              <Card className="overflow-hidden bg-slate-950 p-0 text-white">
                <div className="aspect-[16/9] bg-slate-900">
                  {form.imageUrl.trim() && !previewErrored ? (
                    <img
                      src={form.imageUrl.trim()}
                      alt={form.name || 'Resource preview'}
                      className="h-full w-full object-cover"
                      onError={() => setPreviewErrored(true)}
                    />
                  ) : null}
                  <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-300', form.imageUrl.trim() && !previewErrored && 'hidden')}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="font-medium">Preview card</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {form.imageUrl.trim() && previewErrored
                          ? 'The image could not be loaded. Update the URL or leave it blank to use the catalogue fallback.'
                          : 'Add an image URL to preview how this asset will appear in the catalogue.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{formatResourceType(form.type)}</Badge>
                    <Badge variant={form.status === 'ACTIVE' ? 'success' : 'danger'}>{formatResourceStatus(form.status)}</Badge>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{form.name.trim() || 'Untitled resource'}</p>
                    <p className="mt-1 text-sm text-slate-300">{form.location.trim() || 'Location not set yet'}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PreviewMetric label="Capacity" value={`${form.capacity || 0}`} />
                    <PreviewMetric label="Coverage" value={daySummary} />
                    <PreviewMetric label="Opens" value={form.availabilityWindow.openTime || '--:--'} />
                    <PreviewMetric label="Closes" value={form.availabilityWindow.closeTime || '--:--'} />
                  </div>
                </div>
              </Card>

              <Card className="bg-white/60 p-5 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Availability window</p>
                  <Badge variant="info">Booking-ready</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold">
                    <span>Open time</span>
                    <Input type="time" value={form.availabilityWindow.openTime} onChange={(event) => setWindowField('openTime', event.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    <span>Close time</span>
                    <Input type="time" value={form.availabilityWindow.closeTime} onChange={(event) => setWindowField('closeTime', event.target.value)} />
                    {validationErrors.closeTime && <p className="text-xs text-danger">{validationErrors.closeTime}</p>}
                  </label>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-sm font-semibold">Available days</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {RESOURCE_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-left text-sm font-medium transition-all',
                          selectedDays.has(day)
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-white/45 dark:bg-white/5'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {validationErrors.daysOfWeek && <p className="text-xs text-danger">{validationErrors.daysOfWeek}</p>}
                </div>

                <label className="mt-5 block space-y-2 text-sm font-semibold">
                  <span>Availability notes</span>
                  <textarea
                    className="min-h-[120px] w-full rounded-xl border border-border bg-white/45 px-3 py-3 text-sm backdrop-blur-sm dark:bg-white/5"
                    value={form.availabilityWindow.notes}
                    onChange={(event) => setWindowField('notes', event.target.value)}
                  />
                </label>
              </Card>

              {error && <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-4 text-sm text-danger">{error}</div>}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-5 md:flex-row md:items-center md:justify-end md:px-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" isLoading={busy}>{submitLabel}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const PreviewMetric = ({ label, value }) => (
  <div className="rounded-2xl bg-white/6 px-3 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-medium text-white">{value}</p>
  </div>
);
