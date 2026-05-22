'use client';

import { useCallback, useRef } from 'react';

// Returns handlers to spread onto an element. Triggers `callback` after `delay`
// of pointer-down without movement, or on right-click. Movement > 8 px cancels.
export function useLongPress(callback, { delay = 450, moveThreshold = 8 } = {}) {
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const start = useCallback((e) => {
    firedRef.current = false;
    const point = e.touches?.[0] || e;
    startPosRef.current = { x: point.clientX, y: point.clientY };
    startedAtRef.current = Date.now();
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      callback(e, { x: point.clientX, y: point.clientY });
    }, delay);
  }, [callback, delay]);

  const move = useCallback((e) => {
    if (!timerRef.current) return;
    const point = e.touches?.[0] || e;
    const dx = point.clientX - startPosRef.current.x;
    const dy = point.clientY - startPosRef.current.y;
    if (Math.hypot(dx, dy) > moveThreshold) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [moveThreshold]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onContextMenu: (e) => {
      e.preventDefault();
      const point = e;
      callback(e, { x: point.clientX, y: point.clientY });
    },
  };
}
