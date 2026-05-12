import React from 'react';
import { formatCurrency } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';

/**
 * HeroBalance — Concrete & Ink editorial hero number
 * "The headline of your financial newspaper"
 */
export default function HeroBalance({ balance, income, expense }) {
  const isPositive = balance > 0;
  const isNegative = balance < 0;
  const isZero = balance === 0;

  const colorClass = isPositive
    ? 'text-[#1A5C3A]'
    : isNegative
      ? 'text-[#991B1B]'
      : 'text-[#C2410C]';

  const contextText = isPositive
    ? `de ${formatCurrency(income)} de receita este mês`
    : isNegative
      ? `${formatCurrency(expense)} em despesas este mês`
      : 'sem movimentação este mês';

  return (
    <div className="animate-fade-in">
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">
        Disponível este mês
      </p>
      <p className={cn(
        'text-5xl lg:text-6xl font-bold tracking-tight tabular-nums font-display',
        colorClass
      )}>
        {formatCurrency(balance)}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {contextText}
      </p>
      {/* Editorial separator */}
      <div className="h-px bg-[#C2410C] mt-4 opacity-30" />
    </div>
  );
}
