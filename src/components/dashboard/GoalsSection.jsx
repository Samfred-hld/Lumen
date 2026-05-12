import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/financeUtils';
import { getGoalProgress } from '@/lib/financeUtils';

export default function GoalsSection({ goals, transactions }) {
  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-amber-500" aria-hidden="true" /> Metas Ativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
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
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden progress-animated" role="progressbar" aria-valuenow={pct.toFixed(0)} aria-valuemin="0" aria-valuemax="100" aria-label={`Meta ${g.name}: ${pct.toFixed(0)}% concluída`}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: g.color || '#10b981' }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatCurrency(current)}</span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(g.targetValue)}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
