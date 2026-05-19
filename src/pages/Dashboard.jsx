import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, ChevronLeft, ChevronRight, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, CreditCard, Settings } from 'lucide-react';
import { formatCurrency, filterByMonth, calcTotals, groupByCategory, getCurrentMonthKey, getMonthKey, getGoalProgress } from '@/lib/financeUtils';
import { useTransactionModal } from '@/lib/transactionModalStore';
import { CAT_COLORS, MONTH_NAMES } from '@/lib/categories';
import TransactionModal from '@/components/finance/TransactionModal';
import DashCustomizeModal from '@/components/finance/DashCustomizeModal';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useTransactions, useBudgets, useGoals, useCards } from '@/hooks/useData';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { lsGet, lsSet, getDashSections, getSalaryConfig, setOnboarded, fetchOnboarded, isOnboarded } from '@/lib/store';
import { getCategoryIcon } from '@/lib/categories';
import { checkDueDateNotifications } from '@/lib/notifications';
import { KpiCard, getDelta } from '@/components/dashboard/KpiCard';
import DashSection from '@/components/dashboard/DashSection';
import OnboardingModal from '@/components/dashboard/OnboardingModal';
import ChartsSection from '@/components/dashboard/ChartsSection';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import GoalsSection from '@/components/dashboard/GoalsSection';

// Material Symbols icon component
function MsIcon({ name, className, size = 24 }) {
  return (
    <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export default function Dashboard() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const [showModal, setShowModal] = useState(false);
  const [defaultType, setDefaultType] = useState('expense');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [dashSections, setDashSections] = useState(() => {
    const raw = getDashSections();
    return Array.isArray(raw) ? raw : [];
  });

  useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      if (isOnboarded()) { checkDueDateNotifications(); return; }
      const cloudResult = await fetchOnboarded();
      if (cancelled) return;
      if (cloudResult && cloudResult !== 'false') { setOnboarded(); checkDueDateNotifications(); return; }
      const timer = setTimeout(() => { if (!cancelled) setShowOnboarding(true); }, 800);
      return () => clearTimeout(timer);
    }
    checkOnboarding();
    return () => { cancelled = true; };
  }, []);

  const { data: rawTransactions, isLoading: txLoading, refetch: refetchTx } = useTransactions();
  const { data: rawGoals } = useGoals();
  const { data: rawBudgets } = useBudgets();
  const { data: rawCards } = useCards();

  // Defensive: ensure arrays (Base44 SDK may return null instead of [])
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const goals = Array.isArray(rawGoals) ? rawGoals : [];
  const budgets = Array.isArray(rawBudgets) ? rawBudgets : [];
  const cards = Array.isArray(rawCards) ? rawCards : [];

  useEffect(() => {
    if (transactions.length > 0) {
      const currentKey = getCurrentMonthKey();
      const lastGen = lsGet('lastRecurringGen', '');
      if (lastGen !== currentKey) lsSet('lastRecurringGen', currentKey);
    }
  }, [transactions.length]);

  useEffect(() => {
    const unsub = useTransactionModal.subscribe(({ isOpen, defaultType }) => {
      if (isOpen) { setDefaultType(defaultType); setShowModal(true); }
    });
    return unsub;
  }, []);

  const monthTx = React.useMemo(() => filterByMonth(transactions, currentYear, currentMonth), [transactions, currentYear, currentMonth]);
  const totals = React.useMemo(() => calcTotals(monthTx), [monthTx]);
  const expensesByCategory = React.useMemo(() => groupByCategory(monthTx.filter(t => t.type === 'expense')), [monthTx]);

  const prevMonthData = React.useMemo(() => {
    let pm = currentMonth - 1, py = currentYear;
    if (pm < 0) { pm = 11; py--; }
    const prevTx = filterByMonth(transactions, py, pm);
    return { prevTx, prevTotals: calcTotals(prevTx) };
  }, [transactions, currentMonth, currentYear]);
  const { prevTotals } = prevMonthData;

  const monthBudgets = React.useMemo(() => {
    const key = getMonthKey(currentYear, currentMonth);
    return budgets.filter(b => b.month === key);
  }, [budgets, currentYear, currentMonth]);

  const handleSave = async (data) => {
    await supabase.from('transactions').insert(data).select().single();
    refetchTx();
    setShowModal(false);
  };

  const alerts = React.useMemo(() => monthBudgets.filter(b => {
    const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
    return spent > b.limit;
  }), [monthBudgets, monthTx]);

  // ── Upcoming due dates ──
  const salaryConfig = getSalaryConfig();
  const upcomingItems = React.useMemo(() => {
    const today = new Date();
    const items = [];
    cards.forEach(c => {
      const diff = c.dueDay - today.getDate();
      if (diff >= 0 && diff <= 7) {
        const cardTotal = monthTx.filter(t => t.cardId === c.id && t.type === 'expense').reduce((s, t) => s + t.value, 0);
        items.push({ label: `Fatura ${c.name}`, date: `dia ${c.dueDay}`, value: cardTotal });
      }
    });
    return items;
  }, [cards, monthTx]);

  // ── Installments ──
  const installmentTx = React.useMemo(() => monthTx.filter(t => t.isInstallment), [monthTx]);

  // ── Patrimônio ──
  const allTotals = React.useMemo(() => calcTotals(transactions), [transactions]);
  const patrimonio = allTotals.balance;

  // ── Forecast ──
  const { avgIncome, avgExpense } = React.useMemo(() => {
    const data = [];
    for (let i = 2; i >= 0; i--) {
      let m = currentMonth - 1 - i, y = currentYear;
      if (m < 0) { m += 12; y -= 1; }
      data.push(calcTotals(filterByMonth(transactions, y, m)));
    }
    return { avgIncome: data.reduce((s, t) => s + t.income, 0) / 3, avgExpense: data.reduce((s, t) => s + t.expense, 0) / 3 };
  }, [transactions, currentMonth, currentYear]);

  const orderedSections = dashSections.filter(s => s.visible);

  // ── Charts data (must be at top level — Rules of Hooks) ──
  const barData = React.useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i, y = currentYear;
      if (m < 0) { m += 12; y -= 1; }
      const t = calcTotals(filterByMonth(transactions, y, m));
      data.push({ name: MONTH_NAMES[m].slice(0, 3), income: t.income, expense: t.expense });
    }
    return data;
  }, [transactions, currentMonth, currentYear]);

  const processedPieData = React.useMemo(() => {
    const pieData = expensesByCategory.map(([cat, val]) => ({ name: cat, value: val, color: CAT_COLORS[cat] || '#94a3b8' }));
    if (pieData.length <= 6) return pieData;
    const sorted = [...pieData].sort((a, b) => b.value - a.value);
    const rest = sorted.slice(6).reduce((sum, d) => sum + d.value, 0);
    return [...sorted.slice(0, 6), { name: 'Outros', value: rest, color: '#94a3b8' }];
  }, [expensesByCategory]);

  // ═══ Health Score calculation (inline) ═══
  const healthData = React.useMemo(() => {
    let score = 0;
    // Savings rate
    let savingsRate = 0;
    if (totals.income > 0) {
      savingsRate = (totals.investment / totals.income) * 100;
      if (savingsRate >= 20) score += 25; else if (savingsRate >= 10) score += 15; else if (savingsRate >= 5) score += 10;
    }
    // Budgets
    if (monthBudgets.length > 0) {
      const respected = monthBudgets.filter(b => {
        const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
        return spent <= b.limit;
      }).length;
      const pct = (respected / monthBudgets.length) * 100;
      if (pct >= 100) score += 25; else if (pct >= 75) score += 18; else if (pct >= 50) score += 10;
    } else { score += 25; }
    // Goals
    if (goals.length > 0) {
      const withProgress = goals.filter(g => {
        const current = getGoalProgress(g, transactions);
        return (g.targetValue || 0) > 0 && (current / g.targetValue) >= 0.10;
      }).length;
      score += Math.round(25 * (withProgress / goals.length));
    } else { score += 25; }
    // Balance
    if (totals.balance > 0) score += 25; else if (totals.balance === 0) score += 10;

    // Emergency reserve
    const last3Expenses = [];
    for (let i = 0; i < 3; i++) {
      let m = currentMonth - i, y = currentYear;
      if (m < 0) { m += 12; y--; }
      const tx = filterByMonth(transactions, y, m);
      const t = calcTotals(tx);
      last3Expenses.push(t.expense + t.investment);
    }
    const avgMonthlyExpense = last3Expenses.reduce((s, v) => s + v, 0) / 3;
    const emergencyMonths = avgMonthlyExpense > 0 ? allTotals.balance / avgMonthlyExpense : 0;
    const emergencyPct = Math.min(100, Math.round((emergencyMonths / 6) * 100));
    const savingsPct = Math.min(100, Math.round(savingsRate * 5));

    // Diversification
    const uniqueCats = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category).filter(Boolean));
    const diversificationPct = Math.min(100, Math.round((uniqueCats.size / 10) * 100));

    return { score, savingsRate, emergencyMonths, emergencyPct, savingsPct, diversificationPct };
  }, [totals, monthBudgets, monthTx, goals, transactions, allTotals, currentMonth, currentYear]);
  const healthScore = healthData.score;

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'graficos':
        return (
          <DashSection id="graficos" title="Evolução Mensal" color="bg-primary" defaultOpen={true}>
            <ChartsSection barData={barData} processedPieData={processedPieData} />
          </DashSection>
        );
      case 'gastos':
        return (
          <DashSection id="gastos" title="Gastos por Categoria" color="bg-amber-500" defaultOpen={false}>
            <CategoryBreakdown expensesByCategory={expensesByCategory} totals={totals} />
          </DashSection>
        );
      case 'metas':
        return (
          <DashSection id="metas" title="Metas Ativas" color="bg-amber-500" defaultOpen={false}>
            <GoalsSection goals={goals} transactions={transactions} />
          </DashSection>
        );
      default: return null;
    }
  };

  return (
    <>
      {/* ═══ Hero Balance Section ═══ */}
      <section className="py-xl mb-md">
        <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em] mb-xs">DISPONÍVEL ESTE MÊS</p>
        <h1 className="font-display-hero text-display-hero text-on-surface mb-md">{formatCurrency(totals.balance)}</h1>
        <div className="h-[1px] w-full bg-editorial-rule" />
      </section>

      {/* ═══ Alerts ═══ */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-error-container border border-error-container rounded text-danger text-sm mb-xl">
          <MsIcon name="warning" size={16} />
          <span>{alerts.length} orçamento(s) ultrapassado(s): {alerts.map(a => a.category).join(', ')}</span>
        </div>
      )}

      {/* ═══ KPI Grid ═══ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm md:gap-md mb-xl">
        <KpiCard label="ENTRADAS" value={formatCurrency(totals.income)} icon="trending_up" variant="income"
          delta={getDelta(totals.income, prevTotals.income)} deltaLabel="vs mês ant." />
        <KpiCard label="SAÍDAS" value={formatCurrency(totals.expense)} icon="trending_down" variant="expense"
          delta={getDelta(totals.expense, prevTotals.expense)} deltaLabel="vs mês ant." />
        <KpiCard label="BALANÇO" value={formatCurrency(totals.balance)} icon="balance" variant="balance"
          delta={getDelta(totals.balance, prevTotals.balance)} deltaLabel="vs mês ant." />
        <KpiCard label="INVESTIMENTOS" value={formatCurrency(totals.investment)} icon="account_balance_wallet" variant="investment" />
      </section>

      {/* ═══ Transactions + Health Score Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl mb-xl">
        {/* Transactions List (8 cols) */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-md pb-xs border-b border-surface-border">
            <h2 className="font-headline text-headline">Transações Recentes</h2>
            <Link to="/transactions" className="font-label-caps text-label-caps text-primary-light hover:underline uppercase">VER TUDO</Link>
          </div>
          <div className="flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-md px-xs py-sm border-b border-surface-border opacity-50 font-label-caps text-[10px]">
              <div className="col-span-6 uppercase">Descrição</div>
              <div className="col-span-3 uppercase">Categoria</div>
              <div className="col-span-3 text-right uppercase">Valor</div>
            </div>
            {/* Rows */}
            {monthTx.length === 0 ? (
              <p className="py-md text-muted-foreground text-sm">Sem transações neste mês</p>
            ) : (
              monthTx.slice(0, 8).map(t => (
                <div key={t.id} className="transaction-row grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center">
                  <div className="col-span-6 flex items-center gap-sm">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      t.type === 'income' ? 'bg-kpi-income/10' : t.type === 'expense' ? 'bg-kpi-expense/10' : 'bg-info/10'
                    )}>
                      <MsIcon name={t.type === 'income' ? 'payments' : t.type === 'expense' ? 'shopping_cart' : 'account_balance'} size={16}
                        className={t.type === 'income' ? 'text-kpi-income' : t.type === 'expense' ? 'text-kpi-expense' : 'text-info'} />
                    </div>
                    <span className="font-body-lg text-body-lg font-bold">{t.description}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="px-xs py-[2px] bg-surface-container-high rounded text-[10px] font-label-caps text-on-surface-variant">
                      {(t.category || '—').toUpperCase()}
                    </span>
                  </div>
                  <div className={cn(
                    "col-span-3 text-right font-mono-number text-mono-number font-bold",
                    t.type === 'income' ? 'text-kpi-income' : t.type === 'expense' ? 'text-danger' : 'text-info'
                  )}>
                    {t.type !== 'income' ? '- ' : '+ '}{formatCurrency(t.value)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Health Score (4 cols) */}
        <section className="lg:col-span-4">
          <div className="bg-surface border border-surface-border p-lg">
            <h2 className="font-headline text-headline mb-lg">Saúde Financeira</h2>
            <div className="relative flex flex-col items-center justify-center mb-xl">
              <div className="w-48 h-48 rounded-full border-[12px] border-surface-container-low flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-[12px] border-primary-light border-r-transparent border-b-transparent rotate-45" />
                <div className="flex flex-col items-center">
                  <span className="font-display-sm text-[48px] font-bold text-on-surface">{healthScore}</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">PONTOS</span>
                </div>
              </div>
            </div>
            <div className="space-y-md">
              {/* Emergency Reserve — real */}
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between font-label-caps text-label-caps">
                  <span>RESERVA DE EMERGÊNCIA</span>
                  <span className={healthData.emergencyMonths >= 3 ? 'text-success' : healthData.emergencyMonths >= 1 ? 'text-warning' : 'text-danger'}>
                    {healthData.emergencyMonths >= 6 ? 'EXCELENTE' : healthData.emergencyMonths >= 3 ? 'BOM' : healthData.emergencyMonths >= 1 ? 'ATENÇÃO' : 'CRÍTICO'} ({healthData.emergencyMonths.toFixed(1)}m)
                  </span>
                </div>
                <div className="h-1 bg-surface-container-high w-full">
                  <div className={cn("h-full transition-all duration-700", healthData.emergencyPct >= 70 ? 'bg-success' : healthData.emergencyPct >= 40 ? 'bg-warning' : 'bg-danger')}
                    style={{ width: `${healthData.emergencyPct}%` }} />
                </div>
              </div>
              {/* Savings Rate — real */}
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between font-label-caps text-label-caps">
                  <span>TAXA DE POUPANÇA</span>
                  <span className={healthData.savingsRate >= 10 ? 'text-success' : healthData.savingsRate >= 5 ? 'text-warning' : 'text-danger'}>
                    {healthData.savingsRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 bg-surface-container-high w-full">
                  <div className={cn("h-full transition-all duration-700", healthData.savingsPct >= 70 ? 'bg-success' : healthData.savingsPct >= 40 ? 'bg-warning' : 'bg-danger')}
                    style={{ width: `${healthData.savingsPct}%` }} />
                </div>
              </div>
              {/* Diversification — real */}
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between font-label-caps text-label-caps">
                  <span>DIVERSIFICAÇÃO</span>
                  <span className={healthData.diversificationPct >= 70 ? 'text-success' : healthData.diversificationPct >= 40 ? 'text-warning' : 'text-danger'}>
                    {healthData.diversificationPct >= 70 ? 'BOM' : healthData.diversificationPct >= 40 ? 'MÉDIO' : 'BAIXO'}
                  </span>
                </div>
                <div className="h-1 bg-surface-container-high w-full">
                  <div className="h-full bg-primary-light transition-all duration-700" style={{ width: `${healthData.diversificationPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Card — real data driven */}
          {(() => {
            const overBudgetCategories = monthBudgets.filter(b => {
              const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
              return spent > b.limit;
            });
            const topExpense = expensesByCategory.length > 0 ? expensesByCategory[0] : null;
            const hasInsight = overBudgetCategories.length > 0 || topExpense;

            if (!hasInsight) return null;

            const insightText = overBudgetCategories.length > 0
              ? `${overBudgetCategories.length} orçamento(s) ultrapassado(s). Considere ajustar os limites ou reduzir gastos em ${overBudgetCategories[0].category}.`
              : topExpense
                ? `Seu maior gasto é ${topExpense[0]} (${formatCurrency(topExpense[1])}). Analise se há espaço para otimização.`
                : null;

  if (txLoading && transactions.length === 0 && goals.length === 0 && budgets.length === 0 && cards.length === 0) {
    return (
      <>
        <section className="py-xl mb-md">
          <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em] mb-xs">DISPONÍVEL ESTE MÊS</p>
          <div className="h-[60px] w-64 shimmer rounded" />
          <div className="h-[1px] w-full bg-editorial-rule mt-md" />
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm md:gap-md mb-xl">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface border border-surface-border p-card-padding">
              <div className="h-[3px] w-full shimmer mb-sm" />
              <div className="h-3 w-24 shimmer rounded mb-sm" />
              <div className="h-8 w-32 shimmer rounded" />
            </div>
          ))}
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl mb-xl">
          <section className="lg:col-span-8">
            <div className="flex items-center justify-between mb-md pb-xs border-b border-surface-border">
              <div className="h-5 w-40 shimmer rounded" />
              <div className="h-4 w-20 shimmer rounded" />
            </div>
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="grid grid-cols-12 gap-md px-xs py-md border-b border-surface-border items-center">
                  <div className="col-span-6 flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full shimmer" />
                    <div className="h-4 w-32 shimmer rounded" />
                  </div>
                  <div className="col-span-3"><div className="h-4 w-16 shimmer rounded" /></div>
                  <div className="col-span-3 flex justify-end"><div className="h-4 w-20 shimmer rounded" /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="lg:col-span-4">
            <div className="bg-surface border border-surface-border p-lg">
              <div className="h-5 w-40 shimmer rounded mb-lg" />
              <div className="flex flex-col items-center justify-center mb-xl">
                <div className="w-48 h-48 rounded-full shimmer" />
              </div>
              <div className="space-y-md">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-xs">
                    <div className="flex justify-between">
                      <div className="h-3 w-32 shimmer rounded" />
                      <div className="h-3 w-16 shimmer rounded" />
                    </div>
                    <div className="h-1 w-full shimmer rounded" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
              <div className="mt-lg bg-primary-container p-lg text-on-primary-container flex flex-col gap-sm">
                <MsIcon name="auto_awesome" className="text-primary-light" size={24} />
                <h3 className="font-title text-title">Análise de IA</h3>
                <p className="font-body-sm text-body-sm text-on-primary-container/70">{insightText}</p>
              </div>
            );
          })()}
        </section>
      </div>

      {/* ═══ Dynamic sections ═══ */}
      {orderedSections.map(s => (
        <div key={s.id}>{renderSection(s.id)}</div>
      ))}

      {/* ═══ Month Navigation Pill ═══ */}
      <div className="flex items-center justify-center gap-1 bg-surface border border-surface-border rounded-lg px-2 py-1 mt-xl w-fit mx-auto">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-surface-container-low rounded" aria-label="Mês anterior">
          <MsIcon name="chevron_left" size={14} className="text-on-surface-variant" />
        </button>
        <span className="text-sm font-medium px-2 min-w-[120px] text-center font-mono-number">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button onClick={() => navigate(1)} className="p-1 hover:bg-surface-container-low rounded" aria-label="Próximo mês">
          <MsIcon name="chevron_right" size={14} className="text-on-surface-variant" />
        </button>
      </div>

      <TransactionModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} goals={goals} defaultType={defaultType} />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <DashCustomizeModal open={showCustomize} onClose={() => setShowCustomize(false)} onUpdate={(s) => setDashSections(s)} />
    </>
  );
}
// force rebuild Wed May 13 08:15:08 PM CST 2026
