import React from 'react';
import { Filter, Plus, RefreshCcw, Search, X } from 'lucide-react';
import { Button, Input, Badge } from '../ui/Primitives';
import { RESOURCE_STATUSES, RESOURCE_TYPES, formatResourceStatus, formatResourceType } from '../../lib/moduleAApi';

const DEFAULT_FILTER = 'ALL';

const activeFilterEntries = (filters) => ([
  filters.search ? { key: 'search', label: `Search: ${filters.search}` } : null,
  filters.type !== DEFAULT_FILTER ? { key: 'type', label: formatResourceType(filters.type) } : null,
  filters.status !== DEFAULT_FILTER ? { key: 'status', label: formatResourceStatus(filters.status) } : null,
  filters.location ? { key: 'location', label: `Location: ${filters.location}` } : null,
  filters.capacity ? { key: 'capacity', label: `Capacity >= ${filters.capacity}` } : null,
].filter(Boolean));

export const hasActiveResourceFilters = (filters) => activeFilterEntries(filters).length > 0;

export const AdminResourceFilters = ({
  filters,
  loading = false,
  onChange,
  onCreate,
  onRefresh,
  onReset,
  filteredCount = 0,
  totalCount = 0,
}) => {
  const filterBadges = activeFilterEntries(filters);
  const countLabel = totalCount > filteredCount
    ? `Showing ${filteredCount} of ${totalCount} resources`
    : `Showing ${filteredCount} resources`;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr]">
          <label className="relative block md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              className="pl-10"
              placeholder="Search by name, location, or description"
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
            />
          </label>

          <select
            className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5"
            value={filters.type}
            onChange={(event) => onChange('type', event.target.value)}
          >
            <option value={DEFAULT_FILTER}>All types</option>
            {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{formatResourceType(type)}</option>)}
          </select>

          <select
            className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5"
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value={DEFAULT_FILTER}>All statuses</option>
            {RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{formatResourceStatus(status)}</option>)}
          </select>

          <Input
            placeholder="Location"
            value={filters.location}
            onChange={(event) => onChange('location', event.target.value)}
          />

          <Input
            type="number"
            min="0"
            placeholder="Min capacity"
            value={filters.capacity}
            onChange={(event) => onChange('capacity', event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Button variant="outline" className="gap-2" onClick={onRefresh} isLoading={loading}>
            <RefreshCcw size={16} />
            Refresh
          </Button>
          <Button className="gap-2 whitespace-nowrap" onClick={onCreate}>
            <Plus size={16} />
            Add resource
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral" className="gap-2 px-3 py-1.5 text-xs">
            <Filter size={12} />
            {countLabel}
          </Badge>
          {filterBadges.map((item) => (
            <Badge key={item.key} variant="info" className="px-3 py-1.5 text-xs">
              {item.label}
            </Badge>
          ))}
        </div>

        {filterBadges.length > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={onReset}
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
};
