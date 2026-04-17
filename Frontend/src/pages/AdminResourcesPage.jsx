import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, PlusCircle, ShieldCheck } from 'lucide-react';
import { Card, Badge } from '../components/ui/Primitives';
import { ResourceFormModal } from '../components/resources/ResourceFormModal';
import { AdminResourceFilters, hasActiveResourceFilters } from '../components/resources/AdminResourceFilters';
import { AdminResourceList } from '../components/resources/AdminResourceList';
import { ResourceActionDialog } from '../components/resources/ResourceActionDialog';
import {
  createResource,
  deleteResource,
  getResources,
  updateResource,
  updateResourceStatus,
} from '../lib/moduleAApi';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FILTER = 'ALL';
const DEFAULT_FILTERS = {
  search: '',
  type: DEFAULT_FILTER,
  status: DEFAULT_FILTER,
  location: '',
  capacity: '',
};

export const AdminResourcesPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [modalState, setModalState] = useState({ open: false, resource: null });
  const [submitError, setSubmitError] = useState('');
  const [busySubmit, setBusySubmit] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const requestIdRef = useRef(0);

  const loadResources = useCallback(async (nextFilters, { silent = false } = {}) => {
    const requestId = ++requestIdRef.current;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getResources(nextFilters);
      if (requestId !== requestIdRef.current) return;
      setResources(data);
      setError('');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Unable to load resource management data.');
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadResources(filters);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [filters, loadResources]);

  const summary = useMemo(() => {
    const active = resources.filter((resource) => resource.status === 'ACTIVE').length;
    const unavailable = resources.filter((resource) => resource.status === 'OUT_OF_SERVICE').length;

    return {
      total: resources.length,
      active,
      unavailable,
      attention: unavailable,
    };
  }, [resources]);

  const activeFilterMode = hasActiveResourceFilters(filters);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const refreshResources = async () => {
    await loadResources(filters, { silent: true });
  };

  const closeModal = () => {
    setModalState({ open: false, resource: null });
    setSubmitError('');
  };

  const openCreate = () => {
    setNotice(null);
    setSubmitError('');
    setModalState({ open: true, resource: null });
  };

  const openEdit = (resource) => {
    setNotice(null);
    setSubmitError('');
    setModalState({ open: true, resource });
  };

  const handleSave = async (payload) => {
    try {
      setBusySubmit(true);
      setSubmitError('');

      if (modalState.resource) {
        await updateResource(modalState.resource.id, payload, user.role);
        setNotice({ type: 'success', message: 'Resource updated successfully.' });
      } else {
        await createResource(payload, user.role);
        setNotice({ type: 'success', message: 'Resource created successfully.' });
      }

      closeModal();
      await loadResources(filters, { silent: true });
    } catch (err) {
      setSubmitError(err.message || 'Unable to save the resource.');
      throw err;
    } finally {
      setBusySubmit(false);
    }
  };

  const requestDelete = (resource) => {
    setConfirmState({
      type: 'delete',
      resource,
      title: `Delete ${resource.name}?`,
      description: 'This removes the resource from the shared catalogue. Use this only when the asset record should no longer exist.',
      confirmLabel: 'Delete resource',
      confirmVariant: 'danger',
    });
  };

  const requestToggleStatus = (resource) => {
    const nextStatus = resource.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE';
    setConfirmState({
      type: 'status',
      resource,
      nextStatus,
      title: nextStatus === 'OUT_OF_SERVICE' ? `Mark ${resource.name} out of service?` : `Restore ${resource.name}?`,
      description: nextStatus === 'OUT_OF_SERVICE'
        ? 'This will make the resource appear unavailable for downstream booking workflows until an admin restores it.'
        : 'This will return the resource to the active catalogue and make it available for future booking checks.',
      confirmLabel: nextStatus === 'OUT_OF_SERVICE' ? 'Mark out of service' : 'Restore resource',
      confirmVariant: nextStatus === 'OUT_OF_SERVICE' ? 'danger' : 'primary',
    });
  };

  const closeConfirm = () => {
    if (busyAction) return;
    setConfirmState(null);
  };

  const handleConfirm = async () => {
    if (!confirmState?.resource) return;

    try {
      setBusyAction({ type: confirmState.type, resourceId: confirmState.resource.id });
      setError('');
      setNotice(null);

      if (confirmState.type === 'delete') {
        await deleteResource(confirmState.resource.id, user.role);
        setNotice({ type: 'success', message: 'Resource deleted successfully.' });
      } else if (confirmState.type === 'status') {
        await updateResourceStatus(confirmState.resource.id, confirmState.nextStatus, user.role);
        setNotice({
          type: 'success',
          message: confirmState.nextStatus === 'OUT_OF_SERVICE'
            ? 'Resource marked out of service.'
            : 'Resource restored to active service.',
        });
      }

      setConfirmState(null);
      await loadResources(filters, { silent: true });
    } catch (err) {
      setError(err.message || 'Unable to complete this resource action.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module A admin desk</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Run the facilities catalogue with cleaner search, safer actions, and booking-ready visibility.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This admin desk keeps campus resource data reliable for the rest of the system. The workflow below is focused on fast edits, clear operational status, and low-friction catalogue maintenance.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge variant="info" className="px-3 py-1.5 text-xs">
                <ShieldCheck size={12} className="mr-1 inline" />
                Admin workflow only
              </Badge>
              <Badge variant={activeFilterMode ? 'warning' : 'neutral'} className="px-3 py-1.5 text-xs">
                {activeFilterMode ? 'Filtered operational view' : 'Full catalogue view'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DeskMetric label="Visible now" value={`${summary.total}`} icon={<PlusCircle size={16} />} />
            <DeskMetric label="Active" value={`${summary.active}`} icon={<CheckCircle2 size={16} />} variant="success" />
            <DeskMetric label="Needs attention" value={`${summary.attention}`} icon={<AlertTriangle size={16} />} variant="warning" />
            <DeskMetric label="Out of service" value={`${summary.unavailable}`} icon={<AlertTriangle size={16} />} variant="danger" />
          </div>
        </div>
      </section>

      <AdminResourceFilters
        filters={filters}
        filteredCount={summary.total}
        totalCount={summary.total}
        loading={refreshing}
        onChange={updateFilter}
        onCreate={openCreate}
        onRefresh={refreshResources}
        onReset={resetFilters}
      />

      {notice && (
        <Card className={notice.type === 'success' ? 'border-success/20 bg-success/5 p-4 text-sm text-success' : 'border-warning/20 bg-warning/5 p-4 text-sm text-warning'}>
          {notice.message}
        </Card>
      )}
      {error && <Card className="border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</Card>}

      <AdminResourceList
        resources={resources}
        loading={loading}
        busyAction={busyAction}
        onEdit={openEdit}
        onDelete={requestDelete}
        onToggleStatus={requestToggleStatus}
        onResetFilters={resetFilters}
      />

      <ResourceFormModal
        isOpen={modalState.open}
        initialData={modalState.resource}
        onClose={closeModal}
        onSubmit={handleSave}
        submitLabel={modalState.resource ? 'Save changes' : 'Create resource'}
        title={modalState.resource ? 'Edit facility or asset' : 'Add facility or asset'}
        busy={busySubmit}
        error={submitError}
      />

      <ResourceActionDialog
        isOpen={!!confirmState}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        confirmVariant={confirmState?.confirmVariant}
        busy={!!busyAction}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

const DeskMetric = ({ label, value, icon, variant = 'neutral' }) => (
  <Card className="bg-white/65 p-5 dark:bg-white/5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <div className={
        variant === 'success'
          ? 'text-success'
          : variant === 'warning'
            ? 'text-warning'
            : variant === 'danger'
              ? 'text-danger'
              : 'text-secondary-accent'
      }>
        {icon}
      </div>
    </div>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);

