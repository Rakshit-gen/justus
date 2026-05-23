'use client';

export function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-start"><div className="h-9 w-40 rounded-2xl skeleton ring-1 ring-ink-200 dark:ring-ink-700" /></div>
      <div className="flex justify-end"><div className="h-9 w-56 rounded-2xl skeleton opacity-70" /></div>
      <div className="flex justify-start"><div className="h-9 w-32 rounded-2xl skeleton ring-1 ring-ink-200 dark:ring-ink-700" /></div>
      <div className="flex justify-end"><div className="h-9 w-44 rounded-2xl skeleton opacity-70" /></div>
    </div>
  );
}
