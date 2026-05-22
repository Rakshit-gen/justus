'use client';

const STORAGE_KEY = 'chatme.auth';

function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').token || null;
  } catch { return null; }
}

// Reads image dimensions from a File object (browser-only).
export function readImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith('image/')) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export async function uploadFile(file) {
  const dims = await readImageDimensions(file);
  const fd = new FormData();
  fd.append('file', file);
  if (dims) {
    fd.append('width', String(dims.width));
    fd.append('height', String(dims.height));
  }
  const token = getToken();
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { fileId, url, name, mimeType, size, width?, height? }
}
