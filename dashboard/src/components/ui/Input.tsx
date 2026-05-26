import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { mono, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded border border-border-default bg-bg-base px-2.5 text-sm text-fg-default placeholder:text-fg-muted',
        'transition-colors duration-150 ease-precise',
        'hover:border-border-strong focus-visible:border-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        mono && 'font-mono tabular-nums',
        className,
      )}
      {...rest}
    />
  );
});
