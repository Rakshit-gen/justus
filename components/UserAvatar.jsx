'use client';

import clsx from 'clsx';

function darken(hex, amount = 22) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex || '#6366f1';
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function UserAvatar({ name, color, avatarUrl, size = 40, online = false, showDot = false }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const base = color || '#6366f1';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-white font-semibold select-none shadow-sm ring-1 ring-black/5"
        style={{
          background: avatarUrl
            ? undefined
            : `linear-gradient(135deg, ${base} 0%, ${darken(base, 30)} 100%)`,
          fontSize: size * 0.42,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name || ''}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          initial
        )}
      </div>
      {showDot && (
        <span
          className="absolute bottom-0 right-0 block"
          style={{ width: size * 0.28, height: size * 0.28 }}
        >
          {online && (
            <span
              className="absolute inset-0 rounded-full bg-emerald-400 animate-ring-pulse"
              aria-hidden
            />
          )}
          <span
            className={clsx(
              'absolute inset-0 block rounded-full ring-2 ring-white transition-colors dark:ring-ink-900',
              online ? 'bg-emerald-500' : 'bg-ink-300 dark:bg-ink-600'
            )}
          />
        </span>
      )}
    </div>
  );
}
