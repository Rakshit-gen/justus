'use client';

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-bubble-in">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-soft ring-1 ring-ink-200 dark:bg-ink-800 dark:ring-ink-700">
        <span className="h-2 w-2 rounded-full bg-ink-400 animate-pulse-dot dark:bg-ink-500" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-ink-400 animate-pulse-dot dark:bg-ink-500" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-ink-400 animate-pulse-dot dark:bg-ink-500" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
