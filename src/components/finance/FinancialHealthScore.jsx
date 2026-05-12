import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { filterByMonth, calcTotals, getGoalProgress, getMonthKey } from '@/lib/financeUtils';
import { ShieldCheck } from 'lucide-react';

/**
 * Calcula o score de saúde financeira (0-100).
 * Cada critério vale até 25 pontos.
 */
function calcHealthScore({ transactions, budgets, goals, month, year }) {
  const monthTx = filterByMonth(transactions, year, month);
  const totals = calcTotals(monthTx);
  const monthKey = getMonthKey(year, month);
  const monthBudgets = budgets.filter(b => b.month === monthKey);

  // 1. Taxa de poupança (investimentos / receita)
  let savingsScore = 0;
  let savingsRate = 0;
  if (totals.income > 0) {
    savingsRate = (totals.investment / totals.income) * 100;
    if (savingsRate >= 20) savingsScore = 25;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate >= 5) savingsScore = 10;
    else savingsScore = 0;
  }

  // 2. Orçamentos respeitados
  let budgetScore = 0;
  let budgetPct = 100;
  if (monthBudgets.length > 0) {
    const respected = monthBudgets.filter(b => {
      const spent = monthTx
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((s, t) => s + t.value, 0);
      return spent <= b.limit;
    }).length;
    budgetPct = (respected / monthBudgets.length) * 100;
    if (budgetPct >= 100) budgetScore = 25;
    else if (budgetPct >= 75) budgetScore = 18;
    else if (budgetPct >= 50) budgetScore = 10;
    else budgetScore = 0;
  } else {
    // Sem orçamentos → neutro, dá os pontos
    budgetScore = 25;
  }

  // 3. Metas ativas com progresso
  let goalsScore = 0;
  let goalsWithProgress = 0;
  if (goals.length > 0) {
    goalsWithProgress = goals.filter(g => {
      const current = getGoalProgress(g, transactions);
      return g.targetValue > 0 && (current / g.targetValue) >= 0.10;
    }).length;
    if (goalsWithProgress >= goals.length) goalsScore = 25;
    else if (goalsWithProgress > 0) goalsScore = Math.round(25 * (goalsWithProgress / goals.length));
    else goalsScore = 0;
  } else {
    // Sem metas → neutro
    goalsScore = 25;
  }

  // 4. Saldo positivo
  let balanceScore = 0;
  if (totals.balance > 0) balanceScore = 25;
  else if (totals.balance === 0) balanceScore = 10;
  else balanceScore = 0;

  const total = savingsScore + budgetScore + goalsScore + balanceScore;

  return {
    score: total,
    criteria: [
      {
        label: 'Taxa de poupança',
        value: `${savingsRate.toFixed(1)}%`,
        detail: totals.income > 0 ? `${savingsRate >= 20 ? '≥20%' : savingsRate >= 10 ? '10-20%' : savingsRate >= 5 ? '5-10%' : '<5%'} da receita` : 'Sem receita',
        passed: savingsScore >= 15,
        points: savingsScore,
      },
      {
        label: 'Orçamentos respeitados',
        value: monthBudgets.length > 0 ? `${budgetPct.toFixed(0)}%` : 'Nenhum',
        detail: monthBudgets.length > 0
          ? `${monthBudgets.filter(b => {
              const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
              return spent <= b.limit;
            }).length}/${monthBudgets.length} dentro do limite`
          : 'Sem orçamentos definidos',
        passed: budgetScore >= 18,
        points: budgetScore,
      },
      {
        label: 'Metas com progresso',
        value: goals.length > 0 ? `${goalsWithProgress}/${goals.length}` : 'Nenhuma',
        detail: goals.length > 0
          ? `${goalsWithProgress} meta(s) com ≥10% de progresso`
          : 'Sem metas definidas',
        passed: goalsScore >= 15,
        points: goalsScore,
      },
      {
        label: 'Saldo do mês',
        value: totals.balance >= 0 ? 'Positivo' : 'Negativo',
        detail: totals.balance > 0 ? 'Receitas superam despesas' : totals.balance === 0 ? 'Equilibrado' : 'Despesas superam receitas',
        passed: balanceScore >= 10,
        points: balanceScore,
      },
    ],
  };
}

function getScoreColor(score) {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function getProgressColor(score) {
  if (score >= 70) return '[&>div]:bg-emerald-500';
  if (score >= 40) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

function getLabel(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Atenção';
  return 'Crítico';
}

function getLabelColor(score) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 60) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export default function FinancialHealthScore({ transactions, budgets, goals, month, year }) {
  const { score, criteria } = calcHealthScore({ transactions, budgets, goals, month, year });

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/40">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-teal-500" />
          Saúde Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center gap-5">
          {/* Score circle */}
          <div className="flex flex-col items-center shrink-0">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center border-4",
              score >= 70 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
              score >= 40 ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
              'border-red-500 bg-red-50 dark:bg-red-900/20'
            )}>
              <span className={cn("text-3xl font-bold tabular-nums", getScoreColor(score))}>
                {score}
              </span>
            </div>
            <span className={cn(
              "text-xs font-semibold mt-2 px-2.5 py-0.5 rounded-full",
              getLabelColor(score)
            )}>
              {getLabel(score)}
            </span>
          </div>

          {/* Progress + criteria */}
          <div className="flex-1 min-w-0 space-y-3">
            <Progress
              value={score}
              className={cn("h-2.5", getProgressColor(score))}
              aria-label={`Score de saúde financeira: ${score} de 100`}
            />
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0" aria-label={c.passed ? 'Aprovado' : 'Reprovado'} role="img">{c.passed ? '✅' : '❌'}</span>
                  <span className="text-muted-foreground flex-1 truncate">{c.label}</span>
                  <span className={cn("font-semibold shrink-0 tabular-nums", c.passed ? 'text-foreground' : 'text-red-500')}>
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
