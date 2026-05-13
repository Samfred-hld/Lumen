// ══════════════════════════════════════════
// LÚMEN — Transaction Row Component (Redesigned)
// ══════════════════════════════════════════
// Unified mobile + desktop layout. Clean, modern Swiss style.

import React from 'react';
import { Pencil, Trash2, Copy, Repeat } from 'lucide-react';
import { formatCurrency, formatSmartDate, isToday } from '@/lib/financeUtils';
import { getCategoryIcon, getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';
import SwipeToDelete from '@/components/ui/swipe-to-delete';

export default function TransactionRow({ t, index, onDelete, onEdit, onDuplicate }) {
  const valueColor = t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-slate-900' : 'text-sky-600';
  const valuePrefix = t.type !== 'income' ? '-' : '+';
  const subLabel = t.isFixed ? 'Recorrente' : t.isInstallment ? 'Parcelado' : t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento';

  return (
    <>
      {/* ── Mobile ── */}
      <SwipeToDelete onDelete={() => onDelete(t.id)} className="lg:hidden">
        <div className="flex items-start justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors duration-200 border-b border-slate-100 last:border-b-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-900 truncate">{t.description}</p>
              {t.isFixed && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                  <Repeat size={9} /> Fixa
                </span>
              )}
              {t.isInstallment && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-sky-50 text-sky-600 text-[10px] font-medium border border-sky-100">
                  {t.installmentCurrent}/{t.installmentCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {isToday(t.date) && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                <span>{formatSmartDate(t.date)}</span>
              </div>
              {t.category && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(t.category) }} />
                  {t.category}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end">
            <span className={cn("text-sm font-semibold tabular-nums", valueColor)}>
              {valuePrefix}{formatCurrency(t.value)}
            </span>
            {(t.isFixed || t.isInstallment) && (
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">{subLabel}</span>
            )}
          </div>
        </div>
      </SwipeToDelete>

      {/* ── Desktop ── */}
      <div
        className="hidden lg:flex items-center px-5 py-3 hover:bg-slate-50 transition-colors duration-200 group border-b border-slate-100 last:border-0"
      >
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{t.description}</p>
            {t.isFixed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                <Repeat size={9} /> Fixa
              </span>
            )}
            {t.isInstallment && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-sky-50 text-sky-600 text-[10px] font-medium border border-sky-100">
                {t.installmentCurrent}/{t.installmentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {isToday(t.date) && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <span>{formatSmartDate(t.date)}</span>
            </div>
            {t.category && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(t.category) }} />
                {t.category}
              </span>
            )}
            {t.paymentMethod && (
              <span className="text-xs text-slate-400 font-medium px-2 border-l border-slate-200">
                {t.paymentMethod}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right shrink-0 min-w-[120px] pr-4">
          <p className={cn("text-[15px] font-semibold tabular-nums", valueColor)}>
            {valuePrefix}{formatCurrency(t.value)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 uppercase">{subLabel}</p>
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDuplicate(t)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors" aria-label="Duplicar">
            <Copy size={14} />
          </button>
          <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors" aria-label="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors" aria-label="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
