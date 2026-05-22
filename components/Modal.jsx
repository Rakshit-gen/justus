'use client';

import { useEffect } from 'react';
import clsx from 'clsx';

export function Modal({ open, onClose, title, children, footer, sheetOnMobile = true, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in dark:bg-black/60"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full overflow-hidden bg-white shadow-soft-lg ring-1 ring-black/5 dark:bg-ink-900 dark:ring-white/5',
          sheetOnMobile
            ? 'rounded-t-3xl animate-sheet-up sm:animate-spring-in sm:rounded-2xl sm:max-w-md sm:w-auto sm:min-w-[24rem]'
            : 'rounded-2xl animate-spring-in',
          !sheetOnMobile && maxWidth
        )}
      >
        {sheetOnMobile && (
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-ink-300 dark:bg-ink-700" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-800 dark:text-ink-100">{title}</h3>
            <button
              onClick={onClose}
              className="group rounded-md p-1 text-ink-500 transition hover:bg-ink-100 active:scale-95 dark:text-ink-400 dark:hover:bg-ink-800"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4 pb-safe">{children}</div>
        {footer && <div className="border-t border-ink-100 px-5 py-3 pb-safe dark:border-ink-800">{footer}</div>}
      </div>
    </div>
  );
}
