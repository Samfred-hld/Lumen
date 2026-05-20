import React, { useState, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import MsIcon from '@/components/ui/ms-icon';
import { CAT_MATERIAL_ICONS } from '@/lib/iconMap';
import BudgetCard from '@/components/finance/BudgetCard';
import GoalCard from '@/components/finance/GoalCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, filterByMonth, getMonthKey, getGoalProgress, calcTotals } from '@/lib/financeUtils';
import { DEFAULT_CATEGORIES, MONTH_NAMES, CAT_COLORS } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useBudgets, useTransactions, useGoals } from '@/hooks/useData';
import { GoalModal, DepositModal } from '@/pages/PlanejamentoModals';

function Sparkline({ data, color = '#10b981', width = 80, height = 24 }) {
  if (!data || data.length === 0 || data.every(v => v === 0)) return <span className="text-muted-foreground">-</span>;
  const max = Math.max(...data, 1);
  const padding = 2;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - (v / max) * effectiveHeight;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Planejamento() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const monthKey = getMonthKey(currentYear, currentMonth);
  const { data: rawBudgets, refetch: refetchBudgets } = useBudgets();
  const { data: rawTransactions } = useTransactions();
  const { data: rawGoals, refetch: refetchGoals } = useGoals();
  const budgets = Array.isArray(rawBudgets) ? rawBudgets : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const goals = Array.isArray(rawGoals) ? rawGoals : [];
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [budgetValues, setBudgetValues] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [depositGoal, setDepositGoal] = useState(null);
  const [activeTab, setActiveTab] = useState('orcamentos');

  const monthBudgets = useMemo(() => budgets.filter(b => b.month === monthKey), [budgets, monthKey]);
  const monthTx = useMemo(() => filterByMonth(transactions, currentYear, currentMonth), [transactions, currentYear, currentMonth]);
  const totals = useMemo(() => calcTotals(monthTx), [monthTx]);
  const totalBudgetLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalBudgetSpent = monthBudgets.reduce((s, b) => s + monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + (t.value || 0), 0), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + (g.targetValue || 0), 0);
  const totalGoalCurrent = goals.reduce((s, g) => s + getGoalProgress(g, transactions), 0);
  const goalProgressPct = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;
  const projectedSavings = totals.income - totalBudgetSpent - totals.investment;

  const openBudgetManager = () => { const v = {}; monthBudgets.forEach(b => { v[b.category] = String(b.limit || ''); }); setBudgetValues(v); setNewCategory(''); setShowBudgetManager(true); };
  const handleSaveAllBudgets = async () => {
    for (const [cat, val] of Object.entries(budgetValues).filter(([, v]) => parseFloat(v) > 0)) {
      const limit = parseFloat(val); const existing = monthBudgets.find(b => b.category === cat);
      if (existing) { if (existing.limit !== limit) await supabase.from('budgets').update({ limit }).eq('id', existing.id); }
      else await supabase.from('budgets').insert({ category: cat, limit, month: monthKey, isRecurring: false }).select().single();
    }
    for (const b of monthBudgets) { if (!budgetValues[b.category] || parseFloat(budgetValues[b.category]) <= 0) await supabase.from('budgets').delete().eq('id', b.id); }
    refetchBudgets(); setShowBudgetManager(false);
  };
  const handleSaveGoal = async (data) => { if (editingGoal) await supabase.from('goals').update(data).eq('id', editingGoal.id); else await supabase.from('goals').insert(data).select().single(); refetchGoals(); setShowGoalModal(false); setEditingGoal(null); };
  const handleDeleteGoal = async (id) => { await supabase.from('goals').delete().eq('id', id); refetchGoals(); };
  const handleDeposit = async (amount) => { const g = depositGoal; await supabase.from('goals').update({ currentValue: getGoalProgress(g, transactions) + amount }).eq('id', g.id); refetchGoals(); setDepositGoal(null); };

  return (
    <div className="space-y-xl">
      <section className="space-y-md">
        <div className="flex justify-between items-end border-b border-surface-border pb-sm">
          <h2 className="font-headline text-display-sm text-on-surface">Planejamento Mensal</h2>
          <span className="font-mono-number text-on-surface-variant text-sm">{MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {[['TOTAL ALOCADO', formatCurrency(totalBudgetLimit), 'text-on-surface'], ['ECONOMIA PROJETADA', formatCurrency(projectedSavings), projectedSavings >= 0 ? 'text-success' : 'text-danger'], ['PROGRESSO DAS METAS', `${goalProgressPct}%`, 'text-on-surface']].map(([l, v, c]) => (
            <div key={l} className="space-y-xs min-w-0"><p className="font-label-caps text-label-caps text-muted-foreground">{l}</p><h3 className={cn("font-display-sm text-display-sm tabular-nums truncate", c)}>{v}</h3><div className="h-[1px] w-full bg-editorial-rule" /></div>
          ))}
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded">
        {[
          { id: 'orcamentos', label: 'Orçamentos', icon: 'account_balance' },
          { id: 'comparacao', label: 'Comparação', icon: 'compare_arrows' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-sm font-medium transition-all duration-200",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MsIcon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orcamentos Tab */}
      {activeTab === 'orcamentos' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <div className="lg:col-span-8 space-y-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-base">
            <h3 className="font-headline text-headline">Orcamentos por Categoria</h3>
            <div className="flex items-center gap-md">
              <div className="flex items-center gap-1 bg-surface border border-surface-border rounded px-2 py-1">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-surface-container-low rounded"><MsIcon name="chevron_left" size={14} className="text-on-surface-variant" /></button>
                <span className="text-sm font-medium px-2 min-w-[100px] text-center font-mono-number">{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <button onClick={() => navigate(1)} className="p-1 hover:bg-surface-container-low rounded"><MsIcon name="chevron_right" size={14} className="text-on-surface-variant" /></button>
              </div>
              <button onClick={openBudgetManager} className="font-label-caps text-label-caps text-primary-light hover:underline">GERENCIAR ORCAMENTOS</button>
            </div>
          </div>
          {showBudgetManager && (
            <div className="bg-surface border border-surface-border p-card-padding space-y-md animate-fade-in-up">
              <div className="flex items-center justify-between mb-sm"><h4 className="font-title text-title">Gerenciar Orcamentos</h4><button onClick={() => setShowBudgetManager(false)} className="text-muted-foreground hover:text-on-surface"><MsIcon name="close" size={18} /></button></div>
              <div className="space-y-sm">
                {Object.entries(budgetValues).map(([cat, val]) => (
                  <div key={cat} className="flex items-center gap-sm">
                    <MsIcon name={CAT_MATERIAL_ICONS[cat] || 'category'} size={18} className="text-on-surface-variant shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{cat}</span>
                    <div className="relative w-32 shrink-0"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span><input type="number" min="0" step="0.01" value={val} onChange={e => setBudgetValues(p => ({ ...p, [cat]: e.target.value }))} className="w-full h-8 pl-8 pr-2 text-right text-sm font-mono-number border border-surface-border rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                    <button onClick={() => setBudgetValues(p => { const n = { ...p }; delete n[cat]; return n; })} className="p-1 hover:bg-red-50 rounded text-red-400 shrink-0"><MsIcon name="delete" size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-sm pt-sm border-t border-surface-border">
                <Select value={newCategory} onValueChange={setNewCategory}><SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Adicionar categoria..." /></SelectTrigger><SelectContent>{DEFAULT_CATEGORIES.filter(c => !budgetValues[c]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <button onClick={() => { if (newCategory && !budgetValues[newCategory]) { setBudgetValues(p => ({ ...p, [newCategory]: '' })); setNewCategory(''); } }} disabled={!newCategory} className="p-1.5 rounded bg-primary-container text-on-primary-container disabled:opacity-40"><MsIcon name="add" size={16} /></button>
              </div>
              <div className="flex gap-sm pt-sm"><Button variant="outline" className="flex-1" onClick={() => setShowBudgetManager(false)}>Cancelar</Button><Button className="flex-1" onClick={handleSaveAllBudgets}>Salvar Tudo</Button></div>
            </div>
          )}
          {!showBudgetManager && monthBudgets.length === 0 ? (
            <div className="bg-surface border border-surface-border p-xl text-center"><MsIcon name="account_balance" size={40} className="text-muted-foreground mx-auto mb-md" /><p className="text-muted-foreground text-sm mb-md">Nenhum orcamento para este mes</p><Button size="sm" onClick={openBudgetManager}><MsIcon name="add" size={14} className="mr-1" /> Gerenciar orcamentos</Button></div>
          ) : !showBudgetManager && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {monthBudgets.map(b => { const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + (t.value || 0), 0); return <BudgetCard key={b.id} budget={b} spent={spent} onEdit={() => openBudgetManager()} onDelete={async (id) => { await supabase.from('budgets').delete().eq('id', id); refetchBudgets(); }} />; })}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-base">
            <h3 className="font-headline text-headline">Objetivos de Longo Prazo</h3>
            <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }} className="text-on-surface-variant hover:text-primary transition-colors"><MsIcon name="add_circle" size={20} /></button>
          </div>
          {goals.length === 0 ? (
            <div className="bg-surface border border-surface-border p-xl text-center"><MsIcon name="flag" size={40} className="text-muted-foreground mx-auto mb-md" /><p className="text-muted-foreground text-sm mb-md">Nenhum objetivo cadastrado</p><Button size="sm" onClick={() => setShowGoalModal(true)}><MsIcon name="add" size={14} className="mr-1" /> Criar primeiro objetivo</Button></div>
          ) : (
            <div className="space-y-lg">
              {goals.map(g => <GoalCard key={g.id} goal={g} currentProgress={getGoalProgress(g, transactions)} onEdit={(goal) => { setEditingGoal(goal); setShowGoalModal(true); }} onDelete={handleDeleteGoal} onDeposit={setDepositGoal} />)}
            </div>
          )}
          {goals.length > 0 && monthBudgets.length > 0 && (() => {
            const overBudgets = monthBudgets.map(b => ({ ...b, spent: monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + (t.value || 0), 0) })).filter(b => b.spent > b.limit).sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));
            const leastGoal = goals.filter(g => getGoalProgress(g, transactions) < g.targetValue).sort((a, b) => (getGoalProgress(a, transactions) / a.targetValue) - (getGoalProgress(b, transactions) / b.targetValue))[0];
            if (!overBudgets.length || !leastGoal) return null;
            return (<div className="bg-on-primary-fixed text-on-primary p-card-padding rounded relative overflow-hidden group"><div className="relative z-10 space-y-sm"><h4 className="font-title text-title">Acelere seus planos</h4><p className="font-body-sm opacity-70">Identificamos {formatCurrency(overBudgets[0].spent - overBudgets[0].limit)} que podem ser realocados de "{overBudgets[0].category}" para "{leastGoal.name}".</p></div><MsIcon name="bolt" size={128} className="absolute -bottom-4 -right-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform text-on-primary" /></div>);
          })()}
        </div>
      </div>
      )}

      {/* Comparacao Tab */}
      {activeTab === 'comparacao' && (
        <div className="space-y-lg">
          {monthBudgets.length === 0 ? (
            <div className="bg-surface border border-surface-border p-xl text-center">
              <MsIcon name="compare_arrows" size={40} className="text-muted-foreground mx-auto mb-md" />
              <p className="text-muted-foreground text-sm mb-md">Nenhum orçamento para comparar. Crie orçamentos na aba 'Orçamentos'.</p>
              <Button size="sm" onClick={() => setActiveTab('orcamentos')}>
                <MsIcon name="account_balance" size={14} className="mr-1" /> Ir para Orçamentos
              </Button>
            </div>
          ) : (
            <div className="bg-surface border border-surface-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-container-low">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Orçamento</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Gasto</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">% Usado</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Tendência</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthBudgets.map(b => {
                    const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + (t.value || 0), 0);
                    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
                    const color = CAT_COLORS[b.category] || '#94a3b8';
                    const statusColor = pct > 100 ? 'text-red-500' : pct > 80 ? 'text-amber-500' : 'text-emerald-500';
                    const statusIcon = pct > 100 ? 'error' : pct > 80 ? 'warning' : 'check_circle';
                    // Calculate last 6 months of spending for sparkline
                    const sparkData = [];
                    for (let i = 5; i >= 0; i--) {
                      let m = currentMonth - i;
                      let y = currentYear;
                      if (m < 0) { m += 12; y--; }
                      const prefix = getMonthKey(y, m);
                      const monthSpent = transactions
                        .filter(t => t.type === 'expense' && t.category === b.category && t.date && t.date.startsWith(prefix))
                        .reduce((s, t) => s + (t.value || 0), 0);
                      sparkData.push(monthSpent);
                    }
                    return (
                      <tr key={b.id} className="border-b border-surface-border last:border-0 hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                            <span className="font-medium">{b.category}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-mono-number tabular-nums">{formatCurrency(b.limit)}</td>
                        <td className="text-right py-3 px-4 font-mono-number tabular-nums">{formatCurrency(spent)}</td>
                        <td className="text-right py-3 px-4 font-mono-number tabular-nums">{pct.toFixed(0)}%</td>
                        <td className="text-center py-3 px-4">
                          <div className="flex justify-center">
                            <Sparkline data={sparkData} color={color} />
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <MsIcon name={statusIcon} size={18} className={statusColor} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low font-medium">
                    <td className="py-3 px-4">Total</td>
                    <td className="text-right py-3 px-4 font-mono-number tabular-nums">{formatCurrency(monthBudgets.reduce((s, b) => s + (b.limit || 0), 0))}</td>
                    <td className="text-right py-3 px-4 font-mono-number tabular-nums">{formatCurrency(monthBudgets.reduce((s, b) => s + monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + (t.value || 0), 0), 0))}</td>
                    <td className="text-right py-3 px-4 font-mono-number tabular-nums">
                      {(() => { const totalLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0); const totalSpent = monthBudgets.reduce((s, b) => s + monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + (t.value || 0), 0), 0); return totalLimit > 0 ? `${(totalSpent / totalLimit * 100).toFixed(0)}%` : '0%'; })()}
                    </td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {monthBudgets.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">Tendência: últimos 6 meses</p>
          )}
        </div>
      )}

      <GoalModal open={showGoalModal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} onSave={handleSaveGoal} goal={editingGoal} />
      <DepositModal open={!!depositGoal} onClose={() => setDepositGoal(null)} onSave={handleDeposit} goal={depositGoal} />
    </div>
  );
}
