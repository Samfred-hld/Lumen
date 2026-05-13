import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme';
import { formatCurrency } from '@/lib/financeUtils';

export default function ChartsSection({ barData, processedPieData }) {
  const barSummary = barData.map(d => `${d.name}: receitas ${formatCurrency(d.income)}, despesas ${formatCurrency(d.expense)}`).join('; ');
  const pieSummary = processedPieData.map(d => `${d.name}: ${formatCurrency(d.value)}`).join('; ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-primary" aria-hidden="true" /> Evolução Mensal
          </h3>
        </div>
        <div className="p-4 flex-1">
          <div className="sr-only" role="img" aria-label={`Evolução mensal de receitas e despesas. ${barSummary}`}>
            Resumo: {barSummary}
          </div>
          <ResponsiveContainer width="100%" height={200} aria-hidden="true">
            <BarChart data={barData} barSize={12}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis {...AXIS_STYLE} dataKey="name" />
              <YAxis {...AXIS_STYLE} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatCurrency(v), name]} />
              <Bar dataKey="income" name="Receitas" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" name="Despesas" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-amber-500" aria-hidden="true" /> Gastos por Categoria
          </h3>
        </div>
        <div className="p-4 flex-1">
          {processedPieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem despesas neste mês</div>
          ) : (
            <>
              <div className="sr-only" role="img" aria-label={`Gastos por categoria este mês. ${pieSummary}`}>
                Resumo: {pieSummary}
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180} aria-hidden="true">
                  <PieChart>
                    <Pie data={processedPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {processedPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatCurrency(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {processedPieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} aria-hidden="true" />
                      <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="font-semibold shrink-0 font-mono-number tracking-tight">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
