import React from 'react';
import MsIcon from '@/components/ui/ms-icon';
import { CAT_MATERIAL_ICONS } from '@/lib/iconMap';
import { formatCurrency } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';

/**
 * BudgetCard — Presentational budget card with design tokens.
 * Extracted from Planejamento.jsx for reuse by Budgets.jsx and Planejamento.jsx.
 *
 * Props:
 * - budget: { id, category, limit, isRecurring }
 * - spent: number (calculated amount spent)
 * - onEdit: (budget) => void
 * - onDelete: (budgetId) => void
 */
export default function BudgetCard({ budget, spent, onEdit, onDelete }) {
  const pct = budget.limit > 0 ? Math.min(100, (spent / budget.limit) * 100) : 0;
  const over = spent > budget.limit;
  const remaining = Math.max(0, budget.limit - spent);
  const icon = CAT_MATERIAL_ICONS[budget.category] || 'category';

  return (
    <div className="bg-surface border border-surface-border p-card-padding space-y-md relative group">
      {/* Accent bar */}
      <div className={cn("absolute top-0 left-0 w-full h-[3px]", over ? 'bg-kpi-expense' : 'bg-kpi-income')} />

      {/* Header: category + icon + actions */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-title text-title">{budget.category}</p>
          {budget.isRecurring && (
            <p className="font-body-sm text-on-surface-variant flex items-center gap-xs mt-xs">
              <MsIcon name="repeat" size={10} /> Recorrente
            </p>
          )}
        </div>
        <div className="flex items-center gap-sm">
          <MsIcon name={icon} size={20} className="text-on-surface-variant" />
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(budget)} className="p-1 hover:bg-surface-container-low rounded text-muted-foreground" aria-label="Editar">
              <MsIcon name="edit" size={12} />
            </button>
            <button onClick={() => onDelete(budget.id)} className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir">
              <MsIcon name="delete" size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-xs">
        <div className="flex justify-between font-mono-number text-body-sm">
          <span className={cn(over && "text-error font-bold")}>{formatCurrency(spent)}</span>
          <span className="text-on-surface-variant">de {formatCurrency(budget.limit)}</span>
        </div>
        <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", over ? 'bg-error' : 'bg-primary-container')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer: remaining/exceeded */}
      <div className="flex justify-between items-center pt-xs border-t border-surface-border/50">
        <span className="font-label-caps text-label-caps text-muted-foreground">
          {over ? 'EXCEDIDO' : 'RESTANTE'}
        </span>
        <span className={cn("font-mono-number", over ? 'text-error' : 'text-success')}>
          {over ? `- ${formatCurrency(spent - budget.limit)}` : formatCurrency(remaining)}
        </span>
      </div>
    </div>
  );
}
