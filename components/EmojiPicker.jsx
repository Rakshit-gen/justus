'use client';

import { useState } from 'react';

const CATEGORIES = {
  '😀': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😜','😎','🥳','🤔','🤨','😏','😒','😞','😔','😢','😭','😤','😡','🤯','🥺','😴','🤤'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋','💯'],
  '👋': ['👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','🫵','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪'],
  '🐶': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐺','🐗','🐴','🦄','🐝','🐢','🐍','🦋'],
  '🍎': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🥑','🌽','🥕','🥔','🍞','🥐','🧀','🍳','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🍜','🍱','🍣','🍰','🍪','🍫','🍩','🍿','🥤','☕','🍷','🍺'],
  '⚽': ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','⛳','🎣','🥊','🥋','🎮','🎯','🎲','♟️','🎤','🎧','🎵','🎶','🎸','🎹','🎺','🎻','🎬','🎨','🎭','📚','✏️'],
  '🔥': ['🔥','✨','🌟','⭐','💫','💥','💯','✅','❌','❓','❗','💤','💭','🎉','🎊','🎁','🎈','🎀','🎂','💎','🏆','🏅','🎖️','🎵','📌','📍','🔔','🔕','💡','🚀','⚡','☀️','🌙','⛅','🌈','☔'],
};

export function EmojiPicker({ onSelect, className = '' }) {
  const [cat, setCat] = useState(Object.keys(CATEGORIES)[0]);
  return (
    <div className={`overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft-lg dark:border-ink-700 dark:bg-ink-850 ${className}`}>
      <div className="flex border-b border-ink-100 dark:border-ink-800">
        {Object.keys(CATEGORIES).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`flex-1 py-2 text-lg transition ${cat === c ? 'border-b-2 border-brand-500 dark:border-brand-400' : 'opacity-40 hover:opacity-100'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-7 gap-0.5 overflow-y-auto p-2 sm:grid-cols-8">
        {CATEGORIES[cat].map((e, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(e)}
            className="rounded-md p-1.5 text-xl transition hover:bg-ink-100 active:scale-90 dark:hover:bg-ink-800"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
