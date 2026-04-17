import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Filter, MapPin, Search, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card, Input, Badge, NoticeBanner } from '../components/ui/Primitives';
import { ResourceStatusBadge } from '../components/resources/ResourceStatusBadge';
import {
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  formatAvailabilityWindow,
  formatResourceType,
  getResources,
} from '../lib/moduleAApi';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const Catalogue = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    type: 'ALL',
    status: 'ALL',
    capacity: '',
    location: '',
  });
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadResources = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getResources(filters);
        if (!ignore) setResources(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load the facilities catalogue.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(loadResources, 180);
    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [filters]);

  const summary = useMemo(() => ({
    total: resources.length,
    active: resources.filter((resource) => resource.status === 'ACTIVE').length,
    unavailable: resources.filter((resource) => resource.status === 'OUT_OF_SERVICE').length,
  }), [resources]);

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="eyebrow mb-4">Facilities and assets catalogue</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find the right room, lab, or equipment with live operational context built in.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Module A now runs as a real catalogue service instead of a static mock. Search by type, capacity, location, and status while keeping booking readiness visible at a glance.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/bookings/new"><Button>Start booking workflow</Button></Link>
              {user?.role === 'ADMIN' && (
                <Link to="/admin/resources"><Button variant="outline">Open resource desk</Button></Link>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetricCard label="Resources listed" value={`${summary.total}`} />
            <MetricCard label="Ready to book" value={`${summary.active}`} />
            <MetricCard label="Out of service" value={`${summary.unavailable}`} />
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1.2fr_0.75fr_0.75fr_0.7fr_0.9fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              className="pl-10"
              placeholder="Search by name, location, or description..."
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
            <option value="ALL">All types</option>
            {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="ALL">All statuses</option>
            {RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <Input type="number" min="0" placeholder="Min capacity" value={filters.capacity} onChange={(event) => setFilters((current) => ({ ...current, capacity: event.target.value }))} />
          <Input placeholder="Location" value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} />
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Badge variant="info" className="gap-2"><Filter size={12} /> Live filters</Badge>
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilters((current) => ({ ...current, type: current.type === type ? 'ALL' : type }))}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
              filters.type === type
                ? 'border-primary bg-primary text-white shadow-[0_16px_32px_rgba(15,118,110,0.22)]'
                : 'bg-white/40 text-muted-foreground border-border hover:border-primary/40 dark:bg-white/5'
            )}
          >
            {formatResourceType(type)}
          </button>
        ))}
      </div>

      {error && (
        <NoticeBanner variant="error" onDismiss={() => setError('')}>
          {error}
        </NoticeBanner>
      )}

      {loading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading live resource data...</Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="group flex h-full flex-col overflow-hidden p-0 bg-white/70 dark:bg-white/5">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={resource.imageUrl || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800'}
                    alt={resource.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4">
                    <Badge variant="info">{formatResourceType(resource.type)}</Badge>
                  </div>
                  <div className="absolute right-4 top-4">
                    <ResourceStatusBadge status={resource.status} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent opacity-80" />
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Availability window</p>
                    <p className="mt-1 text-sm font-semibold">{resource.availabilityWindow.openTime} - {resource.availabilityWindow.closeTime}</p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">{resource.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {resource.description || 'No additional description was provided for this resource.'}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <ResourceMeta icon={<MapPin size={14} />} label="Location" value={resource.location} />
                    <ResourceMeta icon={<Users size={14} />} label="Capacity" value={`${resource.capacity}`} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-muted/70 px-4 py-3 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                      <Clock3 size={12} />
                      Availability note
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {resource.availabilityWindow.notes || formatAvailabilityWindow(resource.availabilityWindow)}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    {resource.status === 'ACTIVE' ? (
                      <Link to={`/bookings/new?resourceId=${resource.id}`} className="flex-1">
                        <Button className="w-full">Book now</Button>
                      </Link>
                    ) : (
                      <div className="flex-1">
                        <Button className="w-full" disabled>Book now</Button>
                      </div>
                    )}
                    <Link to={`/catalogue/${resource.id}`}>
                      <Button variant="outline">Details</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !resources.length && !error && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Search size={28} />
          </div>
          <h3 className="text-xl font-bold">No resources found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setFilters({ search: '', type: 'ALL', status: 'ALL', capacity: '', location: '' })}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <Card className="bg-white/60 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);

const ResourceMeta = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-border bg-white/35 px-4 py-3 dark:bg-white/5">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-2 text-sm font-medium">{value}</p>
  </div>
);
