import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, MapPin, Pencil, Plus, Search, Trash2, Users, Wrench } from 'lucide-react';
import { Button, Card, Input, NoticeBanner } from '../components/ui/Primitives';
import { ResourceFormModal } from '../components/resources/ResourceFormModal';
import { ResourceStatusBadge } from '../components/resources/ResourceStatusBadge';
import {
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  createResource,
  deleteResource,
  formatAvailabilityWindow,
  formatResourceType,
  getResources,
  updateResource,
  updateResourceStatus,
} from '../lib/moduleAApi';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FILTER = 'ALL';

export const AdminResourcesPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    type: DEFAULT_FILTER,
    status: DEFAULT_FILTER,
    location: '',
  });
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalState, setModalState] = useState({ open: false, resource: null });
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getResources(filters);
      setResources(data);
    } catch (err) {
      setError(err.message || 'Unable to load resource management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadResources();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const summary = useMemo(() => ({
    total: resources.length,
    active: resources.filter((resource) => resource.status === 'ACTIVE').length,
    unavailable: resources.filter((resource) => resource.status === 'OUT_OF_SERVICE').length,
  }), [resources]);

  const closeModal = () => {
    setModalState({ open: false, resource: null });
    setSubmitError('');
  };

  const openCreate = () => {
    setSuccess('');
    setModalState({ open: true, resource: null });
  };

  const openEdit = (resource) => {
    setSuccess('');
    setModalState({ open: true, resource });
  };

  const handleSave = async (payload) => {
    try {
      setBusy(true);
      setSubmitError('');
      if (modalState.resource) {
        await updateResource(modalState.resource.id, payload, user.role);
        setSuccess('Resource updated successfully.');
      } else {
        await createResource(payload, user.role);
        setSuccess('Resource created successfully.');
      }
      closeModal();
      await loadResources();
    } catch (err) {
      setSubmitError(err.message || 'Unable to save the resource.');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete ${resource.name} from the catalogue?`)) return;
    try {
      setError('');
      setSuccess('');
      await deleteResource(resource.id, user.role);
      setSuccess('Resource deleted successfully.');
      await loadResources();
    } catch (err) {
      setError(err.message || 'Unable to delete the resource.');
    }
  };

  const handleToggleStatus = async (resource) => {
    const nextStatus = resource.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE';
    try {
      setError('');
      setSuccess('');
      await updateResourceStatus(resource.id, nextStatus, user.role);
      setSuccess(`Resource marked as ${nextStatus.replace('_', ' ')}.`);
      await loadResources();
    } catch (err) {
      setError(err.message || 'Unable to update resource status.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module A admin desk</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Manage campus facilities and assets from one searchable operational catalogue.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This desk keeps core resource data clean for discovery, booking review, and maintenance visibility. Admins can add new resources, update metadata, and mark assets out of service.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <DeskMetric label="Catalogue size" value={`${summary.total}`} />
            <DeskMetric label="Active" value={`${summary.active}`} />
            <DeskMetric label="Out of service" value={`${summary.unavailable}`} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input className="pl-10" placeholder="Search by name, location, or description" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </div>
          <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
            <option value={DEFAULT_FILTER}>All types</option>
            {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value={DEFAULT_FILTER}>All statuses</option>
            {RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <Input placeholder="Filter by location" value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} />
          <Button className="gap-2 whitespace-nowrap" onClick={openCreate}>
            <Plus size={16} /> Add resource
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {success && (
          <NoticeBanner variant="success" onDismiss={() => setSuccess('')}>
            {success}
          </NoticeBanner>
        )}
        {error && (
          <NoticeBanner variant="error" onDismiss={() => setError('')}>
            {error}
          </NoticeBanner>
        )}
      </div>

      {loading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading resources...</Card>
      ) : (
        <Card className="overflow-hidden p-0 bg-white/70 dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-muted/45">
                <tr className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  <th className="px-5 py-4 font-bold">Resource</th>
                  <th className="px-5 py-4 font-bold">Location</th>
                  <th className="px-5 py-4 font-bold">Capacity</th>
                  <th className="px-5 py-4 font-bold">Availability</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-t border-border/70">
                    <td className="px-5 py-5">
                      <div>
                        <p className="font-semibold">{resource.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatResourceType(resource.type)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><MapPin size={14} /> {resource.location}</span>
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Users size={14} /> {resource.capacity}</span>
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">{formatAvailabilityWindow(resource.availabilityWindow)}</td>
                    <td className="px-5 py-5"><ResourceStatusBadge status={resource.status} /></td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        <Link to={`/catalogue/${resource.id}`}><Button variant="ghost" size="icon"><Eye size={16} /></Button></Link>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(resource)}><Pencil size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(resource)}><Wrench size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(resource)}><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!resources.length && (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center text-sm text-muted-foreground">
                      No resources match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ResourceFormModal
        isOpen={modalState.open}
        initialData={modalState.resource}
        onClose={closeModal}
        onSubmit={handleSave}
        submitLabel={modalState.resource ? 'Save changes' : 'Create resource'}
        title={modalState.resource ? 'Edit facility or asset' : 'Add facility or asset'}
        busy={busy}
        error={submitError}
      />
    </div>
  );
};

const DeskMetric = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);
