import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Radar,
  Activity,
  UserCog,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button, Badge } from '../components/ui/Primitives';
import { getNotifications } from '../lib/operationsApi';

const SidebarItem = ({ item, collapsed, active }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-200',
        active
          ? 'border-primary/30 bg-primary text-white shadow-[0_18px_36px_rgba(15,118,110,0.24)]'
          : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-white/40 dark:hover:bg-white/5 hover:text-foreground'
      )}
    >
      {active && <div className="absolute inset-y-2 left-1 w-1 rounded-full bg-white/90" />}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
          active ? 'bg-white/14 text-white' : 'bg-muted/70 text-primary'
        )}
      >
        <Icon size={18} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.label}</p>
          <p className={cn('truncate text-xs', active ? 'text-white/75' : 'text-muted-foreground')}>{item.hint}</p>
        </div>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 rounded-lg bg-slate-950 px-2 py-1 text-xs text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 z-50 whitespace-nowrap">
          {item.label}
        </div>
      )}
    </Link>
  );
};

const isActivePath = (pathname, itemPath) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

const routeTitle = (pathname, items) => items.find((item) => isActivePath(pathname, item.to))?.label ?? 'Operations';

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [latestTechnicianAlert, setLatestTechnicianAlert] = React.useState(null);
  const seenNotificationIdsRef = React.useRef(new Set());
  const technicianAlertBootstrappedRef = React.useRef(false);
  const displayName = user?.name || user?.email?.split('@')?.[0] || 'Campus User';

  React.useEffect(() => {
    if (!user || user.role !== 'TECHNICIAN') {
      setLatestTechnicianAlert(null);
      seenNotificationIdsRef.current = new Set();
      technicianAlertBootstrappedRef.current = false;
      return undefined;
    }

    const storageKey = `hub_seen_notifications_${user.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      seenNotificationIdsRef.current = new Set(saved);
    } catch (_) {
      seenNotificationIdsRef.current = new Set();
    }

    const persistSeen = () => {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(seenNotificationIdsRef.current)));
    };

    const maybeNotify = (notification) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
        return;
      }
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          tag: `technician-alert-${notification.id}`,
        });
      }
    };

    const pollNotifications = async () => {
      try {
        const notifications = await getNotifications({ role: user.role, userId: user.id });
        const assignmentAlerts = notifications.filter((item) => item.type === 'TICKET_STATUS');

        if (!technicianAlertBootstrappedRef.current) {
          seenNotificationIdsRef.current = new Set(assignmentAlerts.map((item) => item.id));
          persistSeen();
          technicianAlertBootstrappedRef.current = true;
          return;
        }

        const freshAlerts = assignmentAlerts.filter((item) => !seenNotificationIdsRef.current.has(item.id));
        if (!freshAlerts.length) return;

        freshAlerts.forEach((alert) => seenNotificationIdsRef.current.add(alert.id));
        persistSeen();

        const newestAlert = freshAlerts[0];
        setLatestTechnicianAlert(newestAlert);
        maybeNotify(newestAlert);
      } catch (_) {
        // quiet poll failure keeps the shell stable
      }
    };

    pollNotifications();
    const intervalId = window.setInterval(pollNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, [user]);

  const overviewItem = { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', hint: 'Campus pulse' };
  const catalogueItem = { to: '/catalogue', icon: Search, label: 'Catalogue', hint: 'Find spaces and assets' };
  const signalsItem = { to: '/notifications', icon: Bell, label: 'Signals', hint: 'Alerts and activity' };
  const settingsItem = { to: '/settings', icon: Settings, label: 'Settings', hint: 'Preferences and theme' };

  const userPrimaryItems = [
    overviewItem,
    catalogueItem,
    { to: '/bookings/my', icon: CalendarRange, label: 'My Bookings', hint: 'Reservations and requests' },
    { to: '/tickets/my', icon: Ticket, label: 'My Tickets', hint: 'Report and track repairs' },
    signalsItem,
  ];

  const technicianPrimaryItems = [
    overviewItem,
    { to: '/tickets/assigned', icon: Wrench, label: 'Assigned Work', hint: 'Technician queue' },
    signalsItem,
  ];

  const adminPrimaryItems = [
    overviewItem,
    { to: '/admin/resources', icon: Building2, label: 'Resource Desk', hint: 'Facilities and assets' },
    { to: '/admin/bookings', icon: CalendarRange, label: 'Booking Desk', hint: 'Approve and monitor requests' },
    { to: '/admin/tickets', icon: ShieldCheck, label: 'Incident Desk', hint: 'Triage and assignment' },
    { to: '/admin/users', icon: UserCog, label: 'User Access', hint: 'Roles, status, invites' },
  ];

  const supportItems = user?.role === 'ADMIN' ? [signalsItem] : [];

  const primaryItems = user?.role === 'ADMIN'
    ? adminPrimaryItems
    : user?.role === 'TECHNICIAN'
      ? technicianPrimaryItems
      : userPrimaryItems;

  const allItems = [...primaryItems, ...supportItems, settingsItem];
  const primaryHeading = user?.role === 'ADMIN' ? 'Operations Desk' : 'Mission Control';
  const supportHeading = 'Signals';

  const requestViewRefresh = () => {
    if (typeof window !== 'undefined') {
      // Let individual pages listen if they need targeted refetch behavior.
      window.dispatchEvent(new Event('tickets:refresh'));
      window.dispatchEvent(new Event('module:refresh'));
    }
    // Remount current module page view without full browser reload.
    setRefreshNonce((value) => value + 1);
  };

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={cn(
          'hidden md:flex h-screen sticky top-0 shrink-0 flex-col border-r border-border bg-[var(--panel-strong)] backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-24' : 'w-80'
        )}
      >
        <div className="border-b border-border p-5">
          <div className="glass-panel p-4">
            <div className="flex items-start justify-between gap-3">
              {!collapsed && (
                <div>
                  <div className="eyebrow mb-3">
                    <Radar size={14} />
                    Operations grid
                  </div>
                  <p className="text-xl font-semibold tracking-tight">Smart Campus Hub</p>
                  <p className="mt-1 text-sm text-muted-foreground">Smart Campus Hub now adapts to reporter, admin, and technician responsibility.</p>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)} className="shrink-0">
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </Button>
            </div>
            {!collapsed && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/25 text-primary-foreground">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Role-aware workspace online</p>
                  <p className="text-xs text-slate-300">{user?.role === 'ADMIN' ? 'Admin control desk active' : user?.role === 'TECHNICIAN' ? 'Assigned work queue active' : 'Reporter ticket tracking active'}</p>
                </div>
              </div>
            )}
            {!collapsed && user?.role === 'TECHNICIAN' && latestTechnicianAlert && (
              <div className="mt-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-foreground">
                <div className="flex items-center gap-2 font-semibold">
                  <Bell size={16} className="text-warning" />
                  New technician alert
                </div>
                <p className="mt-2 text-muted-foreground">{latestTechnicianAlert.message}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-2">
            {!collapsed && <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{primaryHeading}</p>}
            {primaryItems.map((item) => (
              <SidebarItem key={item.to} item={item} collapsed={collapsed} active={isActivePath(location.pathname, item.to)} />
            ))}
          </div>

          {!!supportItems.length && (
            <div className="mt-8 space-y-2">
              {!collapsed && <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{supportHeading}</p>}
              {supportItems.map((item) => (
                <SidebarItem key={item.to} item={item} collapsed={collapsed} active={isActivePath(location.pathname, item.to)} />
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-border p-4">
          <div className="space-y-2">
            <SidebarItem item={settingsItem} collapsed={collapsed} active={isActivePath(location.pathname, '/settings')} />
            <button
              onClick={logout}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-danger transition-all hover:border-danger/10 hover:bg-danger/10',
                collapsed && 'justify-center'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
                <LogOut size={18} />
              </div>
              {!collapsed && (
                <div className="text-left">
                  <p className="text-sm font-semibold">Sign out</p>
                  <p className="text-xs text-danger/80">End session securely</p>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/45 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="h-full w-80 bg-[var(--panel-strong)] p-5 backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Smart Campus Hub</p>
                  <p className="mt-1 text-lg font-semibold">Mission Control</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <ChevronLeft size={18} />
                </Button>
              </div>

              <div className="space-y-2">
                {primaryItems.map((item) => (
                  <SidebarItem key={item.to} item={item} collapsed={false} active={isActivePath(location.pathname, item.to)} />
                ))}
                {!!supportItems.length && (
                  <>
                    <p className="px-2 pt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{supportHeading}</p>
                    {supportItems.map((item) => (
                      <SidebarItem key={item.to} item={item} collapsed={false} active={isActivePath(location.pathname, item.to)} />
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-border bg-[var(--panel)] px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu size={18} />
              </Button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Campus operations</p>
                <h1 className="text-lg font-semibold">{routeTitle(location.pathname, allItems)}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={requestViewRefresh}>
                <RefreshCw size={16} />
                Refresh
              </Button>
              <div className="hidden rounded-2xl border border-border bg-white/45 px-4 py-2 text-right backdrop-blur-sm md:block dark:bg-white/5">
                <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Live
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">Smart Campus Hub role boundaries active</p>
              </div>

              <div className="glass-panel flex items-center gap-3 px-3 py-2">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <img src={user?.avatar} alt="Avatar" className="h-10 w-10 rounded-2xl border border-border bg-muted/80" />
                <Badge variant="info">{user?.role}</Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 md:px-8 md:py-8">
          <motion.div
            key={`${location.pathname}:${refreshNonce}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};



