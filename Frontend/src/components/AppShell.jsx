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

  const ticketItem = user?.role === 'ADMIN'
    ? { to: '/admin/tickets', icon: ShieldCheck, label: 'Incident Desk', hint: 'Triage and assignment' }
    : user?.role === 'TECHNICIAN'
      ? { to: '/tickets/assigned', icon: Wrench, label: 'Assigned Work', hint: 'Technician queue' }
      : { to: '/tickets/my', icon: Ticket, label: 'My Tickets', hint: 'Report and track repairs' };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', hint: 'Campus pulse' },
    { to: '/catalogue', icon: Search, label: 'Catalogue', hint: 'Find spaces and assets' },
    { to: '/bookings/my', icon: CalendarRange, label: 'Bookings', hint: 'Reservations and approvals' },
    ticketItem,
    { to: '/notifications', icon: Bell, label: 'Signals', hint: 'Alerts and activity' },
  ];

  const adminItems = user?.role === 'ADMIN'
    ? [
        { to: '/admin/resources', icon: Building2, label: 'Resource Desk', hint: 'Facilities and assets' },
        { to: '/admin/bookings', icon: ShieldCheck, label: 'Booking Desk', hint: 'Operational queue' },
        { to: '/admin/tickets', icon: ShieldCheck, label: 'Incident Desk', hint: 'Assign and triage' },
      { to: '/admin/users', icon: UserCog, label: 'User Mangmet', hint: 'Roles, status, invites' },
      ]
    : [];

  const allItems = [...navItems, ...adminItems, { to: '/settings', icon: Settings, label: 'Settings', hint: 'Preferences and theme' }];

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
                  <p className="mt-1 text-sm text-muted-foreground">Module C now adapts to reporter, admin, and technician responsibility.</p>
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
                  <p className="text-xs text-slate-300">{user?.role === 'ADMIN' ? 'Triage controls enabled' : user?.role === 'TECHNICIAN' ? 'Assigned work queue active' : 'Reporter ticket tracking active'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-2">
            {!collapsed && <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Mission Control</p>}
            {navItems.map((item) => (
              <SidebarItem key={item.to} item={item} collapsed={collapsed} active={isActivePath(location.pathname, item.to)} />
            ))}
          </div>

          {!!adminItems.length && (
            <div className="mt-8 space-y-2">
              {!collapsed && <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Operations Desk</p>}
              {adminItems.map((item) => (
                <SidebarItem key={item.to} item={item} collapsed={collapsed} active={isActivePath(location.pathname, item.to)} />
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-border p-4">
          <div className="space-y-2">
            <SidebarItem item={allItems[allItems.length - 1]} collapsed={collapsed} active={isActivePath(location.pathname, '/settings')} />
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
                {navItems.map((item) => (
                  <SidebarItem key={item.to} item={item} collapsed={false} active={isActivePath(location.pathname, item.to)} />
                ))}
                {!!adminItems.length && (
                  <>
                    <p className="px-2 pt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Operations Desk</p>
                    {adminItems.map((item) => (
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
              <div className="hidden rounded-2xl border border-border bg-white/45 px-4 py-2 text-right backdrop-blur-sm md:block dark:bg-white/5">
                <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Live
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">Module C role boundaries active</p>
              </div>

              <div className="glass-panel flex items-center gap-3 px-3 py-2">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{user?.name}</p>
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
            key={location.pathname}
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
