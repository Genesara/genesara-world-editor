import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Empty({
  icon,
  title,
  hint,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-fg-muted', className)}
    >
      {icon && <div className="text-fg-subtle">{icon}</div>}
      <div className="text-sm font-medium text-fg-subtle">{title}</div>
      {hint && <div className="text-xs">{hint}</div>}
    </div>
  );
}
