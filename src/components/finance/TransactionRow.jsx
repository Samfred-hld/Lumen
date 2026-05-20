// ══════════════════════════════════════════
// LÚMEN — Transaction Row Component
// ══════════════════════════════════════════
import React from 'react';
import MsIcon from '@/components/ui/ms-icon';
import { getCategoryMsIcon } from '@/lib/iconMap';
import { formatCurrency, formatSmartDate, isToday } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';
import SwipeToDelete from '@/components/ui/swipe-to-delete';

import { Checkbox } from '@/components/ui/checkbox';

export default function TransactionRow({ t, index, onDelete, onEdit, onDuplicate, isSelected, onSelect }) {
  const isIncome = t.type === 'income';
  const isExpense = t.type === 'expense';
  const isInvestment = t.type === 'investment';

  const valueColor = isIncome ? 'text-kpi-income' : isExpense ? 'text-danger' : 'text-info';
  const valuePrefix = isIncome ? '+ ' : isExpense ? '- ' : '';

  return (
    <SwipeToDelete onDelete={() => onDelete(t.id)}>
      <div 
        className={cn(
          "transaction-row grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center cursor-pointer group transition-colors",
          isSelected ? "bg-surface-container-low" : "hover:bg-surface-low/30"
        )} 
        onClick={() => onEdit(t)}
      >
        <div className="col-span-7 flex items-center gap-sm">
          <div className="flex items-center px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={() => onSelect(t.id)}
              className="border-surface-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            isIncome ? 'bg-kpi-income/10' : isExpense ? 'bg-kpi-expense/10' : 'bg-info/10'
          )}>
            <MsIcon name={getCategoryMsIcon(t.category, t.type)} size={16}
              className={isIncome ? 'text-kpi-income' : isExpense ? 'text-kpi-expense' : 'text-info'} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-body-lg text-body-lg font-bold">{t.description}</span>
            <div className="hidden lg:flex items-center gap-2 mt-0.5">
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
        <div className={cn("col-span-3 lg:col-span-2 text-right font-mono-number text-mono-number font-bold", valueColor)}>
          {valuePrefix}{formatCurrency(t.value)}
        </div>
        <div className="col-span-1 hidden lg:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(t); }} className="p-1 hover:bg-surface-container-low rounded text-muted-foreground transition-colors" title="Duplicar">
            <MsIcon name="content_copy" size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1 hover:bg-surface-container-low rounded text-muted-foreground transition-colors" title="Editar">
            <MsIcon name="edit" size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1 hover:bg-error-container rounded text-danger transition-colors" title="Excluir">
            <MsIcon name="delete" size={14} />
          </button>
        </div>
      </div>
    </SwipeToDelete>
  );
}
