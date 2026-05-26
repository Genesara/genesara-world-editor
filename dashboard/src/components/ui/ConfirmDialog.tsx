import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** One-line consequence summary. Required for destructive actions. */
  consequence: ReactNode;
  /** Server-provided warning string (e.g. from skill DELETE). Rendered prominently if set. */
  warning?: string;
  /** Button label for the destructive action. */
  confirmLabel?: string;
  /** Style of confirm button. */
  destructive?: boolean;
  /** Async-aware confirm handler. The dialog stays open while the promise settles. */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  warning,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={busy ? () => undefined : onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={run} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-fg-default">{consequence}</p>
      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded border border-warning/40 bg-warning-subtle/30 px-3 py-2 text-sm text-fg-default">
          <AlertTriangle className="size-4 mt-0.5 text-warning shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </Dialog>
  );
}
