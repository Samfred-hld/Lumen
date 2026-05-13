import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/financeUtils';
import { getGoalProgress } from '@/lib/financeUtils';

export default function GoalsSection({ goals, transactions }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col group">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-amber-500" aria-hidden="true" /> Metas Ativas
        </h3>
      </div>
      <div className="p-4 flex-1 space-y-3">
        {goals.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada</p>
        ) : (
          goals.slice(0, 4).map(g => {
            const current = getGoalProgress(g, transactions);
            const pct = Math.min(100, g.targetValue > 0 ? (current / g.targetValue) * 100 : 0);
            return (
              <div key={g.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium truncate">{g.name}</span>
                  <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden progress-animated" role="progressbar" aria-valuenow={pct.toFixed(0)} aria-valuemin="0" aria-valuemax="100" aria-label={`Meta ${g.name}: ${pct.toFixed(0)}% concluída`}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: g.color || '#10b981' }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs font-mono-number text-muted-foreground">{formatCurrency(current)}</span>
                  <span className="text-xs font-mono-number font-semibold text-slate-700">{formatCurrency(g.targetValue)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
