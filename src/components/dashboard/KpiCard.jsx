import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const KPI_STYLES = {
  income: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700', accent: 'bg-emerald-500' },
  expense: { iconBg: 'bg-red-100', iconColor: 'text-red-500', valueColor: 'text-red-600', accent: 'bg-red-500' },
  balance: { iconBg: 'bg-stone-100', iconColor: 'text-stone-600', valueColor: 'text-stone-700', accent: 'bg-stone-500' },
  investment: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueColor: 'text-amber-700', accent: 'bg-amber-500' },
};

export function KpiCard({ label, value, icon: Icon, variant = 'balance', delta, deltaLabel }) {
  const s = KPI_STYLES[variant] || KPI_STYLES.balance;
  const deltaText = delta !== undefined
    ? `${delta > 0 ? 'Aumentou' : delta < 0 ? 'Diminuiu' : 'Sem alteração'} ${Math.abs(delta).toFixed(1)}% ${deltaLabel || ''}`
    : '';
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-300 hover:shadow-md"
      role="region"
      aria-label={`${label}: ${value}${deltaText ? '. ' + deltaText : ''}`}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", s.accent)} />
      <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn("text-[22px] font-bold tabular-nums tracking-tight", s.valueColor)} aria-hidden="true">{value}</p>
            {delta !== undefined && (
              <div className="flex items-center gap-1 mt-0.5" aria-hidden="true">
                {delta > 0 ? (
                  <ArrowUpRight size={12} className={variant === 'expense' ? 'text-red-500' : 'text-emerald-500'} />
                ) : delta < 0 ? (
                  <ArrowDownRight size={12} className={variant === 'expense' ? 'text-emerald-500' : 'text-red-500'} />
                ) : (
                  <Minus size={12} className="text-muted-foreground" />
                )}
                <span className={cn("text-[10px] font-semibold",
                  delta > 0 ? (variant === 'expense' ? 'text-red-500' : 'text-emerald-500') :
                  delta < 0 ? (variant === 'expense' ? 'text-emerald-500' : 'text-red-500') :
                  'text-muted-foreground'
                )}>
                  {delta > 0 ? '+' : ''}{delta?.toFixed(1)}%
                </span>
                {deltaLabel && <span className="text-[10px] text-muted-foreground">{deltaLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded", s.iconBg)} aria-hidden="true">
            <Icon size={20} className={s.iconColor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function getDelta(cur, prev) {
  if (!prev && !cur) return 0;
  if (!prev) return 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
