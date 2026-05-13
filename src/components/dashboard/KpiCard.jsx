import React from 'react';
import { cn } from '@/lib/utils';

const KPI_STYLES = {
  income:     { accent: 'bg-kpi-income',    valueColor: 'text-on-surface', iconClass: 'text-kpi-income' },
  expense:    { accent: 'bg-kpi-expense',   valueColor: 'text-on-surface', iconClass: 'text-kpi-expense' },
  balance:    { accent: 'bg-secondary-container', valueColor: 'text-on-surface', iconClass: 'text-secondary' },
  investment: { accent: 'bg-warning',       valueColor: 'text-on-surface', iconClass: 'text-warning' },
};

export function KpiCard({ label, value, icon, variant = 'balance', delta, deltaLabel }) {
  const s = KPI_STYLES[variant] || KPI_STYLES.balance;
  const deltaText = delta !== undefined
    ? `${delta > 0 ? 'Aumentou' : delta < 0 ? 'Diminuiu' : 'Sem alteração'} ${Math.abs(delta).toFixed(1)}% ${deltaLabel || ''}`
    : '';

  return (
    <div
      className="bg-surface border border-surface-border p-card-padding relative overflow-hidden group hover:shadow-lg transition-shadow"
      role="region"
      aria-label={`${label}: ${value}${deltaText ? '. ' + deltaText : ''}`}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", s.accent)} />
      <div className="flex justify-between items-start mb-sm">
        <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
        <span className={cn("material-symbols-outlined text-sm", s.iconClass)}>{icon}</span>
      </div>
      <div className="font-headline text-headline text-on-surface">{value}</div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-xs" aria-hidden="true">
          {delta > 0 ? (
            <span className={cn("material-symbols-outlined text-[12px]", variant === 'expense' ? 'text-danger' : 'text-success')}>trending_up</span>
          ) : delta < 0 ? (
            <span className={cn("material-symbols-outlined text-[12px]", variant === 'expense' ? 'text-success' : 'text-danger')}>trending_down</span>
          ) : (
            <span className="material-symbols-outlined text-[12px] text-muted-foreground">remove</span>
          )}
          <span className={cn("font-body-sm text-body-sm",
            delta > 0 ? (variant === 'expense' ? 'text-danger' : 'text-success') :
            delta < 0 ? (variant === 'expense' ? 'text-success' : 'text-danger') :
            'text-muted-foreground'
          )}>
            {delta > 0 ? '+' : ''}{delta?.toFixed(1)}%
          </span>
          {deltaLabel && <span className="font-body-sm text-body-sm text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function getDelta(cur, prev) {
  if (!prev && !cur) return 0;
  if (!prev) return 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
