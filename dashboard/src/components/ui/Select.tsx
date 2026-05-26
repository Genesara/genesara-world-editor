import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label?: ReactNode }>;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  mono?: boolean;
  disabled?: boolean;
}

const sizes = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-8 px-2.5 text-sm',
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  size = 'sm',
  mono,
  disabled,
}: SelectProps) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RSelect.Trigger
        className={cn(
          'inline-flex items-center justify-between gap-1.5 rounded border border-border-default bg-bg-base text-fg-default',
          'hover:border-border-strong focus-visible:border-accent',
          'transition-colors duration-150 ease-precise',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizes[size],
          mono && 'font-mono tabular-nums',
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon className="text-fg-muted">
          <ChevronDown className="size-3.5" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'surface-overlay z-50 min-w-[var(--radix-select-trigger-width)] py-1',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <RSelect.Viewport>
            {options.map((opt) => (
              <RSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex items-center gap-2 h-7 pl-7 pr-2 text-xs text-fg-default rounded-sm mx-1 select-none cursor-pointer',
                  'data-[highlighted]:bg-bg-raised data-[highlighted]:outline-none',
                  'data-[state=checked]:text-fg-strong',
                  mono && 'font-mono tabular-nums',
                )}
              >
                <RSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-3" />
                </RSelect.ItemIndicator>
                <RSelect.ItemText>{opt.label ?? opt.value}</RSelect.ItemText>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
