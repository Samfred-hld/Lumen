import React from 'react';
import { cn } from '@/lib/utils';
import { filterByMonth, calcTotals, getGoalProgress, getMonthKey } from '@/lib/financeUtils';

function calcHealthScore({ transactions, budgets, goals, month, year }) {
  const monthTx = filterByMonth(transactions, year, month);
  const totals = calcTotals(monthTx);
  const monthKey = getMonthKey(year, month);
  const monthBudgets = budgets.filter(b => b.month === monthKey);

  let savingsScore = 0, savingsRate = 0;
  if (totals.income > 0) {
    savingsRate = (totals.investment / totals.income) * 100;
    if (savingsRate >= 20) savingsScore = 25;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate >= 5) savingsScore = 10;
  }

  let budgetScore = 0;
  if (monthBudgets.length > 0) {
    const respected = monthBudgets.filter(b => {
      const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
      return spent <= b.limit;
    }).length;
    const pct = (respected / monthBudgets.length) * 100;
    if (pct >= 100) budgetScore = 25;
    else if (pct >= 75) budgetScore = 18;
    else if (pct >= 50) budgetScore = 10;
  } else { budgetScore = 25; }

  let goalsScore = 0;
  if (goals.length > 0) {
    const withProgress = goals.filter(g => {
      const current = getGoalProgress(g, transactions);
      return g.targetValue > 0 && (current / g.targetValue) >= 0.10;
    }).length;
    goalsScore = Math.round(25 * (withProgress / goals.length));
  } else { goalsScore = 25; }

  let balanceScore = 0;
  if (totals.balance > 0) balanceScore = 25;
  else if (totals.balance === 0) balanceScore = 10;

  return { score: savingsScore + budgetScore + goalsScore + balanceScore, savingsRate };
}

function getLabel(score) {
  if (score >= 80) return 'EXCELENTE';
  if (score >= 60) return 'BOM';
  if (score >= 40) return 'ATENÇÃO';
  return 'CRÍTICO';
}

function getBarPct(score) {
  if (score >= 80) return '90%';
  if (score >= 60) return '72%';
  if (score >= 40) return '45%';
  return '20%';
}

function getBarColor(score) {
  if (score >= 70) return 'bg-success';
  if (score >= 40) return 'bg-warning';
  return 'bg-danger';
}

export default function FinancialHealthScore({ transactions, budgets, goals, month, year }) {
  const { score } = calcHealthScore({ transactions, budgets, goals, month, year });

  return (
    <div className="bg-surface border-2 border-surface-border p-lg">
      <h2 className="font-headline text-headline mb-lg">Saúde Financeira</h2>
      <div className="relative flex flex-col items-center justify-center mb-xl">
        <div className="w-48 h-48 rounded-full border-[12px] border-surface-container-low flex items-center justify-center relative">
          <div className={cn("absolute inset-0 rounded-full border-[12px] border-r-transparent border-b-transparent rotate-45", getBarColor(score))} />
          <div className="flex flex-col items-center">
            <span className="font-display-sm text-[48px] font-bold text-on-surface">{score}</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">PONTOS</span>
          </div>
        </div>
      </div>
      <div className="space-y-md">
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>RESERVA DE EMERGÊNCIA</span>
            <span className="text-success">EXCELENTE</span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className="h-full bg-success w-[90%]" />
          </div>
        </div>
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>TAXA DE POUPANÇA</span>
            <span className={cn(score >= 60 ? 'text-success' : 'text-warning')}>{getLabel(score)}</span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className={cn("h-full", getBarColor(score))} style={{ width: getBarPct(score) }} />
          </div>
        </div>
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>DIVERSIFICAÇÃO</span>
            <span className="text-success">BOM</span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className="h-full bg-primary-light w-[72%]" />
          </div>
        </div>
      </div>
      <button className="w-full mt-xl py-md bg-primary-container text-on-primary-container font-label-caps text-label-caps tracking-widest hover:brightness-110 transition-all uppercase">
        Otimizar Carteira
      </button>
    </div>
  );
}
