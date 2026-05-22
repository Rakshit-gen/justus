'use client';

import { useEffect } from 'react';

export function ImageLightbox({ open, src, name, onClose }) {
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
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-4" style={{ paddingTop: 'max(0.75rem, var(--safe-top))' }}>
        <div className="min-w-0 flex-1 truncate text-sm text-white/80" title={name}>
          {name || 'Image'}
        </div>
        <a
          href={src}
          download={name}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-2 text-white/70 transition active:scale-90 hover:bg-white/10 hover:text-white"
          aria-label="Download"
          title="Download"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        <button
          type="button"
          onClick={onClose}
          className="group rounded-md p-2 text-white/70 transition active:scale-90 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        onClick={onClose}
        className="flex flex-1 cursor-zoom-out items-center justify-center p-3 sm:p-6"
        style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name || 'image'}
          className="max-h-full max-w-full cursor-default rounded-lg object-contain shadow-2xl animate-spring-in"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
