import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Eye, MapPin, Pencil, Trash2, Users, Wrench } from 'lucide-react';
import { Button, Card, Badge } from '../ui/Primitives';
import { ResourceStatusBadge } from './ResourceStatusBadge';
import { formatAvailabilityWindow, formatResourceType } from '../../lib/moduleAApi';

const actionIsBusy = (busyAction, resourceId, action) => busyAction?.resourceId === resourceId && busyAction?.type === action;

export const AdminResourceList = ({
  resources,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  busyAction = null,
  onResetFilters,
}) => {
  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground">Loading resource operations desk...</Card>;
  }

  if (!resources.length) {
    return (
      <Card className="p-10 text-center">
        <Badge variant="neutral" className="px-3 py-1.5 text-xs">No matches</Badge>
        <h2 className="mt-4 text-2xl font-semibold">No resources match the current admin view.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
          Try widening the search, clearing filters, or adding a new facility so the catalogue stays ready for future booking workflows.
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={onResetFilters}>Clear filters</Button>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:hidden">
        {resources.map((resource) => (
          <Card key={resource.id} className="space-y-5 bg-white/75 p-5 dark:bg-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{resource.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatResourceType(resource.type)}</p>
              </div>
              <ResourceStatusBadge status={resource.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoPill icon={<MapPin size={14} />} label="Location" value={resource.location} />
              <InfoPill icon={<Users size={14} />} label="Capacity" value={`${resource.capacity}`} />
              <InfoPill icon={<Clock3 size={14} />} label="Availability" value={formatAvailabilityWindow(resource.availabilityWindow)} className="sm:col-span-2" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/catalogue/${resource.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye size={14} />
                  View
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(resource)} disabled={!!busyAction}>
                <Pencil size={14} />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onToggleStatus(resource)}
                isLoading={actionIsBusy(busyAction, resource.id, 'status')}
              >
                <Wrench size={14} />
                {resource.status === 'ACTIVE' ? 'Mark out of service' : 'Restore'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="gap-2"
                onClick={() => onDelete(resource)}
                isLoading={actionIsBusy(busyAction, resource.id, 'delete')}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden bg-white/75 p-0 xl:block dark:bg-white/5">
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
                <tr key={resource.id} className="border-t border-border/70 align-top">
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
                  <td className="px-5 py-5">
                    <ResourceStatusBadge status={resource.status} />
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex justify-end gap-2">
                      <Link to={`/catalogue/${resource.id}`}>
                        <Button variant="ghost" size="icon" aria-label={`View ${resource.name}`}>
                          <Eye size={16} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(resource)} disabled={!!busyAction} aria-label={`Edit ${resource.name}`}>
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStatus(resource)}
                        isLoading={actionIsBusy(busyAction, resource.id, 'status')}
                        aria-label={resource.status === 'ACTIVE' ? `Mark ${resource.name} out of service` : `Restore ${resource.name}`}
                      >
                        <Wrench size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger"
                        onClick={() => onDelete(resource)}
                        isLoading={actionIsBusy(busyAction, resource.id, 'delete')}
                        aria-label={`Delete ${resource.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};

const InfoPill = ({ icon, label, value, className = '' }) => (
  <div className={`rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 ${className}`.trim()}>
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {label}
    </p>
    <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
  </div>
);

