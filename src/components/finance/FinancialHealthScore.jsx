import React from 'react';
import { cn } from '@/lib/utils';
import { filterByMonth, calcTotals, getGoalProgress, getMonthKey } from '@/lib/financeUtils';

function calcHealthScore({ transactions, budgets, goals, month, year }) {
  const monthTx = filterByMonth(transactions, year, month);
  const totals = calcTotals(monthTx);
  const monthKey = getMonthKey(year, month);
  const monthBudgets = budgets.filter(b => b.month === monthKey);

  // ── Savings Rate (0-25 pts) ──
  let savingsScore = 0, savingsRate = 0;
  if (totals.income > 0) {
    savingsRate = (totals.investment / totals.income) * 100;
    if (savingsRate >= 20) savingsScore = 25;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate >= 5) savingsScore = 10;
  }

  // ── Budget Adherence (0-25 pts) ──
  let budgetScore = 0, budgetPct = 100;
  if (monthBudgets.length > 0) {
    const respected = monthBudgets.filter(b => {
      const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
      return spent <= b.limit;
    }).length;
    budgetPct = (respected / monthBudgets.length) * 100;
    if (budgetPct >= 100) budgetScore = 25;
    else if (budgetPct >= 75) budgetScore = 18;
    else if (budgetPct >= 50) budgetScore = 10;
  } else { budgetScore = 25; }

  // ── Goals Progress (0-25 pts) ──
  let goalsScore = 0, goalsPct = 100;
  if (goals.length > 0) {
    const withProgress = goals.filter(g => {
      const current = getGoalProgress(g, transactions);
      return g.targetValue > 0 && (current / g.targetValue) >= 0.10;
    }).length;
    goalsPct = (withProgress / goals.length) * 100;
    goalsScore = Math.round(25 * (withProgress / goals.length));
  } else { goalsScore = 25; }

  // ── Balance Health (0-25 pts) ──
  let balanceScore = 0;
  if (totals.balance > 0) balanceScore = 25;
  else if (totals.balance === 0) balanceScore = 10;

  // ── Emergency Reserve: months of expenses covered by balance ──
  const allTotals = calcTotals(transactions);
  const last3Expenses = [];
  for (let i = 0; i < 3; i++) {
    let m = month - i, y = year;
    if (m < 0) { m += 12; y--; }
    const tx = filterByMonth(transactions, y, m);
    const t = calcTotals(tx);
    last3Expenses.push(t.expense + t.investment);
  }
  const avgMonthlyExpense = last3Expenses.reduce((s, v) => s + v, 0) / 3;
  const emergencyMonths = avgMonthlyExpense > 0 ? allTotals.balance / avgMonthlyExpense : 0;
  const emergencyPct = Math.min(100, Math.round((emergencyMonths / 6) * 100)); // 6 months = 100%

  // ── Diversification: number of distinct categories with spending ──
  const allExpenseTx = transactions.filter(t => t.type === 'expense');
  const uniqueCats = new Set(allExpenseTx.map(t => t.category).filter(Boolean));
  const diversificationPct = Math.min(100, Math.round((uniqueCats.size / 10) * 100)); // 10 categories = 100%

  return {
    score: savingsScore + budgetScore + goalsScore + balanceScore,
    savingsRate,
    emergencyMonths: Math.round(emergencyMonths * 10) / 10,
    emergencyPct,
    savingsPct: Math.min(100, Math.round(savingsRate * 5)), // 20% rate = 100%
    diversificationPct,
    budgetPct: Math.round(budgetPct),
    goalsPct: Math.round(goalsPct),
  };
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
  const { score, savingsRate, emergencyMonths, emergencyPct, savingsPct, diversificationPct } = calcHealthScore({ transactions, budgets, goals, month, year });

  const getEmergencyLabel = () => {
    if (emergencyMonths >= 6) return 'EXCELENTE';
    if (emergencyMonths >= 3) return 'BOM';
    if (emergencyMonths >= 1) return 'ATENÇÃO';
    return 'CRÍTICO';
  };

  const getEmergencyColor = () => {
    if (emergencyMonths >= 6) return 'text-success';
    if (emergencyMonths >= 3) return 'text-primary-light';
    if (emergencyMonths >= 1) return 'text-warning';
    return 'text-danger';
  };

  const getDiversificationLabel = () => {
    if (diversificationPct >= 70) return 'BOM';
    if (diversificationPct >= 40) return 'MÉDIO';
    return 'BAIXO';
  };

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
        {/* Emergency Reserve — real calculation */}
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>RESERVA DE EMERGÊNCIA</span>
            <span className={getEmergencyColor()}>
              {getEmergencyLabel()} ({emergencyMonths.toFixed(1)} meses)
            </span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className={cn("h-full transition-all duration-700", getBarColor(emergencyPct >= 70 ? 80 : emergencyPct >= 40 ? 50 : 20))}
              style={{ width: `${emergencyPct}%` }} />
          </div>
        </div>
        {/* Savings Rate — real calculation */}
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>TAXA DE POUPANÇA</span>
            <span className={cn(savingsRate >= 10 ? 'text-success' : savingsRate >= 5 ? 'text-warning' : 'text-danger')}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className={cn("h-full transition-all duration-700", getBarColor(savingsPct >= 70 ? 80 : savingsPct >= 40 ? 50 : 20))}
              style={{ width: `${savingsPct}%` }} />
          </div>
        </div>
        {/* Diversification — real calculation */}
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between font-label-caps text-label-caps">
            <span>DIVERSIFICAÇÃO</span>
            <span className={cn(diversificationPct >= 70 ? 'text-success' : diversificationPct >= 40 ? 'text-warning' : 'text-danger')}>
              {getDiversificationLabel()}
            </span>
          </div>
          <div className="h-1 bg-surface-container-high w-full">
            <div className={cn("h-full bg-primary-light transition-all duration-700")}
              style={{ width: `${diversificationPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
