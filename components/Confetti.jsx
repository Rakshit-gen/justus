'use client';

import { useEffect, useState } from 'react';

const EMOJIS = ['🎉', '🎊', '✨', '🥳', '💖', '🎂', '⭐'];
const CELEBRATION_PATTERNS = [
  /\bhappy\s*birthday\b/i,
  /\bhappy\s*bday\b/i,
  /\bhbd\b/i,
  /\bcongrats?\b/i,
  /\bcongratulations\b/i,
  /\bwell\s*done\b/i,
  /🎉/u,
  /🎊/u,
  /🎂/u,
  /🥳/u,
];

export function isCelebration(text) {
  if (!text) return false;
  return CELEBRATION_PATTERNS.some((re) => re.test(text));
}

// Renders a one-shot confetti shower. Unmounts itself after `durationMs`.
export function ConfettiBurst({ count = 36, durationMs = 2800, onDone }) {
  const [items] = useState(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.5,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      rotate: (Math.random() - 0.5) * 720,
      scale: 0.8 + Math.random() * 0.6,
    }))
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {items.map((it) => (
        <span
          key={it.id}
          className="absolute select-none"
          style={{
            left: `${it.left}%`,
            top: '-3rem',
            fontSize: `${it.scale * 1.6}rem`,
            animation: `confetti-fall ${it.duration}s cubic-bezier(.34,.16,.84,1) ${it.delay}s forwards`,
            ['--confetti-rotate']: `${it.rotate}deg`,
          }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}
