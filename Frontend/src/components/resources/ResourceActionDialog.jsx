import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, Card } from '../ui/Primitives';

export const ResourceActionDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={!busy ? onClose : undefined}>
      <Card className="w-full max-w-lg bg-[var(--panel-strong)] p-0" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/12 text-warning">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X size={18} />
          </Button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
};

