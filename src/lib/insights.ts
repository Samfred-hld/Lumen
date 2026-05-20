// ══════════════════════════════════════════
// LÚMEN — Investment Insights Utilities
// ══════════════════════════════════════════

import { getGoalProgress } from './financeUtils';

type Transaction = Record<string, any>;
type Goal = Record<string, any>;

export const INVESTMENT_TYPES = [
  { value: 'renda_fixa', label: 'Renda Fixa', color: '#10b981' },
  { value: 'renda_variavel', label: 'Renda Variável', color: '#3b82f6' },
  { value: 'cripto', label: 'Criptomoedas', color: '#f59e0b' },
  { value: 'fundos', label: 'Fundos', color: '#8b5cf6' },
  { value: 'imoveis', label: 'Imóveis', color: '#ec4899' },
  { value: 'outros', label: 'Outros', color: '#6b7280' },
];

/**
 * Get the display label for an investment type value.
 * Falls back to "Outros" if not found.
 */
export function getInvestmentTypeLabel(typeValue: string): string {
  const found = INVESTMENT_TYPES.find(t => t.value === typeValue);
  return found ? found.label : 'Outros';
}

/**
 * Get the color for an investment type value.
 * Falls back to "#6b7280" if not found.
 */
export function getInvestmentTypeColor(typeValue: string): string {
  const found = INVESTMENT_TYPES.find(t => t.value === typeValue);
  return found ? found.color : '#6b7280';
}

/**
 * Calculate investment statistics across all investment-type goals.
 *
 * Returns:
 * - totalInvested: sum of all investment goal progress
 * - totalTarget: sum of all investment goal targets
 * - overallProgress: percentage (0-100)
 * - byType: grouped stats per investment type
 * - goals: per-goal detail array
 */
export function calculateInvestmentStats(goals: Goal[], transactions: Transaction[]) {
  // Filter to only goals with an investmentType set
  const investmentGoals = (goals || []).filter(g => g.investmentType);

  // Build per-goal stats
  const goalStats = investmentGoals.map(goal => {
    const invested = getGoalProgress(goal, transactions || []);
    const target = goal.targetValue || 0;
    const progress = target > 0 ? Math.min(100, (invested / target) * 100) : 0;
    const typeInfo = INVESTMENT_TYPES.find(t => t.value === goal.investmentType);

    return {
      id: goal.id,
      name: goal.name,
      type: goal.investmentType,
      typeLabel: typeInfo ? typeInfo.label : 'Outros',
      typeColor: typeInfo ? typeInfo.color : '#6b7280',
      invested,
      target,
      progress,
      deadline: goal.deadline || null,
    };
  });

  // Totals
  const totalInvested = goalStats.reduce((sum, g) => sum + g.invested, 0);
  const totalTarget = goalStats.reduce((sum, g) => sum + g.target, 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, (totalInvested / totalTarget) * 100) : 0;

  // Group by investment type
  const typeMap: Record<string, { invested: number; target: number; count: number }> = {};
  for (const gs of goalStats) {
    if (!typeMap[gs.type]) {
      typeMap[gs.type] = { invested: 0, target: 0, count: 0 };
    }
    typeMap[gs.type].invested += gs.invested;
    typeMap[gs.type].target += gs.target;
    typeMap[gs.type].count += 1;
  }

  const byType = INVESTMENT_TYPES
    .filter(t => typeMap[t.value])
    .map(t => ({
      type: t.value,
      label: t.label,
      color: t.color,
      invested: typeMap[t.value].invested,
      target: typeMap[t.value].target,
      count: typeMap[t.value].count,
      percentage: totalInvested > 0
        ? Math.round((typeMap[t.value].invested / totalInvested) * 100)
        : 0,
    }));

  return {
    totalInvested,
    totalTarget,
    overallProgress: Math.round(overallProgress * 10) / 10, // 1 decimal
    byType,
    goals: goalStats,
  };
}
