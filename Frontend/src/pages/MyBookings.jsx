import React, { useState } from 'react';
import { MOCK_BOOKINGS, MOCK_RESOURCES } from '../mockData';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { Calendar, Clock, MapPin, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const MyBookings = () => {
  const [filter, setFilter] = useState('ALL');

  const filteredBookings = MOCK_BOOKINGS.filter(b => filter === 'ALL' || b.status === filter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Track and manage your facility reservations.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
              filter === status 
                ? "bg-primary text-white border-primary shadow-md" 
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredBookings.map((booking) => {
          const resource = MOCK_RESOURCES.find(r => r.id === booking.resourceId);
          return (
            <Card key={booking.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden shrink-0">
                    <img src={resource?.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{resource?.name}</h3>
                      <Badge variant={
                        booking.status === 'APPROVED' ? 'success' : 
                        booking.status === 'PENDING' ? 'warning' : 
                        booking.status === 'REJECTED' ? 'danger' : 'neutral'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} /> {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} /> {booking.startTime} - {booking.endTime}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} /> {resource?.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Info size={14} /> {booking.purpose}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:self-start">
                  {booking.status === 'PENDING' && (
                    <Button variant="outline" size="sm" className="text-danger hover:bg-danger/10 border-danger/20 gap-2">
                      <XCircle size={16} /> Cancel
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">View Details</Button>
                </div>
              </div>
              
              {booking.rejectionReason && (
                <div className="mt-4 p-3 bg-danger/5 border border-danger/10 rounded-xl text-sm text-danger">
                  <span className="font-bold">Rejection Reason:</span> {booking.rejectionReason}
                </div>
              )}
            </Card>
          );
        })}

        {filteredBookings.length === 0 && (
          <div className="py-20 text-center bg-card border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">No bookings found for this status.</p>
          </div>
        )}
      </div>
    </div>
  );
};
