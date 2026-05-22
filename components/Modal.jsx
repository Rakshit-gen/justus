'use client';

import { useEffect } from 'react';
import clsx from 'clsx';

// Mobile bottom sheet / desktop centered modal — same component, responsive.
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full overflow-hidden bg-white shadow-2xl animate-fade-in',
          sheetOnMobile
            ? 'rounded-t-3xl sm:rounded-2xl sm:max-w-md sm:w-auto sm:min-w-[24rem]'
            : 'rounded-2xl',
          !sheetOnMobile && maxWidth
        )}
      >
        {sheetOnMobile && (
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-slate-300" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4 pb-safe">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}
