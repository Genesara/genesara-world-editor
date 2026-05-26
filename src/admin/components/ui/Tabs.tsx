import * as RTabs from '@radix-ui/react-tabs';
import { cn } from '@/admin/lib/cn';
import type { ReactNode } from 'react';

interface Tab {
  value: string;
  label: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ tabs, value, onValueChange, children, className }: TabsProps) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange} className={cn('flex flex-col min-h-0', className)}>
      <RTabs.List className="flex items-center gap-1 border-b border-border-subtle px-3">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              'relative h-9 px-2 text-sm text-fg-muted hover:text-fg-default transition-colors',
              'data-[state=active]:text-fg-strong',
              'data-[state=active]:after:absolute data-[state=active]:after:left-2 data-[state=active]:after:right-2 data-[state=active]:after:-bottom-px',
              'data-[state=active]:after:h-px data-[state=active]:after:bg-accent',
            )}
          >
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </RTabs.Root>
  );
}

export const TabPanel = RTabs.Content;
