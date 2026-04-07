import React, { useState } from 'react';
import { MOCK_TICKETS, MOCK_RESOURCES } from '../mockData';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { Ticket as TicketIcon, Clock, MapPin, AlertCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const MyTickets = () => {
  const [filter, setFilter] = useState('ALL');

  const filteredTickets = MOCK_TICKETS.filter(t => filter === 'ALL' || t.status === filter);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground mt-1">Monitor the status of your reported issues.</p>
        </div>
        <Button onClick={() => window.location.href = '/tickets/new'}>Report New Issue</Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((status) => (
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
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => {
          const resource = MOCK_RESOURCES.find(r => r.id === ticket.resourceId);
          return (
            <Card key={ticket.id} className="p-0 overflow-hidden hover:border-primary/30 transition-all group">
              <div className="flex flex-col md:flex-row">
                <div className={cn(
                  "w-2 md:w-3 shrink-0",
                  ticket.priority === 'HIGH' ? 'bg-danger' : 
                  ticket.priority === 'MEDIUM' ? 'bg-warning' : 'bg-success'
                )} />
                <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">#{ticket.id}</span>
                      <Badge variant={
                        ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'success' : 
                        ticket.status === 'IN_PROGRESS' ? 'info' : 
                        ticket.status === 'REJECTED' ? 'danger' : 'warning'
                      }>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={ticket.priority === 'HIGH' ? 'danger' : 'neutral'}>
                        {ticket.priority} Priority
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{ticket.description}</h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} /> {resource?.name} — {resource?.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} /> Reported {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} /> {ticket.category}
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" className="md:self-center gap-2 group-hover:translate-x-1 transition-transform">
                    View Details <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredTickets.length === 0 && (
          <div className="py-20 text-center bg-card border border-dashed border-border rounded-2xl">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <TicketIcon size={24} />
            </div>
            <h3 className="font-bold">No tickets found</h3>
            <p className="text-muted-foreground">You haven't reported any issues yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
