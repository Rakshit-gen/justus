'use client';

export function ChatStarters({ otherName, disabled, onPick }) {
  const firstName = (otherName || 'them').split(/\s+/)[0];
  const hour = new Date().getHours();
  let greeting;
  if (hour < 5) greeting = `Late night, ${firstName}? 🌙`;
  else if (hour < 12) greeting = `Good morning, ${firstName}! ☀️`;
  else if (hour < 17) greeting = `Hey ${firstName}, what's up?`;
  else if (hour < 21) greeting = `Evening, ${firstName} 👋`;
  else greeting = `Hey ${firstName}, you up? 🌙`;

  const starters = [
    greeting,
    'Long time no chat!',
    'Random thought — wanted to share',
    `Hi ${firstName}!`,
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 text-4xl animate-float-y">👋</div>
      <div className="mb-1 text-sm font-medium text-ink-600 dark:text-ink-300">
        Start chatting with {otherName}
      </div>
      <div className="mb-4 text-xs text-ink-400 dark:text-ink-500">
        Tap a starter or type your own
      </div>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-1.5">
        {starters.map((text, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(text)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-soft ring-1 ring-ink-200 transition active:scale-95 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-50"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
