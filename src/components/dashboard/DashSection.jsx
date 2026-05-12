import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lsGet, lsSet } from '@/lib/store';

/**
 * DashSection — collapsible dashboard section with localStorage persistence
 * Concrete & Ink style: editorial header, no card wrapper
 */
export default function DashSection({ id, title, icon: Icon, color, defaultOpen = false, children }) {
  const storageKey = `dash_section_${id}_expanded`;
  const [open, setOpen] = useState(() => {
    const stored = lsGet(storageKey, null);
    if (stored !== null) return stored === 'true';
    return defaultOpen;
  });

  useEffect(() => {
    lsSet(storageKey, String(open));
  }, [open, storageKey]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
        {Icon && (
          <div className={cn('w-1.5 h-4 rounded-full shrink-0', color || 'bg-primary')} aria-hidden="true" />
        )}
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronRight
          size={14}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
