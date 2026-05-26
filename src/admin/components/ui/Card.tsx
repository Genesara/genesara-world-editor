import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/admin/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-1', className)} {...rest} />;
}

interface SectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
}

export function CardSection({ title, action, className, children, ...rest }: SectionProps) {
  return (
    <div className={cn('flex flex-col', className)} {...rest}>
      {(title || action) && (
        <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
          {title && <div className="text-xs font-medium uppercase tracking-wider text-fg-muted">{title}</div>}
          {action && <div className="flex items-center gap-1">{action}</div>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
