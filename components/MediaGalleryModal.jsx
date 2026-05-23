'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { ImageLightbox } from './ImageLightbox';
import { SmartImage } from './SmartImage';
import { api } from '@/lib/apiClient';

export function MediaGalleryModal({ open, onClose, conversationId }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!open || !conversationId) {
      setItems(null); setErr(''); return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api(`/api/messages/${conversationId}/media`);
        if (cancelled) return;
        setItems(data.items || []);
      } catch (e) {
        if (cancelled) return;
        setErr(e.message);
        setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open, conversationId]);

  const images = (items || []).filter((it) => it.mimeType?.startsWith('image/'));
  const files = (items || []).filter((it) => !it.mimeType?.startsWith('image/'));

  return (
    <>
      <Modal open={open} onClose={onClose} title="Media in this chat">
        {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
        {items === null ? (
          <div className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No photos or files shared yet.</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {images.length > 0 && (
              <section>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">Photos</div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {images.map((img) => (
                    <SmartImage
                      key={img.fileId}
                      src={img.url}
                      alt={img.name || ''}
                      width={1}
                      height={1}
                      maxHeight={200}
                      className="aspect-square"
                      onClick={() => setLightboxImage(img)}
                    />
                  ))}
                </div>
              </section>
            )}
            {files.length > 0 && (
              <section>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">Files</div>
                <ul className="space-y-1">
                  {files.map((f) => (
                    <li key={f.fileId}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={f.name}
                        title={f.name}
                        className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 transition active:scale-[0.99] hover:bg-ink-100 dark:bg-ink-800 dark:hover:bg-ink-700"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500 dark:text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <div className="min-w-0 w-0 flex-1">
                          <div className="block truncate text-xs font-medium text-ink-800 dark:text-ink-100">{f.name || 'file'}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Modal>
      <ImageLightbox
        open={Boolean(lightboxImage)}
        src={lightboxImage?.url}
        name={lightboxImage?.name}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
