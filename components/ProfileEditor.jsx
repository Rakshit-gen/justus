'use client';

import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { api } from '@/lib/apiClient';

export function ProfileEditor({ open, onClose, me, onUpdated }) {
  const [name, setName] = useState(me?.name || '');
  const [bio, setBio] = useState(me?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function saveText() {
    setError('');
    setSaving(true);
    try {
      const data = await api('/api/auth/me', { method: 'PATCH', body: { name: name.trim(), bio: bio.trim() } });
      onUpdated?.(data.user);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = JSON.parse(localStorage.getItem('chatme.auth') || '{}').token;
      const res = await fetch('/api/auth/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUpdated?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setError('');
    setUploading(true);
    try {
      const token = JSON.parse(localStorage.getItem('chatme.auth') || '{}').token;
      const res = await fetch('/api/auth/me/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onUpdated?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Your profile">
      <div className="flex flex-col items-center gap-3 pb-2">
        <div className="relative">
          <UserAvatar name={me?.name} color={me?.avatarColor} avatarUrl={me?.avatarUrl} size={88} />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft-md ring-2 ring-white transition active:scale-90 dark:ring-ink-900"
            aria-label="Change avatar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => uploadAvatar(e.target.files?.[0])}
          />
        </div>
        {me?.avatarUrl && (
          <button onClick={removeAvatar} className="text-xs text-ink-500 underline hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200">
            Remove avatar
          </button>
        )}
        {uploading && <div className="text-xs text-ink-500 dark:text-ink-400">Uploading…</div>}
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={30}
            className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:focus:bg-ink-850 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Bio <span className="text-ink-400 dark:text-ink-500">(optional, max 140)</span></span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 140))}
            rows={2}
            placeholder="Say something about yourself"
            className="w-full resize-none rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:bg-ink-850 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
          />
          <div className="mt-0.5 text-right text-[10px] text-ink-400 dark:text-ink-500">{bio.length}/140</div>
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <button
          onClick={saveText}
          disabled={saving || !name.trim()}
          className="w-full rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-brand-glow transition active:scale-[0.99] hover:shadow-soft-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
