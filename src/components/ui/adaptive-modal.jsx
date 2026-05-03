import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function AdaptiveModal({ open, onOpenChange, title, children, className = '' }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={`px-4 pb-safe pt-4 max-h-[92dvh] overflow-y-auto rounded-t-2xl ${className}`}
        >
          <SheetHeader className="mb-4 text-left">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-3" />
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${className}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
