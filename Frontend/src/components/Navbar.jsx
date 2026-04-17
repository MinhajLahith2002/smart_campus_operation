import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, Menu, Radar, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button, Badge } from './ui/Primitives';

const defaultLinks = [];

export const Navbar = ({
  title = 'CampusHub',
  subtitle = 'Bookings, assets, and maintenance',
  links = defaultLinks,
  fixed = false,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fixedShellRef = useRef(null);
  const [fixedSpacerHeight, setFixedSpacerHeight] = useState(112);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  useLayoutEffect(() => {
    if (!fixed) return undefined;

    const updateHeight = () => {
      const measured = fixedShellRef.current?.offsetHeight ?? 0;
      setFixedSpacerHeight(measured > 0 ? measured + 16 : 112);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined' && fixedShellRef.current) {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(fixedShellRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [fixed, mobileMenuOpen, isAuthenticated, location.pathname, location.hash]);

  const getLinkClasses = () => cn(
    'relative px-2 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200',
    'after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all after:duration-200',
    'hover:text-foreground hover:after:w-[calc(100%-0.75rem)] focus-visible:text-foreground focus-visible:outline-none focus-visible:after:w-[calc(100%-0.75rem)]'
  );

  const brand = (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="flex min-w-0 items-center gap-3 rounded-2xl text-left transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      aria-label="Go to home page"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Radar size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold">{subtitle}</p>
      </div>
    </button>
  );

  const desktopActions = isAuthenticated ? (
    <>
      <div className="glass-panel flex items-center gap-3 px-3 py-2">
        <img src={user?.avatar} alt="Avatar" className="h-10 w-10 rounded-2xl border border-border bg-muted/80" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="info">{user?.role}</Badge>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      </div>
      <Button size="lg" className="gap-2" onClick={() => navigate('/dashboard')}>
        Open Workspace
        <ArrowRight size={18} />
      </Button>
      <Button variant="outline" size="lg" className="gap-2" onClick={logout}>
        <LogOut size={16} />
        Sign Out
      </Button>
    </>
  ) : (
    <>
      <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate('/register')}>
        <UserRound size={16} />
        Student Register
      </Button>
      <Button size="lg" className="gap-2" onClick={() => navigate('/auth')}>
        Sign In
        <ArrowRight size={18} />
      </Button>
    </>
  );

  const mobileActions = isAuthenticated ? (
    <>
      <div className="glass-panel flex items-center gap-3 px-3 py-2">
        <img src={user?.avatar} alt="Avatar" className="h-10 w-10 rounded-2xl border border-border bg-muted/80" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="info">{user?.role}</Badge>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="gap-2" onClick={() => navigate('/dashboard')}>
          Open Workspace
          <ArrowRight size={18} />
        </Button>
        <Button variant="outline" className="gap-2" onClick={logout}>
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </>
  ) : (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="gap-2 sm:flex-1" onClick={() => navigate('/register')}>
          <UserRound size={16} />
          Student Register
        </Button>
        <Button className="gap-2 sm:flex-1" onClick={() => navigate('/auth')}>
          Sign In
          <ArrowRight size={18} />
        </Button>
      </div>
    </>
  );

  const navbarContent = (
    <div className={cn('glass-panel px-4 py-4 sm:px-5', className)}>
      <div className="flex items-start justify-between gap-3 lg:hidden">
        {brand}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 lg:hidden">
          {links.length > 0 && (
            <div className="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {links.map((item) => (
                item.type === 'route' ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(item.to);
                    }}
                    className={cn(getLinkClasses(), 'shrink-0')}
                  >
                    {item.label}
                  </button>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(getLinkClasses(), 'shrink-0')}
                  >
                    {item.label}
                  </a>
                )
              ))}
            </div>
          )}
          {mobileActions}
        </div>
      )}

      <div className="hidden lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        {brand}
        <div className="flex items-center justify-center gap-6">
          {links.map((item) => (
            item.type === 'route' ? (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className={cn(getLinkClasses(), 'whitespace-nowrap')}
              >
                {item.label}
              </button>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className={cn(getLinkClasses(), 'whitespace-nowrap')}
              >
                {item.label}
              </a>
            )
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {desktopActions}
        </div>
      </div>
    </div>
  );

  if (fixed) {
    return (
      <>
        <div aria-hidden="true" className="mb-8 transition-[height] duration-200 ease-out" style={{ height: `${fixedSpacerHeight}px` }} />
        <div className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6 lg:px-8">
          <div ref={fixedShellRef} className="mx-auto max-w-7xl">
            {navbarContent}
          </div>
        </div>
      </>
    );
  }

  return navbarContent;
};

