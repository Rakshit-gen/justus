'use client';

import { useState } from 'react';
import clsx from 'clsx';

// An <img> wrapped in a fixed-aspect-ratio container that:
// - Reserves layout space upfront using width/height (no jumpy scroll on load)
// - Shows a shimmer placeholder until the image's onLoad fires
// - Lazy-loads with the browser's native `loading="lazy"` (skips off-screen images)
export function SmartImage({ src, alt, width, height, maxHeight = 288, className, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const ratio = width && height ? width / height : null;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800',
        onClick && 'transition active:scale-[0.99]',
        className
      )}
      style={ratio ? { aspectRatio: ratio, maxHeight } : { maxHeight }}
    >
      {!loaded && <div className="absolute inset-0 skeleton" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || 'image'}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={clsx(
          'h-full w-full object-cover transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
