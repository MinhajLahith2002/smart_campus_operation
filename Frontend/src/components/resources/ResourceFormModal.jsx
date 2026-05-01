import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Card, Input, Badge, NoticeBanner } from '../ui/Primitives';
import { RESOURCE_DAYS, RESOURCE_STATUSES, RESOURCE_TYPES } from '../../lib/moduleAApi';
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

  const selectedDays = useMemo(() => new Set(form.availabilityWindow.daysOfWeek), [form.availabilityWindow.daysOfWeek]);

  useEffect(() => {
    if (isOpen) {
      setForm(normalizeInitial(initialData));
      setValidationErrors({});
    }
  }, [initialData, isOpen]);

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
    if (!form.availabilityWindow.daysOfWeek.length) nextErrors.daysOfWeek = 'Select at least one day.';
    if (form.availabilityWindow.openTime >= form.availabilityWindow.closeTime) nextErrors.closeTime = 'Closing time must be later than opening time.';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-[var(--panel-strong)] p-0">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 md:px-8">
            <div>
              <div className="eyebrow mb-3">Module A admin</div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Capture searchable metadata, status, and availability for future booking validation.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>

          <div className="px-6 pt-6 md:px-8">
            {error && (
              <NoticeBanner variant="error">
                {error}
              </NoticeBanner>
            )}
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
                    {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span>Status</span>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={form.status} onChange={(event) => setField('status', event.target.value)}>
                    {RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
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
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-5 md:flex-row md:items-center md:justify-end md:px-8">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={busy}>{submitLabel}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
