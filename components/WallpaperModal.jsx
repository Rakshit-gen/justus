'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Modal } from './Modal';
import { api } from '@/lib/apiClient';
import { uploadFile } from '@/lib/uploadClient';

export const WALLPAPER_PRESETS = {
  default: { label: 'Default', preview: 'chat-bg', style: {} },
  blank:   { label: 'Plain',   preview: '',        style: { background: '#f8fafc' } },
  lavender:{ label: 'Lavender',preview: '',        style: { background: 'linear-gradient(135deg,#ede9fe 0%,#fce7f3 100%)' } },
  ocean:   { label: 'Ocean',   preview: '',        style: { background: 'linear-gradient(135deg,#e0f2fe 0%,#cffafe 100%)' } },
  mint:    { label: 'Mint',    preview: '',        style: { background: 'linear-gradient(135deg,#d1fae5 0%,#ecfccb 100%)' } },
  sunset:  { label: 'Sunset',  preview: '',        style: { background: 'linear-gradient(135deg,#fed7aa 0%,#fda4af 100%)' } },
  night:   { label: 'Night',   preview: '',        style: { background: 'linear-gradient(135deg,#1e293b 0%,#312e81 100%)' } },
};

// Translates a stored wallpaper config into the inline styles + classes the
// chat scroller should apply.
export function wallpaperStyle(wallpaper) {
  if (!wallpaper || !wallpaper.kind || wallpaper.kind === 'none' || wallpaper.kind === 'preset' && wallpaper.value === 'default') {
    return { className: 'chat-bg', style: {} };
  }
  if (wallpaper.kind === 'preset') {
    const p = WALLPAPER_PRESETS[wallpaper.value];
    if (p) return { className: p.preview, style: p.style };
    return { className: 'chat-bg', style: {} };
  }
  if (wallpaper.kind === 'image' && wallpaper.value) {
    return {
      className: '',
      style: {
        backgroundImage: `url("${wallpaper.value}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    };
  }
  return { className: 'chat-bg', style: {} };
}

export function WallpaperModal({ open, onClose, otherUser, current, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function setPreset(name) {
    setErr('');
    setBusy(true);
    try {
      const wallpaper = name === 'default' ? { kind: 'none', value: '' } : { kind: 'preset', value: name };
      const data = await api(`/api/chat-settings/${otherUser.id}`, {
        method: 'PATCH',
        body: { wallpaper },
      });
      onSaved?.(data.setting);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file) {
    if (!file?.type?.startsWith('image/')) {
      setErr('Please pick an image file.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      const data = await api(`/api/chat-settings/${otherUser.id}`, {
        method: 'PATCH',
        body: { wallpaper: { kind: 'image', value: uploaded.url } },
      });
      onSaved?.(data.setting);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const currentKind = current?.wallpaper?.kind || 'none';
  const currentValue = current?.wallpaper?.value || '';
  const isPreset = (name) => currentKind === 'preset' && currentValue === name;
  const isDefault = currentKind === 'none' || (currentKind === 'preset' && currentValue === 'default');

  return (
    <Modal open={open} onClose={onClose} title="Wallpaper">
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Presets</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Object.entries(WALLPAPER_PRESETS).map(([key, p]) => {
              const active = key === 'default' ? isDefault : isPreset(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={() => setPreset(key)}
                  className={clsx(
                    'group relative aspect-square overflow-hidden rounded-xl ring-1 transition active:scale-95',
                    active ? 'ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300'
                  )}
                  style={p.style}
                >
                  {key === 'default' && (
                    <div className="absolute inset-0 chat-bg" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1 text-[10px] font-medium text-white">
                    {p.label}
                  </div>
                  {active && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Custom</div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs font-medium text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
            >
              Upload an image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = '';
              }}
            />
          </div>
          {currentKind === 'image' && currentValue && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentValue} alt="" className="h-12 w-12 rounded object-cover" />
              <div className="flex-1 text-slate-600">Custom image</div>
              <button
                type="button"
                onClick={() => setPreset('default')}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          )}
        </div>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        {busy && <div className="text-center text-xs text-slate-400">Saving…</div>}
      </div>
    </Modal>
  );
}
