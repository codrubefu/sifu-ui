import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../../../utils/ui/cn';

type SuccessMessageProps = {
  children: ReactNode;
  className?: string;
  fixed?: boolean;
};

export function SuccessMessage({ children, className, fixed = false }: SuccessMessageProps) {
  const [dismissedMessage, setDismissedMessage] = useState<ReactNode | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDismissedMessage(children), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [children]);

  const visible = dismissedMessage !== children;
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700',
        fixed ? 'fixed right-4 top-4 z-50 max-w-sm shadow-lg' : 'mb-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
