import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_16px_32px_rgba(15,118,110,0.22)]',
    secondary: 'bg-secondary-accent text-white hover:bg-secondary-accent/90 shadow-[0_16px_32px_rgba(37,99,235,0.2)]',
    outline: 'border border-border bg-white/30 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10 text-foreground backdrop-blur-sm',
    ghost: 'bg-transparent hover:bg-muted/70 text-foreground',
    danger: 'bg-danger text-white hover:bg-danger/90 shadow-[0_16px_32px_rgba(239,68,68,0.2)]',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-4.5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
    icon: 'p-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};

export const Card = ({ className, ...props }) => (
  <div className={cn('premium-card p-6', className)} {...props} />
);

export const Badge = ({ children, variant = 'neutral', className }) => {
  const variants = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-secondary-accent/10 text-secondary-accent border-secondary-accent/20',
    neutral: 'bg-muted/80 text-muted-foreground border-border',
  };

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-sm', variants[variant], className)}>
      {children}
    </span>
  );
};

export const Input = ({ className, ...props }) => (
  <input
    className={cn(
      'flex h-11 w-full rounded-xl border border-border bg-white/45 dark:bg-white/5 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all backdrop-blur-sm',
      className
    )}
    {...props}
  />
);

export const PasswordInput = ({ className, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const noticeVariantStyles = {
  error: {
    icon: AlertCircle,
    className: 'border-danger/25 bg-danger/[0.08] text-danger shadow-[0_20px_40px_rgba(239,68,68,0.08)]',
    autoHideMs: 5000,
  },
  success: {
    icon: CheckCircle2,
    className: 'border-success/25 bg-success/[0.08] text-success shadow-[0_20px_40px_rgba(34,197,94,0.08)]',
    autoHideMs: 3800,
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-warning/25 bg-warning/[0.08] text-warning shadow-[0_20px_40px_rgba(245,158,11,0.08)]',
    autoHideMs: 4800,
  },
  info: {
    icon: Info,
    className: 'border-secondary-accent/20 bg-secondary-accent/[0.08] text-secondary-accent shadow-[0_20px_40px_rgba(37,99,235,0.08)]',
    autoHideMs: 4200,
  },
};

export const NoticeBanner = ({
  children,
  variant = 'info',
  dismissible = true,
  autoHideMs,
  onDismiss,
  className,
}) => {
  const config = noticeVariantStyles[variant] || noticeVariantStyles.info;
  const Icon = config.icon;
  const [visible, setVisible] = useState(Boolean(children));

  useEffect(() => {
    setVisible(Boolean(children));
  }, [children]);

  useEffect(() => {
    if (!visible || !children) return undefined;
    const timeout = autoHideMs ?? config.autoHideMs;
    if (!timeout) return undefined;

    const timerId = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, timeout);

    return () => window.clearTimeout(timerId);
  }, [autoHideMs, children, config.autoHideMs, onDismiss, visible]);

  if (!children || !visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm backdrop-blur-sm',
        config.className,
        className
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 leading-6">{children}</p>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/45 transition hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
