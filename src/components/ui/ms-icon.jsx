import React from 'react';
import { cn } from '@/lib/utils';

export default function MsIcon({ name, className, size = 24, filled = false }) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
