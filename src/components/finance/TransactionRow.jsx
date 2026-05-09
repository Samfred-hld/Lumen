// ══════════════════════════════════════════
// LÚMEN — Transaction Row Component
// ══════════════════════════════════════════
// Unified mobile + desktop layout. Eliminates the dual paginatedTx.map().

import React from 'react';
import { Pencil, Trash2, Copy, Repeat } from 'lucide-react';
import { formatCurrency, formatSmartDate, isToday } from '@/lib/financeUtils';
import { getCategoryIcon, getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';
import SwipeToDelete from '@/components/ui/swipe-to-delete';

const TYPE_ACCENT = {
  income: 'border-l-emerald-500',
  expense: 'border-l-red-500',
  investment: 'border-l-violet-500',
};

export default function TransactionRow({ t, index, onDelete, onEdit, onDuplicate }) {
  const accent = TYPE_ACCENT[t.type] || 'border-l-gray-300';
  const valueColor = t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600';
  const valuePrefix = t.type !== 'income' ? '-' : '+';
  const subLabel = t.isFixed ? 'Recorrente' : t.isInstallment ? 'Parcelado' : t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento';

  return (
    <>
      {/* ── Mobile ── */}
      <SwipeToDelete onDelete={() => onDelete(t.id)} className="lg:hidden">
        <div className={cn(
          "flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-all duration-150 border-l-[3px]",
          accent
        )}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold truncate">{t.description}</p>
              {t.isFixed && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                  <Repeat size={9} /> Fixas
                </span>
              )}
              {t.isInstallment && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200/50">
                  {t.installmentCurrent}/{t.installmentCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isToday(t.date) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                <span>{formatSmartDate(t.date)}</span>
              </div>
              {t.category && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ backgroundColor: `${getCategoryColor(t.category)}18`, color: getCategoryColor(t.category) }}
                >
                  {getCategoryIcon(t.category)} {t.category}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className={cn("text-sm font-bold tabular-nums", valueColor)}>
              {valuePrefix}{formatCurrency(t.value)}
            </span>
            {(t.isFixed || t.isInstallment) && (
              <span className="text-[10px] text-emerald-600 font-medium">{subLabel}</span>
            )}
          </div>
        </div>
      </SwipeToDelete>

      {/* ── Desktop ── */}
      <div
        className={cn(
          "hidden lg:flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-all duration-150 group animate-fade-in border-l-[3px]",
          accent
        )}
        style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate">{t.description}</p>
            {t.isFixed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                <Repeat size={9} /> Fixas
              </span>
            )}
            {t.isInstallment && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200/50">
                {t.installmentCurrent}/{t.installmentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isToday(t.date) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
              <span>{formatSmartDate(t.date)}</span>
            </div>
            {t.category && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ backgroundColor: `${getCategoryColor(t.category)}18`, color: getCategoryColor(t.category) }}
              >
                {getCategoryIcon(t.category)} {t.category}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{t.paymentMethod || '—'}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-sm font-bold tabular-nums", valueColor)}>
            {valuePrefix}{formatCurrency(t.value)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">{subLabel}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button onClick={() => onDuplicate(t)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Duplicar">
            <Copy size={13} />
          </button>
          <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600" aria-label="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </>
  );
}
