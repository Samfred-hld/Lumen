import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/financeUtils';
import { CAT_COLORS } from '@/lib/categories';
import { getCategoryIcon } from '@/lib/categories';

export default function CategoryBreakdown({ expensesByCategory, totals }) {
  return (
    <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
      <div className="p-3 border-b border-surface-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-amber-500" aria-hidden="true" /> Gastos por Categoria
        </h3>
      </div>
      <div className="p-4 flex-1 space-y-2">
        {expensesByCategory.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Sem despesas neste mês</p>
        ) : (
          expensesByCategory.slice(0, 8).map(([cat, val]) => {
            const pct = totals.expense > 0 ? (val / totals.expense) * 100 : 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm shrink-0" aria-hidden="true">{getCategoryIcon(cat)}</span>
                <span className="text-sm font-medium w-28 truncate shrink-0">{cat}</span>
                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct.toFixed(0)} aria-valuemin="0" aria-valuemax="100" aria-label={`${cat}: ${pct.toFixed(0)}% das despesas`}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: CAT_COLORS[cat] || '#94a3b8' }} />
                </div>
                <span className="text-xs font-semibold font-mono-number tracking-tight w-20 text-right shrink-0">{formatCurrency(val)}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
