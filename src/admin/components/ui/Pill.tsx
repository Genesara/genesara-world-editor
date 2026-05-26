import type { HTMLAttributes } from 'react';
import { cn } from '@/admin/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-bg-raised text-fg-subtle border-border-default',
  success: 'bg-success-subtle text-success border-success/40',
  warning: 'bg-warning-subtle text-warning border-warning/40',
  danger: 'bg-danger-subtle text-danger border-danger/40',
  accent: 'bg-accent-subtle text-accent border-accent/40',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Pill({ tone = 'neutral', className, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border text-2xs font-medium uppercase tracking-wider',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
