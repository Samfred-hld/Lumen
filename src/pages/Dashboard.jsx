import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, ChevronLeft, ChevronRight, AlertCircle, Sparkles, ArrowRight, CreditCard, Target, Calendar, Upload, Settings, ArrowUpRight, ArrowDownRight, Minus, Layers, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate, filterByMonth, calcTotals, groupByCategory, getGoalProgress, getCurrentMonthKey, getMonthKey } from '@/lib/financeUtils';
import { useTransactionModal } from '@/lib/transactionModalStore';
import { CAT_COLORS, MONTH_NAMES } from '@/lib/categories';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme';
import TransactionModal from '@/components/finance/TransactionModal';
import DashCustomizeModal from '@/components/finance/DashCustomizeModal';
import FinancialHealthScore from '@/components/finance/FinancialHealthScore';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useTransactions, useBudgets, useGoals, useCards } from '@/hooks/useData';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { lsGet, lsSet, getDashSections, getSalaryConfig, setOnboarded, fetchOnboarded, isOnboarded } from '@/lib/store';
import { getCategoryIcon } from '@/lib/categories';
import { checkDueDateNotifications, generateBudgetAlerts } from '@/lib/notifications';

// ═══ Onboarding Welcome Modal ═══
function OnboardingModal({ open, onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    { icon: Sparkles, title: 'Bem-vindo ao Lúmen! 🎉', desc: 'Seu assistente de controle financeiro pessoal. Vamos configurar tudo em segundos.', color: 'text-primary' },
    { icon: Plus, title: 'Registre suas transações', desc: 'Adicione receitas e despesas. Use o botão "Novo" ou pressione N a qualquer momento.', color: 'text-emerald-600', tip: 'Dica: ative "Lançamento fixo" para gastos mensais recorrentes.' },
    { icon: CreditCard, title: 'Cartões de crédito', desc: 'Cadastre seus cartões em Configurações para controlar faturas e limites.', color: 'text-blue-500', link: '/settings', linkLabel: 'Ir para Configurações' },
    { icon: Target, title: 'Metas e orçamentos', desc: 'Defina metas de economia e orçamentos por categoria para manter o controle.', color: 'text-amber-600' },
    { icon: Upload, title: 'Importe seus dados', desc: 'Tem dados em planilha? Importe CSV direto pela página de Transações.', color: 'text-amber-600' },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className={cn("mx-auto mb-3 w-14 h-14 rounded flex items-center justify-center bg-muted", current.color)}>
              <current.icon size={28} />
            </div>
            {current.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{current.desc}</p>
          {current.tip && (
            <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs text-primary">💡 {current.tip}</div>
          )}
          {current.link && (
            <Link to={current.link} onClick={onClose}>
              <Button variant="outline" size="sm" className="text-xs">{current.linkLabel} <ArrowRight size={12} className="ml-1" /></Button>
            </Link>
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 my-2">
          {steps.map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted")} />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>Voltar</Button>}
          <Button className="flex-1" onClick={async () => {
            if (step < steps.length - 1) setStep(s => s + 1);
            else { await setOnboarded(); onClose(); }
          }}>
            {step < steps.length - 1 ? 'Próximo' : 'Começar!'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Premium KPI Card ═══
const KPI_STYLES = {
  income: { iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700 dark:text-emerald-400', accent: 'bg-emerald-500' },
  expense: { iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-500', valueColor: 'text-red-600 dark:text-red-400', accent: 'bg-red-500' },
  balance: { iconBg: 'bg-stone-100 dark:bg-stone-900/30', iconColor: 'text-stone-600', valueColor: 'text-stone-700 dark:text-stone-400', accent: 'bg-stone-500' },
  investment: { iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', valueColor: 'text-amber-700 dark:text-amber-400', accent: 'bg-amber-500' },
};

function KpiCard({ label, value, icon: Icon, variant = 'balance', delta, deltaLabel }) {
  const s = KPI_STYLES[variant] || KPI_STYLES.balance;
  const deltaText = delta !== undefined
    ? `${delta > 0 ? 'Aumentou' : delta < 0 ? 'Diminuiu' : 'Sem alteração'} ${Math.abs(delta).toFixed(1)}% ${deltaLabel || ''}`
    : '';
  return (
    <Card
      className="relative overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-shadow duration-300"
      role="region"
      aria-label={`${label}: ${value}${deltaText ? '. ' + deltaText : ''}`}
    >
      <CardContent className="p-5 relative">
        <div className={cn("absolute top-0 left-0 right-0 h-[3px] rounded-t-xl", s.accent)} />
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
      </CardContent>
    </Card>
  );
}

// ═══ Trend Helper ═══
function getDelta(cur, prev) {
  if (!prev && !cur) return 0;
  if (!prev) return 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export default function Dashboard() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const [showModal, setShowModal] = useState(false);
  const [defaultType, setDefaultType] = useState('expense');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [dashSections, setDashSections] = useState(getDashSections());

  useEffect(() => {
    let cancelled = false;

    async function checkOnboarding() {
      // 1. Verifica localStorage imediatamente
      if (isOnboarded()) {
        checkDueDateNotifications();
        return;
      }
      // 2. Nao esta no localStorage — busca na nuvem (pode ter completado em outro dispositivo)
      const cloudResult = await fetchOnboarded();
      if (cancelled) return;
      if (cloudResult && cloudResult !== 'false') {
        checkDueDateNotifications();
        return;
      }
      // 3. Realmente nao onboardou — exibe apos delay
      const timer = setTimeout(() => {
        if (!cancelled) setShowOnboarding(true);
      }, 800);
      return () => clearTimeout(timer);
    }

    checkOnboarding();
    return () => { cancelled = true; };
  }, []);

  const { data: transactions = [], refetch: refetchTx } = useTransactions();
  const { data: goals = [] } = useGoals();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards();

  useEffect(() => {
    if (transactions.length > 0) {
      // Guard: mark current month as handled to avoid duplicate cron triggers client-side.
      // Actual generation is handled by the backend generateRecurring cron.
      const currentKey = getCurrentMonthKey();
      const lastGen = lsGet('lastRecurringGen', '');
      if (lastGen !== currentKey) {
        lsSet('lastRecurringGen', currentKey);
      }
    }
  }, [transactions.length]);

  // Generate persistent budget alerts when data changes
  useEffect(() => {
    if (budgets.length > 0 && transactions.length > 0) {
      generateBudgetAlerts(budgets, transactions, currentMonth, currentYear);
    }
  }, [budgets, transactions, currentMonth, currentYear]);

  useEffect(() => {
    const unsub = useTransactionModal.subscribe(({ isOpen, defaultType }) => {
      if (isOpen) {
        setDefaultType(defaultType);
        setShowModal(true);
      }
    });
    return unsub;
  }, []);

  const monthTx = filterByMonth(transactions, currentYear, currentMonth);
  const totals = calcTotals(monthTx);
  const expensesByCategory = groupByCategory(monthTx.filter(t => t.type === 'expense'));

  // Previous month for comparison
  let prevMonth = currentMonth - 1, prevYear = currentYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  const prevMonthTx = filterByMonth(transactions, prevYear, prevMonth);
  const prevTotals = calcTotals(prevMonthTx);

  const pieData = React.useMemo(() => expensesByCategory.map(([cat, val]) => ({
    name: cat, value: val, color: CAT_COLORS[cat] || '#94a3b8'
  })), [expensesByCategory]);

  const MAX_PIE_SLICES = 6;

  const processedPieData = React.useMemo(() => {
    if (!pieData || pieData.length === 0) return [];
    if (pieData.length <= MAX_PIE_SLICES) return pieData;
    const sorted = [...pieData].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, MAX_PIE_SLICES);
    const rest = sorted.slice(MAX_PIE_SLICES);
    const othersValue = rest.reduce((sum, d) => sum + d.value, 0);
    return [...top, { name: 'Outros', value: othersValue, color: '#94a3b8' }];
  }, [pieData]);

  const barData = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i, y = currentYear;
    if (m < 0) { m += 12; y -= 1; }
    const txs = filterByMonth(transactions, y, m);
    const t = calcTotals(txs);
    barData.push({ name: MONTH_NAMES[m].slice(0, 3), income: t.income, expense: t.expense });
  }

  const monthBudgets = budgets.filter(b => {
    const key = getMonthKey(currentYear, currentMonth);
    return b.month === key;
  });

  const handleSave = async (data) => {
    await base44.entities.Transaction.create(data);
    refetchTx();
    setShowModal(false);
  };

  const alerts = monthBudgets.filter(b => {
    const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
    return spent > b.limit;
  });

  // Section visibility helper
  const isSectionVisible = (id) => {
    const s = dashSections.find(s => s.id === id);
    return s ? s.visible : true;
  };

  // ── Installment transactions ──
  const installmentTx = monthTx.filter(t => t.isInstallment);
  const installmentTotal = installmentTx.reduce((s, t) => s + Math.abs(t.value), 0);

  // ── Upcoming due dates ──
  const salaryConfig = getSalaryConfig();
  const today = new Date();
  const upcomingItems = [];
  cards.forEach(c => {
    const diff = c.dueDay - today.getDate();
    if (diff >= 0 && diff <= 7) {
      const cardTotal = monthTx.filter(t => t.cardId === c.id && t.type === 'expense').reduce((s, t) => s + t.value, 0);
      upcomingItems.push({ label: `Fatura ${c.name}`, date: `dia ${c.dueDay}`, value: cardTotal, color: 'text-red-500', icon: CreditCard });
    }
  });
  if (salaryConfig.autoGenerate || salaryConfig.value > 0) {
    const salaryDiff = salaryConfig.day - today.getDate();
    if (salaryDiff >= 0 && salaryDiff <= 7) {
      upcomingItems.push({ label: 'Salário', date: `dia ${salaryConfig.day}`, value: salaryConfig.value, color: 'text-emerald-500', icon: Wallet });
    }
  }

  // ── Patrimônio total (saldo acumulado de todos os meses) ──
  const allTotals = calcTotals(transactions);
  const patrimonio = allTotals.balance;

  // ── Forecast (simple: avg of last 3 months) ──
  const forecastData = [];
  for (let i = 2; i >= 0; i--) {
    let m = currentMonth - 1 - i, y = currentYear;
    if (m < 0) { m += 12; y -= 1; }
    const txs = filterByMonth(transactions, y, m);
    const t = calcTotals(txs);
    forecastData.push(t);
  }
  const avgIncome = forecastData.reduce((s, t) => s + t.income, 0) / 3;
  const avgExpense = forecastData.reduce((s, t) => s + t.expense, 0) / 3;

  // Render sections in order
  const orderedSections = dashSections.filter(s => s.visible);

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'resumo': return renderResumo();
      case 'graficos': return renderGraficos();
      case 'gastos': return renderGastos();
      case 'metas': return renderMetas();
      case 'parcelas': return renderParcelas();
      case 'planejado': return renderPlanejado();
      case 'previsao': return renderPrevisao();
      case 'vencimentos': return renderVencimentos();
      case 'patrimonio': return renderPatrimonio();
      case 'tendencia': return renderTendencia();
      default: return null;
    }
  };

  // ═══ Section Renderers ═══

  function renderResumo() {
    return (
      <div key="resumo">
        {/* Mobile: horizontal scroll carousel */}
        <div className="flex lg:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide animate-fade-in">
          <div className="shrink-0 w-44 snap-start">
            <KpiCard label="Receitas" value={formatCurrency(totals.income)} icon={TrendingUp} variant="income"
              delta={getDelta(totals.income, prevTotals.income)} deltaLabel="vs mês ant." />
          </div>
          <div className="shrink-0 w-44 snap-start">
            <KpiCard label="Despesas" value={formatCurrency(totals.expense)} icon={TrendingDown} variant="expense"
              delta={getDelta(totals.expense, prevTotals.expense)} deltaLabel="vs mês ant." />
          </div>
          <div className="shrink-0 w-44 snap-start">
            <KpiCard label="Saldo" value={formatCurrency(totals.balance)} icon={Wallet} variant="balance"
              delta={getDelta(totals.balance, prevTotals.balance)} deltaLabel="vs mês ant." />
          </div>
          <div className="shrink-0 w-44 snap-start">
            <KpiCard label="Investido" value={formatCurrency(totals.investment)} icon={PiggyBank} variant="investment" />
          </div>
        </div>

        {/* Desktop: 4-column grid */}
        <div className="hidden lg:grid grid-cols-4 gap-3 animate-fade-in">
          <KpiCard label="Receitas" value={formatCurrency(totals.income)} icon={TrendingUp} variant="income"
            delta={getDelta(totals.income, prevTotals.income)} deltaLabel="vs mês ant." />
          <KpiCard label="Despesas" value={formatCurrency(totals.expense)} icon={TrendingDown} variant="expense"
            delta={getDelta(totals.expense, prevTotals.expense)} deltaLabel="vs mês ant." />
          <KpiCard label="Saldo" value={formatCurrency(totals.balance)} icon={Wallet} variant="balance"
            delta={getDelta(totals.balance, prevTotals.balance)} deltaLabel="vs mês ant." />
          <KpiCard label="Investido" value={formatCurrency(totals.investment)} icon={PiggyBank} variant="investment" />
        </div>
        <div className="mt-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <FinancialHealthScore
            transactions={transactions}
            budgets={budgets}
            goals={goals}
            month={currentMonth}
            year={currentYear}
          />
        </div>
      </div>
    );
  }

  function renderGraficos() {
    // Accessible text summaries for screen readers
    const barSummary = barData.map(d => `${d.name}: receitas ${formatCurrency(d.income)}, despesas ${formatCurrency(d.expense)}`).join('; ');
    const pieSummary = processedPieData.map(d => `${d.name}: ${formatCurrency(d.value)}`).join('; ');

    return (
      <div key="graficos" className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-primary" aria-hidden="true" /> Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sr-only" role="img" aria-label={`Evolução mensal de receitas e despesas. ${barSummary}`}>
              Resumo: {barSummary}
            </div>
            <ResponsiveContainer width="100%" height={200} aria-hidden="true">
              <BarChart data={barData} barSize={12}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis {...AXIS_STYLE} dataKey="name" />
                <YAxis {...AXIS_STYLE} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatCurrency(v), name]} />
                <Bar dataKey="income" name="Receitas" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Despesas" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" aria-hidden="true" /> Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processedPieData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem despesas neste mês</div>
            ) : (
              <>
                <div className="sr-only" role="img" aria-label={`Gastos por categoria este mês. ${pieSummary}`}>
                  Resumo: {pieSummary}
                </div>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180} aria-hidden="true">
                    <PieChart>
                      <Pie data={processedPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {processedPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatCurrency(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {processedPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} aria-hidden="true" />
                        <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                        <span className="font-semibold shrink-0">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderGastos() {
    return (
      <div key="gastos" className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" /> Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {expensesByCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Sem despesas neste mês</p>
            ) : (
              expensesByCategory.slice(0, 8).map(([cat, val]) => {
                const pct = totals.expense > 0 ? (val / totals.expense) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm shrink-0">{getCategoryIcon(cat)}</span>
                    <span className="text-sm font-medium w-28 truncate shrink-0">{cat}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: CAT_COLORS[cat] || '#94a3b8' }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-20 text-right shrink-0">{formatCurrency(val)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderMetas() {
    return (
      <div key="metas" className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" /> Metas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada</p>
            ) : (
              goals.slice(0, 4).map(g => {
                const current = getGoalProgress(g, transactions);
                const pct = Math.min(100, g.targetValue > 0 ? (current / g.targetValue) * 100 : 0);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden progress-animated">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: g.color || '#10b981' }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{formatCurrency(current)}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(g.targetValue)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderParcelas() {
    if (installmentTx.length === 0) return null;
    return (
      <div key="parcelas" className="animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-pink-500" /> Parcelas Ativas
              </CardTitle>
              <span className="text-sm font-bold text-red-500 tabular-nums">{formatCurrency(installmentTotal)}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {installmentTx.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 -mx-2 rounded hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 border-blue-200 text-blue-600 mr-1">
                      {t.installmentCurrent}/{t.installmentCount}
                    </Badge>
                    {formatDate(t.date)}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-500 tabular-nums shrink-0">{formatCurrency(Math.abs(t.value))}</span>
              </div>
            ))}
            {installmentTx.length > 5 && (
              <Link to="/transactions" className="block text-center text-xs text-primary font-medium hover:underline mt-2">
                Ver todas ({installmentTx.length})
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPlanejado() {
    if (monthBudgets.length === 0) return null;
    return (
      <div key="planejado" className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" /> Planejado vs Real
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {monthBudgets.map(b => {
              const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.value, 0);
              const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
              const over = spent > b.limit;
              return (
                <div key={b.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{getCategoryIcon(b.category)} {b.category}</span>
                    <span className={cn("text-xs font-semibold", over ? 'text-red-500' : 'text-muted-foreground')}>
                      {formatCurrency(spent)} / {formatCurrency(b.limit)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", over ? 'bg-red-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPrevisao() {
    return (
      <div key="previsao" className="animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-cyan-500" /> Previsão Próximo Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Receita Prev.</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums mt-1">{formatCurrency(avgIncome)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Despesa Prev.</p>
                <p className="text-lg font-bold text-red-500 tabular-nums mt-1">{formatCurrency(avgExpense)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Saldo Prev.</p>
                <p className={cn("text-lg font-bold tabular-nums mt-1", avgIncome - avgExpense >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatCurrency(avgIncome - avgExpense)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Baseado na média dos últimos 3 meses</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderVencimentos() {
    if (upcomingItems.length === 0) return null;
    return (
      <div key="vencimentos" className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-orange-500" /> Próximos Vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {upcomingItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 -mx-2 rounded hover:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded flex items-center justify-center bg-muted">
                  <item.icon size={16} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <span className={cn("text-sm font-bold tabular-nums", item.color)}>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPatrimonio() {
    return (
      <div key="patrimonio" className="animate-fade-in-up" style={{ animationDelay: '0.32s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-indigo-500" /> Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded bg-indigo-100 dark:bg-indigo-900/30">
                <PiggyBank size={24} className="text-indigo-600" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold tabular-nums", patrimonio >= 0 ? 'text-foreground' : 'text-red-500')}>
                  {formatCurrency(patrimonio)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo acumulado total (receitas − despesas − investimentos)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderTendencia() {
    return (
      <div key="tendencia" className="animate-fade-in-up" style={{ animationDelay: '0.34s' }}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-teal-500" /> Tendência vs Mês Anterior
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Receitas</p>
                <div className="flex items-center justify-center gap-1">
                  {getDelta(totals.income, prevTotals.income) > 0 ? (
                    <ArrowUpRight size={16} className="text-emerald-500" />
                  ) : getDelta(totals.income, prevTotals.income) < 0 ? (
                    <ArrowDownRight size={16} className="text-red-500" />
                  ) : <Minus size={16} className="text-muted-foreground" />}
                  <span className={cn("text-lg font-bold", getDelta(totals.income, prevTotals.income) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {getDelta(totals.income, prevTotals.income).toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(totals.income)} vs {formatCurrency(prevTotals.income)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Despesas</p>
                <div className="flex items-center justify-center gap-1">
                  {getDelta(totals.expense, prevTotals.expense) > 0 ? (
                    <ArrowUpRight size={16} className="text-red-500" />
                  ) : getDelta(totals.expense, prevTotals.expense) < 0 ? (
                    <ArrowDownRight size={16} className="text-emerald-500" />
                  ) : <Minus size={16} className="text-muted-foreground" />}
                  <span className={cn("text-lg font-bold", getDelta(totals.expense, prevTotals.expense) <= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {getDelta(totals.expense, prevTotals.expense).toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(totals.expense)} vs {formatCurrency(prevTotals.expense)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Saldo</p>
                <div className="flex items-center justify-center gap-1">
                  {getDelta(totals.balance, prevTotals.balance) > 0 ? (
                    <ArrowUpRight size={16} className="text-emerald-500" />
                  ) : getDelta(totals.balance, prevTotals.balance) < 0 ? (
                    <ArrowDownRight size={16} className="text-red-500" />
                  ) : <Minus size={16} className="text-muted-foreground" />}
                  <span className={cn("text-lg font-bold", getDelta(totals.balance, prevTotals.balance) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {getDelta(totals.balance, prevTotals.balance).toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(totals.balance)} vs {formatCurrency(prevTotals.balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border rounded px-2 py-1">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-muted rounded" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-muted rounded" aria-label="Próximo mês"><ChevronRight size={14} /></button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCustomize(true)}>
            <Settings size={14} className="mr-1" /> Personalizar
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus size={14} className="mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{alerts.length} orçamento(s) ultrapassado(s): {alerts.map(a => a.category).join(', ')}</span>
        </div>
      )}

      {/* Dynamic sections */}
      {orderedSections.map((s, i) => (
        <div key={s.id}>
          {renderSection(s.id)}
        </div>
      ))}

      {/* Recent transactions (always shown at bottom) */}
      <Card className="border-0 shadow-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-emerald-500" /> Últimas Transações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {monthTx.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem transações neste mês</p>
          ) : (
            monthTx.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 -mx-2 rounded hover:bg-muted/50 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded flex items-center justify-center text-xs font-bold shrink-0 shadow-sm",
                  t.type === 'income' ? 'gradient-emerald text-emerald-700' :
                  t.type === 'expense' ? 'gradient-red text-red-700' : 'gradient-violet text-amber-700'
                )}>
                  {(t.description || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category ? <>{getCategoryIcon(t.category)} {t.category}</> : '—'}</p>
                </div>
                <span className={cn(
                  "text-sm font-semibold shrink-0",
                  t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-amber-600'
                )}>
                  {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TransactionModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} goals={goals} defaultType={defaultType} />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <DashCustomizeModal open={showCustomize} onClose={() => setShowCustomize(false)} onUpdate={(s) => setDashSections(s)} />
    </div>
  );
}
