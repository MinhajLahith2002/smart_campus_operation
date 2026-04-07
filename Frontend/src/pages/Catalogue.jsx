import React, { useState } from 'react';
import { Search, Filter, Users, MapPin, Info, ArrowRight, Clock3, Layers3 } from 'lucide-react';
import { MOCK_RESOURCES } from '../mockData';
import { Card, Button, Input, Badge } from '../components/ui/Primitives';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Catalogue = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredResources = MOCK_RESOURCES.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                         r.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="eyebrow mb-4">Facilities and assets catalogue</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find the right room, lab, or equipment with operational context built in.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The catalogue now behaves more like a campus inventory surface than a plain listing page. Each resource exposes availability, health, type, and booking readiness at a glance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetricCard label="Resources listed" value={`${MOCK_RESOURCES.length}`} />
            <MetricCard label="Ready to book" value={`${MOCK_RESOURCES.filter((r) => r.status === 'ACTIVE').length}`} />
            <MetricCard label="Out of service" value={`${MOCK_RESOURCES.filter((r) => r.status !== 'ACTIVE').length}`} />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by resource name or location..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter size={18} />
            Smart filters
          </Button>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
              typeFilter === type
                ? 'border-primary bg-primary text-white shadow-[0_16px_32px_rgba(15,118,110,0.22)]'
                : 'bg-white/40 text-muted-foreground border-border hover:border-primary/40 dark:bg-white/5'
            )}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource, index) => (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="group flex h-full flex-col overflow-hidden p-0 bg-white/70 dark:bg-white/5">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={resource.imageUrl}
                  alt={resource.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute left-4 top-4">
                  <Badge variant="info">{resource.type.replace('_', ' ')}</Badge>
                </div>
                <div className="absolute right-4 top-4">
                  <Badge variant={resource.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {resource.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white backdrop-blur-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Booking window</p>
                    <p className="mt-1 text-sm font-semibold">{resource.availableFrom} - {resource.availableTo}</p>
                  </div>
                  <Clock3 size={18} className="text-slate-200" />
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{resource.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {resource.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ResourceMeta icon={<MapPin size={14} />} label="Location" value={resource.location} />
                  <ResourceMeta icon={<Users size={14} />} label="Capacity" value={`${resource.capacity}`} />
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="mt-6 rounded-2xl bg-muted/70 px-4 py-3 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                      <Layers3 size={12} />
                      Operational note
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {resource.status === 'ACTIVE'
                        ? 'Ready for request submission and schedule review.'
                        : 'Currently unavailable while campus teams resolve a service or maintenance issue.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Link to={`/bookings/new?resourceId=${resource.id}`} className="flex-1">
                    <Button
                      className="w-full gap-2"
                      disabled={resource.status !== 'ACTIVE'}
                    >
                      Book Now <ArrowRight size={16} />
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" aria-label={`View details for ${resource.name}`}>
                    <Info size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold">No resources found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          <Button variant="ghost" className="mt-4" onClick={() => { setSearch(''); setTypeFilter('ALL'); }}>
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

const ResourceMeta = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-border bg-white/35 px-4 py-3 dark:bg-white/5">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-2 text-sm font-medium">{value}</p>
  </div>
);
