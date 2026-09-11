import { X } from 'lucide-react';
import { useEffect } from 'react';
import type React from 'react';
import { cn } from '../../../utils/ui/cn';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, subtitle, maxWidthClassName = 'max-w-2xl', children }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('mobile-navigation-open');
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.classList.remove('mobile-navigation-open');
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 backdrop-blur-[1px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)] sm:rounded-lg',
          maxWidthClassName,
        )}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        {title || subtitle ? (
          <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-2 sm:pt-6">
            <div className="min-w-0">
              {title ? <h3 className="text-lg font-medium text-slate-900">{title}</h3> : null}
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="overflow-y-auto px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
