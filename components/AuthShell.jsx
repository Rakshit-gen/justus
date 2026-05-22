'use client';

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-bg flex h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl shadow-brand-600/30">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          {children}
        </div>

        {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
