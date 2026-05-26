import { AlertCircle } from 'lucide-react';
import { ApiError, isApiError } from '@/admin/lib/api/error';
import { cn } from '@/admin/lib/cn';

interface Props {
  error: unknown;
  className?: string;
}

export function InlineError({ error, className }: Props) {
  if (!error) return null;
  const message = formatError(error);
  if (!message) return null;
  return (
    <div className={cn('flex items-start gap-1.5 text-xs text-danger', className)}>
      <AlertCircle className="size-3.5 mt-px shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  );
}

export function formatError(error: unknown): string {
  if (isApiError(error)) {
    return (error as ApiError).detail ?? (error as ApiError).title;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
