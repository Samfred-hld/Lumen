import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt, FileText, CalendarClock, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, groupByCategory, calcTotals, getLast6Months, getCurrentMonthKey, filterByMonth, getMonthKey, toMonthKey } from '@/lib/financeUtils';
import { CAT_COLORS, MONTH_NAMES } from '@/lib/categories';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart
} from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { useTransactions, useBudgets } from '@/hooks/useData';
import CashFlowForecast from '@/components/finance/CashFlowForecast';
import Pagination from '@/components/ui/pagination';


export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [filterType, setFilterType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const DETAIL_PAGE_SIZE = 20;
  const reportRef = useRef(null);

  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();

  const now = new Date();

  const periodTx = React.useMemo(() => {
    let filtered;
    if (period === 'month') {
      const prefix = toMonthKey(now);
      filtered = transactions.filter(t =>
        t.invoiceMonth ? t.invoiceMonth === prefix : t.date?.startsWith(prefix)
      );
    } else if (period === 'quarter') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      const threeMonthsAgoKey = threeMonthsAgo.slice(0, 7);
      filtered = transactions.filter(t => {
        const key = t.invoiceMonth || t.date;
        return key >= threeMonthsAgoKey;
      });
    } else if (period === 'semester') {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      const sixMonthsAgoKey = sixMonthsAgo.slice(0, 7);
      filtered = transactions.filter(t => {
        const key = t.invoiceMonth || t.date;
        return key >= sixMonthsAgoKey;
      });
    } else if (period === 'year') {
      const yearPrefix = String(now.getFullYear());
      filtered = transactions.filter(t => {
        const key = t.invoiceMonth || t.date;
        return key?.startsWith(yearPrefix);
      });
    } else {
      filtered = transactions;
    }
    return filterType === 'all' ? filtered : filtered.filter(t => t.type === filterType);
  }, [transactions, period, filterType, now.getFullYear(), now.getMonth()]);
  const totals = calcTotals(periodTx);
  const savingsRate = totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0;

  const avgTicket = periodTx.length > 0 ? periodTx.reduce((s, t) => s + t.value, 0) / periodTx.length : 0;
  const maxExpense = periodTx.filter(t => t.type === 'expense').reduce((max, t) => t.value > max.value ? t : max, { value: 0 });

  // Pagination for detail section
  const detailTotalPages = Math.ceil(periodTx.length / DETAIL_PAGE_SIZE);
  const pagedDetailTx = periodTx.slice(
    (detailPage - 1) * DETAIL_PAGE_SIZE,
    detailPage * DETAIL_PAGE_SIZE
  );

  // Page subtotals
  const pageIncome = pagedDetailTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.value || 0), 0);
  const pageExpense = pagedDetailTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.value || 0), 0);
  const pageBalance = pageIncome - pageExpense;

  // Reset detail page when filters change
  useEffect(() => { setDetailPage(1); }, [period, filterType]);

  const dayCounts = {};
  periodTx.filter(t => t.type === 'expense').forEach(t => {
    const d = new Date(t.date).getDay();
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Category pie data (expenses only)
  const expenseTx = periodTx.filter(t => t.type === 'expense');
  const catData = groupByCategory(expenseTx).slice(0, 7).map(([cat, val]) => ({
    name: cat, value: val, color: CAT_COLORS[cat] || '#94a3b8'
  }));

  // Monthly evolution (last 6 months)
  const last6 = getLast6Months();
  const monthlyData = last6.map(({ year, month }) => {
    const prefix = getMonthKey(year, month);
    const tx = transactions.filter(t =>
      t.invoiceMonth ? t.invoiceMonth === prefix : t.date?.startsWith(prefix)
    );
    const t = calcTotals(tx);
    return { name: MONTH_NAMES[month].slice(0, 3), income: t.income, expense: t.expense, balance: t.balance };
  });

  // Category bar chart
  const catBarData = groupByCategory(expenseTx).slice(0, 8).map(([cat, val]) => ({
    name: cat.length > 10 ? cat.slice(0, 9) + '…' : cat,
    value: val,
    fill: CAT_COLORS[cat] || '#94a3b8'
  }));

  // Real vs Planejado data
  const currentMonthKey = toMonthKey(now);
  const monthBudgets = budgets.filter(b => b.month === currentMonthKey);
  const budgetCategories = new Set(monthBudgets.map(b => b.category));
  const spentByCategory = {};
  expenseTx.forEach(t => {
    if (t.category) {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.value;
    }
  });

  const realVsPlanned = [];
  // Budgeted categories
  monthBudgets.forEach(b => {
    const realizado = spentByCategory[b.category] || 0;
    realVsPlanned.push({
      category: b.category,
      orcado: b.limit,
      realizado,
      desvio: realizado - b.limit,
      pct: b.limit > 0 ? Math.round((realizado / b.limit) * 100) : 0,
    });
  });
  // Categories with spending but no budget
  Object.entries(spentByCategory).forEach(([cat, val]) => {
    if (!budgetCategories.has(cat)) {
      realVsPlanned.push({
        category: cat,
        orcado: 0,
        realizado: val,
        desvio: val,
        pct: 0,
        semOrcamento: true,
      });
    }
  });
  realVsPlanned.sort((a, b) => b.realizado - a.realizado);

  const rvTotalOrcado = realVsPlanned.reduce((s, r) => s + r.orcado, 0);
  const rvTotalReal = realVsPlanned.reduce((s, r) => s + r.realizado, 0);
  const rvTotalDesvio = rvTotalReal - rvTotalOrcado;

  const rvChartData = realVsPlanned.map(r => ({
    name: r.category.length > 12 ? r.category.slice(0, 11) + '…' : r.category,
    Orçado: r.orcado,
    Realizado: r.realizado,
  }));

  return (
    <div ref={reportRef} className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Análise detalhada das suas finanças</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="semester">Semestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="investment">Investimentos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
            const header = 'Data,Descrição,Tipo,Valor,Categoria\n';
            const rows = periodTx.map(t =>
              [t.date, `"${(t.description||'').replace(/"/g,'""')}"`, t.type, t.value, t.category||''].join(',')
            ).join('\n');
            const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `lumen_relatorio_${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}>
            <FileText size={12} className="mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" disabled={isExporting} onClick={async () => {
            if (!reportRef.current) return;
            setIsExporting(true);
            try {
              const html2canvas = (await import('html2canvas')).default;
              const { jsPDF } = await import('jspdf');
              const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                ignoreElements: (el) => {
                  return el.tagName === 'IFRAME' ||
                    (el.id && (el.id.includes('vite') || el.id.includes('error'))) ||
                    (el.className && typeof el.className === 'string' && el.className.includes('vite'));
                },
              });
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();
              const margin = 10;
              const usableWidth = pageWidth - margin * 2;
              const imgWidth = usableWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              // Cabeçalho
              pdf.setFontSize(18);
              pdf.setFont(undefined, 'bold');
              pdf.text('Lúmen — Relatório Financeiro', margin, 15);
              pdf.setFontSize(10);
              pdf.setFont(undefined, 'normal');
              pdf.setTextColor(100);
              const labels = { month: 'Este Mês', quarter: 'Trimestre', semester: 'Semestre', year: 'Este Ano', all: 'Todos os Dados' };
              const monthKey = toMonthKey(now);
              pdf.text(`${labels[period] || 'Relatório'} — ${monthKey} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 22);
              pdf.setTextColor(0);

              // Imagem do relatório a partir da segunda página
              let yOffset = 0;
              const headerOffset = 28;
              const firstPageAvailable = pageHeight - headerOffset - margin;
              const totalPages = Math.ceil(imgHeight / firstPageAvailable);

              for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();
                const sourceY = i === 0 ? 0 : (firstPageAvailable + (i - 1) * (pageHeight - margin * 2));
                const sliceHeight = i === 0 ? firstPageAvailable : (pageHeight - margin * 2);
                const destY = i === 0 ? headerOffset : margin;

                // Calculate source rectangle in pixels
                const pxPerMm = canvas.width / imgWidth;
                const sx = 0;
                const sy = sourceY * pxPerMm;
                const sw = canvas.width;
                const sh = sliceHeight * pxPerMm;

                // Create a cropped canvas for this page slice
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = sw;
                sliceCanvas.height = sh;
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

                const sliceData = sliceCanvas.toDataURL('image/png');
                const sliceImgHeight = (sh * imgWidth) / sw;
                pdf.addImage(sliceData, 'PNG', margin, destY, imgWidth, sliceImgHeight);
              }

              const fileName = `lumen-relatorio-${monthKey}.pdf`;
              pdf.save(fileName);
            } catch (err) {
              console.error('[Reports] Erro ao exportar PDF:', err);
            } finally {
              setIsExporting(false);
            }
          }}>
            <Download size={12} className={cn("mr-1", isExporting && "animate-spin")} />
            {isExporting ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* KPIs — Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex lg:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide animate-fade-in">
        {[
          { label: 'Receitas', value: formatCurrency(totals.income), icon: 'trending_up', accent: 'bg-kpi-income', color: 'text-kpi-income', iconColor: 'text-kpi-income' },
          { label: 'Despesas', value: formatCurrency(totals.expense), icon: 'trending_down', accent: 'bg-kpi-expense', color: 'text-danger', iconColor: 'text-kpi-expense' },
          { label: 'Saldo', value: formatCurrency(totals.balance), icon: 'balance', accent: 'bg-secondary-container', color: totals.balance >= 0 ? 'text-success' : 'text-danger', iconColor: 'text-secondary' },
          { label: 'Transações', value: periodTx.length, icon: 'receipt', accent: 'bg-primary', color: 'text-on-surface', iconColor: 'text-primary' },
        ].map(kpi => (
          <div key={kpi.label} className="shrink-0 w-44 snap-start">
            <div className="bg-surface border border-surface-border p-card-padding relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className={cn("absolute top-0 left-0 right-0 h-[3px]", kpi.accent)} />
              <div className="flex justify-between items-start mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant">{kpi.label}</span>
                <span className={cn("material-symbols-outlined text-sm", kpi.iconColor)}>{kpi.icon}</span>
              </div>
              <div className="font-headline text-headline text-on-surface">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:grid grid-cols-4 gap-3 animate-fade-in">
        {[
          { label: 'Receitas', value: formatCurrency(totals.income), icon: 'trending_up', accent: 'bg-kpi-income', color: 'text-kpi-income', iconColor: 'text-kpi-income' },
          { label: 'Despesas', value: formatCurrency(totals.expense), icon: 'trending_down', accent: 'bg-kpi-expense', color: 'text-danger', iconColor: 'text-kpi-expense' },
          { label: 'Saldo', value: formatCurrency(totals.balance), icon: 'balance', accent: 'bg-secondary-container', color: totals.balance >= 0 ? 'text-success' : 'text-danger', iconColor: 'text-secondary' },
          { label: 'Transações', value: periodTx.length, icon: 'receipt', accent: 'bg-primary', color: 'text-on-surface', iconColor: 'text-primary' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface border border-surface-border p-card-padding relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className={cn("absolute top-0 left-0 right-0 h-[3px]", kpi.accent)} />
            <div className="flex justify-between items-start mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant">{kpi.label}</span>
              <span className={cn("material-symbols-outlined text-sm", kpi.iconColor)}>{kpi.icon}</span>
            </div>
            <div className="font-headline text-headline text-on-surface">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Advanced KPIs — Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex lg:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {[
          { label: 'Ticket Médio', value: formatCurrency(avgTicket) },
          { label: 'Taxa de Poupança', value: `${savingsRate.toFixed(1)}%` },
          { label: 'Maior Gasto', value: maxExpense.value > 0 ? formatCurrency(maxExpense.value) : '—' },
          { label: 'Dia c/ Mais Gastos', value: topDay ? dayNames[parseInt(topDay[0])] : '—' },
        ].map(kpi => (
          <div key={kpi.label} className="shrink-0 w-44 snap-start">
            <div className="bg-surface border border-surface-border rounded-lg shadow-sm">
              <div className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold mt-0.5 font-mono-number tracking-tight">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {[
          { label: 'Ticket Médio', value: formatCurrency(avgTicket) },
          { label: 'Taxa de Poupança', value: `${savingsRate.toFixed(1)}%` },
          { label: 'Maior Gasto', value: maxExpense.value > 0 ? formatCurrency(maxExpense.value) : '—' },
          { label: 'Dia c/ Mais Gastos', value: topDay ? dayNames[parseInt(topDay[0])] : '—' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface border border-surface-border rounded-lg shadow-sm">
            <div className="p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-lg font-bold mt-0.5 font-mono-number tracking-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-3">
        <span>📊</span>
        <span>Gire o dispositivo para visualizar os gráficos melhor</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area chart - evolution */}
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
          <div className="p-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-primary" />Evolução Mensal
            </h3>
          </div>
          <div className="p-4 flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis {...AXIS_STYLE} dataKey="name" />
                <YAxis {...AXIS_STYLE} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => formatCurrency(v)} />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
          <div className="p-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" />Despesas por Categoria
            </h3>
          </div>
          <div className="p-4 flex-1">
            {catData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
            ) : (
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                      {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {catData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="font-semibold shrink-0 font-mono-number tracking-tight">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <CashFlowForecast transactions={transactions} />

      {/* Category bar chart */}
      {catBarData.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
          <div className="p-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-violet-500" />Gastos por Categoria — Detalhe
            </h3>
          </div>
          <div className="p-4 flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catBarData} barSize={24} layout="vertical">
                <CartesianGrid {...GRID_STYLE} horizontal={false} />
                <XAxis {...AXIS_STYLE} type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis {...AXIS_STYLE} type="category" dataKey="name" width={80} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => formatCurrency(v)} />
                <Bar dataKey="value" name="Valor" radius={[0, 6, 6, 0]} maxBarSize={40}>
                  {catBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Real vs Planejado */}
      {realVsPlanned.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
          <div className="p-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" /> Real vs Planejado
            </h3>
          </div>
          <div className="p-4 flex-1 space-y-4">
            {/* Chart */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div style={{ minWidth: Math.max(300, realVsPlanned.length * 60) }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rvChartData} barGap={4} barSize={20}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis {...AXIS_STYLE} dataKey="name" />
                    <YAxis {...AXIS_STYLE} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => formatCurrency(v)} />
                    <Bar dataKey="Orçado" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Realizado" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Categoria</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Orçado</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Realizado</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Desvio</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {realVsPlanned.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-surface-low transition-colors">
                      <td className="px-2 py-1.5 font-medium text-on-surface">
                        {r.category}
                        {r.semOrcamento && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] py-0 text-muted-foreground">Sem orçamento</Badge>
                        )}
                      </td>
                      <td className="text-right px-2 py-1.5 font-mono-number tracking-tight text-muted-foreground">{r.orcado > 0 ? formatCurrency(r.orcado) : '—'}</td>
                      <td className="text-right px-2 py-1.5 font-mono-number tracking-tight font-medium">{formatCurrency(r.realizado)}</td>
                      <td className={cn("text-right px-2 py-1.5 font-semibold font-mono-number tracking-tight",
                        r.desvio <= 0 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {r.desvio <= 0 ? '' : '+'}{formatCurrency(r.desvio)}
                      </td>
                      <td className={cn("text-right px-2 py-1.5 font-semibold font-mono-number tracking-tight",
                        r.semOrcamento ? 'text-muted-foreground' :
                        r.pct <= 100 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {r.semOrcamento ? '—' : `${r.pct}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border font-bold bg-surface-low">
                    <td className="px-2 py-2 text-on-surface">Total</td>
                    <td className="text-right px-2 py-2 font-mono-number tracking-tight text-on-surface">{formatCurrency(rvTotalOrcado)}</td>
                    <td className="text-right px-2 py-2 font-mono-number tracking-tight text-on-surface">{formatCurrency(rvTotalReal)}</td>
                    <td className={cn("text-right px-2 py-2 font-bold font-mono-number tracking-tight",
                      rvTotalDesvio <= 0 ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      {rvTotalDesvio <= 0 ? '' : '+'}{formatCurrency(rvTotalDesvio)}
                    </td>
                    <td className="text-right px-2 py-2 font-mono-number tracking-tight text-on-surface">
                      {rvTotalOrcado > 0 ? `${Math.round((rvTotalReal / rvTotalOrcado) * 100)}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden flex flex-col group">
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-emerald-500" /> Detalhamento de Transações
          </h3>
        </div>
        <div className="p-0 flex-1">
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y divide-slate-100">
            {pagedDetailTx.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-low transition-colors">
                <div>
                  <p className="text-sm font-medium truncate max-w-[180px]">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t.category || '—'} · {t.date?.split('-').reverse().join('/')}</p>
                </div>
                <p className={cn("text-sm font-semibold shrink-0 font-mono-number tracking-tight",
                  t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                </p>
              </div>
            ))}
            {detailTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-surface-border/50">
                <Pagination page={detailPage} totalPages={detailTotalPages} onPageChange={setDetailPage} />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground py-2">
              Exibindo {Math.min(detailPage * DETAIL_PAGE_SIZE, periodTx.length)} de {periodTx.length} transações
            </p>
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pagedDetailTx.map(t => (
                  <tr key={t.id} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-low transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono-number tracking-tight">{t.date?.split('-').reverse().join('/')}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate font-medium text-on-surface">{t.description}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t.category || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider",
                        t.type === 'income' ? 'bg-emerald-100 text-emerald-700' :
                        t.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'
                      )}>
                        {t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento'}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap font-mono-number tracking-tight",
                      t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                    )}>
                      {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-surface-border bg-surface-low">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Subtotal ({pagedDetailTx.length} itens)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600 tabular-nums hidden md:table-cell" />
                  <td className={cn(
                    "px-4 py-3 text-right text-[13px] font-bold font-mono-number tracking-tight",
                    pageBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    Saldo pagina: {formatCurrency(pageBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {detailTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-surface-border">
                <Pagination page={detailPage} totalPages={detailTotalPages} onPageChange={setDetailPage} />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground py-3">
              Exibindo {Math.min(detailPage * DETAIL_PAGE_SIZE, periodTx.length)} de {periodTx.length} transações
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}