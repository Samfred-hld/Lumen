import React from 'react';
import { cn } from '@/lib/utils';
import MsIcon from '@/components/ui/ms-icon';

export default function ProfileSection({ icon, title, children, actions, variant = 'default' }) {
  return (
    <div className={cn(
      'rounded border shadow-sm',
      variant === 'danger'
        ? 'border-danger/30 bg-danger/5'
        : 'bg-surface border-surface-border'
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/40">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'p-2 rounded',
            variant === 'danger' ? 'bg-danger/10' : 'bg-primary/10'
          )}>
            <MsIcon
              name={icon}
              size={16}
              className={variant === 'danger' ? 'text-danger' : 'text-primary'}
            />
          </div>
          <h3 className="text-display-sm font-bold">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
