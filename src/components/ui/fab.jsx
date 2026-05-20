// ══════════════════════════════════════════
// LÚMEN — Floating Action Button (FAB)
// ══════════════════════════════════════════
// Mobile-friendly quick action button.

import React, { useState } from 'react';
import MsIcon from '@/components/ui/ms-icon';
import { cn } from '@/lib/utils';

export default function FAB({ onNewIncome, onNewExpense, onNewTransaction }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse items-center gap-3 md:hidden">
      {/* Sub-actions */}
      {expanded && (
        <>
          <button
            onClick={() => { setExpanded(false); onNewIncome?.(); }}
            className="w-12 h-12 rounded-full bg-success text-white shadow-elevated flex items-center justify-center hover:bg-success/90 active:scale-95 transition-all animate-fade-in"
            aria-label="Nova receita"
          >
            <MsIcon name="trending_up" size={20} />
          </button>
          <button
            onClick={() => { setExpanded(false); onNewExpense?.(); }}
            className="w-12 h-12 rounded-full bg-danger text-white shadow-elevated flex items-center justify-center hover:bg-danger/90 active:scale-95 transition-all animate-fade-in"
            aria-label="Nova despesa"
          >
            <MsIcon name="trending_down" size={20} />
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={() => {
          if (expanded) setExpanded(false);
          else if (onNewIncome || onNewExpense) setExpanded(true);
          else if (onNewTransaction) onNewTransaction();
        }}
        className={cn(
          "w-14 h-14 rounded-full shadow-float flex items-center justify-center active:scale-95 transition-all duration-200",
          expanded
            ? "bg-muted-foreground text-background rotate-45"
            : "bg-primary text-primary-foreground hover:brightness-110"
        )}
        aria-label={expanded ? "Fechar" : "Nova transação"}
      >
        {expanded ? <MsIcon name="close" size={24} /> : <MsIcon name="add" size={24} />}
      </button>
    </div>
  );
}
