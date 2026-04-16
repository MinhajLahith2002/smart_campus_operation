import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui/Primitives';
import { ResourceStatusBadge } from '../components/resources/ResourceStatusBadge';
import { formatAvailabilityWindow, formatResourceType, getResource } from '../lib/moduleAApi';
import { useAuth } from '../context/AuthContext';

export const ResourceDetailPage = () => {
  const navigate = useNavigate();
  const { resourceId } = useParams();
  const { user } = useAuth();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadResource = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getResource(resourceId);
        if (!ignore) setResource(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load resource details.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadResource();
    return () => { ignore = true; };
  }, [resourceId]);

  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground">Loading resource profile...</Card>;
  }

  if (error || !resource) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Resource not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'The resource profile could not be loaded.'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/catalogue')}>Back to catalogue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="surface-strong overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">{formatResourceType(resource.type)}</Badge>
              <ResourceStatusBadge status={resource.status} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">{resource.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {resource.description || 'This resource currently has no extended operational description.'}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <DetailCard icon={<MapPin size={16} className="text-primary" />} label="Location" value={resource.location} />
              <DetailCard icon={<Users size={16} className="text-primary" />} label="Capacity" value={`${resource.capacity}`} />
              <DetailCard icon={<Clock3 size={16} className="text-primary" />} label="Availability" value={formatAvailabilityWindow(resource.availabilityWindow)} />
              <DetailCard icon={<ShieldCheck size={16} className="text-primary" />} label="Status" value={resource.status === 'ACTIVE' ? 'Available for request review' : 'Unavailable until restored'} />
            </div>

            {resource.availabilityWindow?.notes && (
              <Card className="mt-6 border-primary/20 bg-primary/5 p-5">
                <p className="text-sm font-semibold">Operational note</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{resource.availabilityWindow.notes}</p>
              </Card>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {resource.status === 'ACTIVE' ? (
                <Link to={`/bookings/new?resourceId=${resource.id}`}>
                  <Button>Start booking request</Button>
                </Link>
              ) : (
                <Button disabled>Start booking request</Button>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin/resources">
                  <Button variant="outline">Manage resources</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="min-h-80 bg-slate-950">
            <img
              src={resource.imageUrl || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800'}
              alt={resource.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const DetailCard = ({ icon, label, value }) => (
  <Card className="bg-white/70 p-5 dark:bg-white/5">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-3 text-sm font-semibold">{value}</p>
  </Card>
);
