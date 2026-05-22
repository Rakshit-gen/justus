'use client';

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse-dot" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
