import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle2, Clock3, MessageSquareMore, ShieldAlert, Wrench } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui/Primitives';
import { MOCK_NOTIFICATIONS } from '../mockData';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const notificationStyles = {
  BOOKING_STATUS: {
    icon: CheckCircle2,
    badge: 'info',
    label: 'Booking signal',
  },
  TICKET_STATUS: {
    icon: Wrench,
    badge: 'warning',
    label: 'Ticket signal',
  },
  NEW_COMMENT: {
    icon: MessageSquareMore,
    badge: 'neutral',
    label: 'Comment',
  },
  RESOURCE_STATUS: {
    icon: ShieldAlert,
    badge: 'danger',
    label: 'Resource alert',
  },
};

export const NotificationsPage = () => {
  const { user } = useAuth();
  const notifications = MOCK_NOTIFICATIONS.filter(
    (item) => item.userId === user?.id || item.userId === user?.role?.toLowerCase?.()
  );

  const visibleNotifications = notifications.length ? notifications : MOCK_NOTIFICATIONS;
  const unreadCount = visibleNotifications.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Module D</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Signals and notifications keep each role aligned with live booking and maintenance events.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The handover calls out notifications as a dedicated module. This screen groups status changes, operational prompts, and role-relevant alerts into one review queue instead of leaving Signals empty.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Signal health</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <SignalMetric label="Unread" value={`${unreadCount}`} />
              <SignalMetric label="Total events" value={`${visibleNotifications.length}`} />
              <SignalMetric label="Booking events" value={`${visibleNotifications.filter((item) => item.type === 'BOOKING_STATUS').length}`} />
              <SignalMetric label="Ticket alerts" value={`${visibleNotifications.filter((item) => item.type !== 'BOOKING_STATUS').length}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notification feed</h2>
          <Button variant="outline" className="gap-2">
            <Bell size={16} />
            Mark all as reviewed
          </Button>
        </div>

        <div className="space-y-3">
          {visibleNotifications.map((notification) => {
            const config = notificationStyles[notification.type] || notificationStyles.NEW_COMMENT;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  'flex items-start gap-4 bg-white/70 p-5 transition-all dark:bg-white/5',
                  !notification.isRead && 'border-primary/25 shadow-[0_18px_36px_rgba(37,99,235,0.08)]'
                )}
              >
                <div className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                  !notification.isRead ? 'bg-primary/12 text-primary' : 'bg-muted/70 text-muted-foreground'
                )}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={config.badge}>{config.label}</Badge>
                    {!notification.isRead && <Badge variant="info">Unread</Badge>}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{notification.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{notification.message}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 size={14} />
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const SignalMetric = ({ label, value }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </div>
);
