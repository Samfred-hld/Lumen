// ══════════════════════════════════════════
// LÚMEN — Transaction Row Component
// ══════════════════════════════════════════
import React from 'react';
import { Pencil, Trash2, Copy, Repeat, Layers } from 'lucide-react';
import { formatCurrency, formatSmartDate, isToday } from '@/lib/financeUtils';
import { getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';
import SwipeToDelete from '@/components/ui/swipe-to-delete';

// Material Symbols icon component
function MsIcon({ name, className, size = 20 }) {
  return <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size }}>{name}</span>;
}

// Map categories to Material Symbols icons
const getCategoryMsIcon = (category, type) => {
  if (type === 'income') return 'payments';
  if (type === 'investment') return 'trending_up';
  const c = (category || '').toLowerCase();
  if (c.includes('alimentação') || c.includes('restaurante')) return 'restaurant';
  if (c.includes('transporte') || c.includes('carro')) return 'electric_car';
  if (c.includes('saúde') || c.includes('farmácia')) return 'stethoscope';
  if (c.includes('compras')) return 'shopping_cart';
  if (c.includes('tecnologia')) return 'devices';
  if (c.includes('lazer')) return 'sports_esports';
  return 'shopping_bag';
};

export default function TransactionRow({ t, index, onDelete, onEdit, onDuplicate }) {
  const isIncome = t.type === 'income';
  const isExpense = t.type === 'expense';
  const isInvestment = t.type === 'investment';

  const valueColor = isIncome ? 'text-kpi-income' : isExpense ? 'text-danger' : 'text-info';
  const valuePrefix = isIncome ? '+ ' : isExpense ? '- ' : '';

  return (
    <>
      {/* ── Mobile ── */}
      <SwipeToDelete onDelete={() => onDelete(t.id)} className="lg:hidden">
        <div className="transaction-row grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center cursor-pointer" onClick={() => onEdit(t)}>
          <div className="col-span-6 flex items-center gap-sm">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isIncome ? 'bg-kpi-income/10' : isExpense ? 'bg-kpi-expense/10' : 'bg-info/10'
            )}>
              <MsIcon name={getCategoryMsIcon(t.category, t.type)} size={16}
                className={isIncome ? 'text-kpi-income' : isExpense ? 'text-kpi-expense' : 'text-info'} />
            </div>
            <span className="font-body-lg text-body-lg font-bold">{t.description}</span>
          </div>
          <div className="col-span-3">
            <span className="px-xs py-[2px] bg-surface-container-high rounded text-[10px] font-label-caps text-on-surface-variant">
              {(t.category || '—').toUpperCase()}
            </span>
          </div>
          <div className={cn("col-span-3 text-right font-mono-number text-mono-number font-bold", valueColor)}>
            {valuePrefix}{formatCurrency(t.value)}
          </div>
        </div>
      </SwipeToDelete>

      {/* ── Desktop ── */}
      <div className="transaction-row grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center cursor-pointer hidden lg:grid" onClick={() => onEdit(t)}>
        <div className="col-span-6 flex items-center gap-sm">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isIncome ? 'bg-kpi-income/10' : isExpense ? 'bg-kpi-expense/10' : 'bg-info/10'
          )}>
            <MsIcon name={getCategoryMsIcon(t.category, t.type)} size={16}
              className={isIncome ? 'text-kpi-income' : isExpense ? 'text-kpi-expense' : 'text-info'} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-body-lg text-body-lg font-bold">{t.description}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {isToday(t.date) ? 'HOJE' : formatSmartDate(t.date).toUpperCase()}
              </span>
              {t.isFixed && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-label-caps border border-surface-border">
                  <MsIcon name="repeat" size={10} className="mr-1" /> FIXA
                </span>
              )}
              {t.isInstallment && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-label-caps border border-surface-border">
                  <MsIcon name="layers" size={10} className="mr-1" /> {t.installmentCurrent}/{t.installmentCount}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <span className="px-xs py-[2px] bg-surface-container-high rounded text-[10px] font-label-caps text-on-surface-variant">
            {(t.category || '—').toUpperCase()}
          </span>
        </div>
        <div className={cn("col-span-2 text-right font-mono-number text-mono-number font-bold", valueColor)}>
          {valuePrefix}{formatCurrency(t.value)}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(t); }} className="p-1 hover:bg-surface-container-low rounded text-muted-foreground transition-colors" title="Duplicar">
            <Copy size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1 hover:bg-surface-container-low rounded text-muted-foreground transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1 hover:bg-error-container rounded text-danger transition-colors" title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
