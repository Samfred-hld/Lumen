// ══════════════════════════════════════════
// LÚMEN — Swipe to Delete (Mobile)
// ══════════════════════════════════════════
// Touch gesture component for mobile swipe-to-delete.

import React, { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SwipeToDelete({ children, onDelete, className }) {
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);
  const isHorizontal = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    locked.current = false;
    isHorizontal.current = false;
    if (swiped) {
      setSwiped(false);
      setOffset(0);
    }
  }, [swiped]);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        isHorizontal.current = true;
        locked.current = true;
      } else if (Math.abs(dy) > 10) {
        locked.current = true;
        return;
      } else {
        return;
      }
    }

    if (!isHorizontal.current) return;
    e.preventDefault();

    const clamped = Math.max(-THRESHOLD, Math.min(0, dx));
    setOffset(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (offset < -THRESHOLD / 2) {
      setSwiped(true);
      setOffset(-THRESHOLD);
    } else {
      setSwiped(false);
      setOffset(0);
    }
  }, [offset]);

  const handleDelete = useCallback(() => {
    setSwiped(false);
    setOffset(0);
    onDelete?.();
  }, [onDelete]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Delete background */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 text-white transition-opacity duration-200",
          swiped ? "opacity-100" : "opacity-0"
        )}
        onClick={handleDelete}
      >
        <Trash2 size={18} />
      </div>

      {/* Swipeable content */}
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${swiped ? offset : offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
