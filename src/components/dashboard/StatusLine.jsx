import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';

/**
 * StatusLine — compact contextual indicators under the Hero Number
 * "Newspaper subtitle line. Dense but readable."
 */
export default function StatusLine({ budgets, monthBudgets, goals, upcomingItems, monthTx }) {
  const navigate = useNavigate();

  // 1. Budget usage percentage
  const budgetItem = React.useMemo(() => {
    if (!monthBudgets || monthBudgets.length === 0) return null;
    const totalLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0);
    if (totalLimit <= 0) return null;
    const totalSpent = monthTx
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.value, 0);
    const pct = Math.round((totalSpent / totalLimit) * 100);
    if (pct === 0) return null;
    return { pct, over: pct > 100 };
  }, [monthBudgets, monthTx]);

  // 2. Active goal with nearest deadline or highest progress
  const goalItem = React.useMemo(() => {
    if (!goals || goals.length === 0) return null;
    const active = goals.filter(g => {
      const current = g.currentAmount || 0;
      const target = g.targetAmount || 0;
      return target > 0 && current < target;
    });
    if (active.length === 0) return null;
    // Pick the one closest to completion
    const best = active.reduce((a, b) => {
      const pctA = (a.currentAmount || 0) / (a.targetAmount || 1);
      const pctB = (b.currentAmount || 0) / (b.targetAmount || 1);
      return pctB > pctA ? b : a;
    });
    const remaining = (best.targetAmount || 0) - (best.currentAmount || 0);
    if (remaining <= 0) return null;
    return { name: best.name, remaining };
  }, [goals]);

  // 3. Nearest upcoming due date
  const dueItem = React.useMemo(() => {
    if (!upcomingItems || upcomingItems.length === 0) return null;
    const nearest = upcomingItems[0]; // already sorted by date
    if (!nearest) return null;
    return nearest;
  }, [upcomingItems]);

  const items = [];
  if (budgetItem) {
    items.push({
      key: 'budget',
      emoji: budgetItem.over ? '🔴' : '💰',
      text: `Orçamento: ${budgetItem.pct}%`,
      color: budgetItem.over ? 'text-[#991B1B]' : 'text-muted-foreground',
      onClick: () => navigate('/budgets'),
    });
  }
  if (goalItem) {
    items.push({
      key: 'goal',
      emoji: '🎯',
      text: `Meta: ${formatCurrency(goalItem.remaining)}`,
      color: 'text-muted-foreground',
      onClick: () => navigate('/goals'),
    });
  }
  if (dueItem) {
    items.push({
      key: 'due',
      emoji: '⚠️',
      text: dueItem.label,
      color: 'text-muted-foreground',
      onClick: () => navigate('/cards'),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-[13px] font-medium text-muted-foreground animate-fade-in">
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          {i > 0 && <span className="text-muted-foreground/40 select-none">·</span>}
          <button
            onClick={item.onClick}
            className={cn(
              'inline-flex items-center gap-1 hover:text-foreground transition-colors',
              item.color
            )}
          >
            <span className="text-xs">{item.emoji}</span>
            {item.text}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
