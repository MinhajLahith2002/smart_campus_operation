import React from 'react';
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
