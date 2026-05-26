import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/admin/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <RDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md',
            'surface-overlay p-5 focus:outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <RDialog.Title className="text-md font-medium text-fg-strong">{title}</RDialog.Title>
              {description && (
                <RDialog.Description className="text-sm text-fg-subtle mt-1">{description}</RDialog.Description>
              )}
            </div>
            <RDialog.Close
              className="text-fg-muted hover:text-fg-default p-1 -m-1 rounded transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </RDialog.Close>
          </div>
          <div className="text-sm text-fg-default">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 mt-5">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
