import React, { useState, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import MsIcon from '@/components/ui/ms-icon';
import { toSnakeCase } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/KpiCard';
import GoalCard from '@/components/finance/GoalCard';
import { GoalModal, DepositModal } from '@/pages/PlanejamentoModals';
import { formatCurrency, getGoalProgress } from '@/lib/financeUtils';
import { calculateInvestmentStats, INVESTMENT_TYPES } from '@/lib/insights';
import { useTransactions, useGoals } from '@/hooks/useData';

// ═══ SVG Pie Chart ═══
function AllocationPieChart({ byType }) {
  const total = byType.reduce((s, t) => s + t.invested, 0);
  if (total === 0) return null;

  const cx = 100, cy = 100, r = 80;
  const circumference = 2 * Math.PI * r;

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="200" height="200" viewBox="0 0 200 200" className="shrink-0">
        {byType.map((type, i) => {
          const percent = type.percentage / 100;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const rotation = cumulativePercent * 360 - 90;
          cumulativePercent += percent;

          return (
            <circle
              key={type.type}
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke={type.color}
              strokeWidth="32"
              strokeDasharray={strokeDasharray}
              strokeDashoffset="0"
              transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {byType.map(type => (
          <div key={type.type} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: type.color }} />
            <span className="text-muted-foreground">{type.label}</span>
            <span className="font-medium tabular-nums">{type.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Investments() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [depositGoal, setDepositGoal] = useState(null);

  const { data: rawGoals = [], refetch: refetchGoals } = useGoals();
  const { data: rawTransactions = [] } = useTransactions(500);
  const goals = Array.isArray(rawGoals) ? rawGoals : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

  const stats = useMemo(
    () => calculateInvestmentStats(goals, transactions),
    [goals, transactions]
  );

  const handleSave = async (data) => {
    const row = toSnakeCase(data);
    if (editing) {
      await supabase.from('goals').update(row).eq('id', editing.id);
    } else {
      await supabase.from('goals').insert(row).select().single();
    }
    refetchGoals();
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await supabase.from('goals').delete().eq('id', id);
    refetchGoals();
  };

  const handleDeposit = async (amount) => {
    const goal = depositGoal;
    const current = getGoalProgress(goal, transactions);
    await supabase.from('goals').update({ current_value: current + amount }).eq('id', goal.id);
    refetchGoals();
    setDepositGoal(null);
  };

  return (
    <div className="py-xl max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Acompanhe sua carteira de investimentos</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <MsIcon name="add" size={14} className="mr-1" /> Novo Investimento
        </Button>
      </div>

      {/* KPI Summary */}
      {stats.goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm md:gap-md">
          <KpiCard
            label="TOTAL INVESTIDO"
            value={formatCurrency(stats.totalInvested)}
            icon="account_balance_wallet"
            variant="investment"
          />
          <KpiCard
            label="META TOTAL"
            value={formatCurrency(stats.totalTarget)}
            icon="flag"
            variant="balance"
          />
          <KpiCard
            label="PROGRESSO"
            value={`${stats.overallProgress}%`}
            icon="trending_up"
            variant="income"
          />
        </div>
      )}

      {/* Allocation Pie Chart */}
      {stats.byType.length > 0 && (
        <div className="bg-surface border border-surface-border p-card-padding">
          <h3 className="font-title text-title mb-4">Alocação por Tipo</h3>
          <AllocationPieChart byType={stats.byType} />
        </div>
      )}

      {/* Empty State */}
      {stats.goals.length === 0 && (
        <div className="bg-surface border border-surface-border p-xl text-center">
          <MsIcon name="account_balance_wallet" size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum investimento registrado</p>
          <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>
            Criar primeiro investimento
          </Button>
        </div>
      )}

      {/* Investment Goals Grid */}
      {stats.goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.goals.map(gs => {
            const goal = goals.find(g => g.id === gs.id);
            if (!goal) return null;
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                currentProgress={gs.invested}
                onEdit={g => { setEditing(g); setShowModal(true); }}
                onDelete={handleDelete}
                onDeposit={g => setDepositGoal(g)}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      <GoalModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
        goal={editing}
        defaultInvestmentType={editing?.investmentType || ''}
      />
      <DepositModal
        open={!!depositGoal}
        onClose={() => setDepositGoal(null)}
        onSave={handleDeposit}
        goal={depositGoal}
      />
    </div>
  );
}
