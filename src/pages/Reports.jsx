import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt, FileText, CalendarClock, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, groupByCategory, calcTotals, getLast6Months, getCurrentMonthKey, filterByMonth } from '@/lib/financeUtils';
import { CAT_COLORS, MONTH_NAMES } from '@/lib/categories';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { lsGet } from '@/lib/store';
import { useTransactions, useBudgets } from '@/hooks/useData';

// ═══ Cash Flow Forecast Component ═══
function CashFlowForecast({ transactions }) {
  const [months, setMonths] = useState(6);
  const [showDetails, setShowDetails] = useState(false);

  const now = new Date();
  const currentKey = getCurrentMonthKey();

  // Calculate averages from last 6 months
  const last6 = getLast6Months();
  const monthlyStats = last6.map(({ year, month }) => {
    const tx = filterByMonth(transactions, year, month);
    const t = calcTotals(tx);
    return { income: t.income, expense: t.expense + t.investment };
  });

  const avgIncome = monthlyStats.reduce((s, m) => s + m.income, 0) / 6;
  const avgExpense = monthlyStats.reduce((s, m) => s + m.expense, 0) / 6;

  // Fixed transactions (recurring monthly cost)
  const fixedTx = transactions.filter(t => t.isFixed);
  const fixedIncome = fixedTx.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const fixedExpense = fixedTx.filter(t => t.type !== 'income').reduce((s, t) => s + t.value, 0);

  // Current month balance
  const currentMonthTx = filterByMonth(transactions, now.getFullYear(), now.getMonth());
  const currentBalance = calcTotals(currentMonthTx).balance;

  // Generate forecast
  const forecast = [];
  let cumulativeBalance = 0;
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = MONTH_NAMES[d.getMonth()].slice(0, 3);

    // For current month use actual data, for future use averages
    let income, expense;
    if (i === 0) {
      const currentTotals = calcTotals(currentMonthTx);
      income = currentTotals.income;
      expense = currentTotals.expense + currentTotals.investment;
    } else {
      income = avgIncome || fixedIncome;
      expense = avgExpense || fixedExpense;
    }

    const balance = income - expense;
    cumulativeBalance += (i === 0 ? balance : balance);

    forecast.push({
      name: monthName,
      key,
      income: Math.round(income),
      expense: Math.round(expense),
      balance: Math.round(balance),
      cumulative: Math.round(cumulativeBalance),
      isCurrentMonth: i === 0,
    });
  }

  // Credit card upcoming invoices
  const cards = lsGet('cards', []);
  const upcomingInvoices = cards.map(card => {
    const closingDay = parseInt(card.closingDay) || 1;
    const dueDay = parseInt(card.dueDay) || 10;
    // Current month invoice (if not yet closed)
    const today = now.getDate();
    let invoiceMonth, invoiceYear;
    if (today <= closingDay) {
      invoiceMonth = now.getMonth();
      invoiceYear = now.getFullYear();
    } else {
      invoiceMonth = now.getMonth() + 1;
      invoiceYear = now.getFullYear();
      if (invoiceMonth > 11) { invoiceMonth = 0; invoiceYear++; }
    }
    // Calculate card expenses for the billing period — only include transactions
    // whose date falls within the invoice month/year (determined above by closingDay).
    // This ensures we don't sum all historical card transactions, only the relevant month.
    const invoicePrefix = `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
    const cardExpenses = transactions.filter(t =>
      t.cardId === card.id && t.type === 'expense' && t.date?.startsWith(invoicePrefix)
    ).reduce((s, t) => s + t.value, 0);

    return {
      ...card,
      invoiceAmount: cardExpenses,
      dueDate: `${String(dueDay).padStart(2, '0')}/${String(invoiceMonth + 1).padStart(2, '0')}`,
    };
  }).filter(c => c.invoiceAmount > 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock size={18} /> Fluxo de Caixa — Previsão
          </CardTitle>
          <Select value={months.toString()} onValueChange={v => setMonths(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Receita Média/Mês</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(avgIncome)}</p>
          </div>
          <div className="bg-muted/50 rounded p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Despesa Média/Mês</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(avgExpense)}</p>
          </div>
          <div className="bg-muted/50 rounded p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Saldo Médio/Mês</p>
            <p className={cn("text-sm font-bold", avgIncome - avgExpense >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {formatCurrency(avgIncome - avgExpense)}
            </p>
          </div>
        </div>

        {/* Forecast chart */}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={forecast}>
            <defs>
              <linearGradient id="forecastIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Area type="monotone" dataKey="income" name="Receita" stroke="#10b981" fill="url(#forecastIncomeGrad)" strokeWidth={2} strokeDasharray="4 2" />
            <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" fill="url(#forecastExpenseGrad)" strokeWidth={2} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>

        {/* Forecast table */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {showDetails ? 'Ocultar' : 'Ver'} detalhamento mensal
          </button>
        </div>

        {showDetails && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Mês</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Receita</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Despesa</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((f, i) => (
                  <tr key={f.key} className={cn("border-b last:border-0", f.isCurrentMonth && "bg-primary/5 font-medium")}>
                    <td className="px-2 py-1.5 capitalize">
                      {MONTH_NAMES[parseInt(f.key.split('-')[1]) - 1]} {f.key.split('-')[0]}
                      {f.isCurrentMonth && <Badge variant="outline" className="ml-1 text-[9px] py-0">Atual</Badge>}
                    </td>
                    <td className="text-right px-2 py-1.5 text-emerald-600">{formatCurrency(f.income)}</td>
                    <td className="text-right px-2 py-1.5 text-red-500">{formatCurrency(f.expense)}</td>
                    <td className={cn("text-right px-2 py-1.5 font-semibold", f.balance >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upcoming card invoices */}
        {upcomingInvoices.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Faturas Próximas</p>
            {upcomingInvoices.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                <div className="w-6 h-4 rounded-sm flex items-center justify-center text-white text-[8px] font-bold" style={{ background: c.color }}>
                  {c.brand === 'visa' ? 'V' : c.brand === 'mastercard' ? 'MC' : c.brand === 'elo' ? 'E' : 'CC'}
                </div>
                <span className="font-medium flex-1">{c.name}</span>
                <span className="text-muted-foreground">Vence {c.dueDate}</span>
                <span className="font-semibold text-red-500">{formatCurrency(c.invoiceAmount)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic">
          * Previsão baseada na média dos últimos 6 meses. Transações fixas têm peso garantido.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [filterType, setFilterType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();

  const now = new Date();

  const getPeriodTx = () => {
    const today = now.toISOString().split('T')[0];
    if (period === 'month') {
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter(t => t.date?.startsWith(prefix));
    }
    if (period === 'quarter') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      return transactions.filter(t => t.date >= threeMonthsAgo);
    }
    if (period === 'semester') {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      return transactions.filter(t => t.date >= sixMonthsAgo);
    }
    if (period === 'year') {
      return transactions.filter(t => t.date?.startsWith(String(now.getFullYear())));
    }
    return transactions;
  };

  const periodTx = getPeriodTx().filter(t => filterType === 'all' || t.type === filterType);
  const totals = calcTotals(periodTx);
  const savingsRate = totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0;

  const avgTicket = periodTx.length > 0 ? periodTx.reduce((s, t) => s + t.value, 0) / periodTx.length : 0;
  const maxExpense = periodTx.filter(t => t.type === 'expense').reduce((max, t) => t.value > max.value ? t : max, { value: 0 });

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
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const tx = transactions.filter(t => t.date?.startsWith(prefix));
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
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
              const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
          { label: 'Receitas', value: formatCurrency(totals.income), icon: TrendingUp, gradient: 'gradient-emerald', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Despesas', value: formatCurrency(totals.expense), icon: TrendingDown, gradient: 'gradient-red', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Saldo', value: formatCurrency(totals.balance), icon: Wallet, gradient: 'gradient-blue', color: totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500', bg: totals.balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Transações', value: periodTx.length, icon: Receipt, gradient: '', color: 'text-primary', bg: 'bg-primary/10' },
        ].map(kpi => (
          <div key={kpi.label} className="shrink-0 w-44 snap-start">
            <Card className={cn("border-0 shadow-card overflow-hidden", kpi.gradient)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className={cn("text-xl font-bold mt-0.5 tabular-nums", kpi.color)}>{kpi.value}</p>
                  </div>
                  <div className={cn("p-2 rounded", kpi.bg)}>
                    <kpi.icon size={16} className={kpi.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      <div className="hidden lg:grid grid-cols-4 gap-3 animate-fade-in">
        {[
          { label: 'Receitas', value: formatCurrency(totals.income), icon: TrendingUp, gradient: 'gradient-emerald', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Despesas', value: formatCurrency(totals.expense), icon: TrendingDown, gradient: 'gradient-red', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Saldo', value: formatCurrency(totals.balance), icon: Wallet, gradient: 'gradient-blue', color: totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500', bg: totals.balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Transações', value: periodTx.length, icon: Receipt, gradient: '', color: 'text-primary', bg: 'bg-primary/10' },
        ].map(kpi => (
          <Card key={kpi.label} className={cn("border-0 shadow-card overflow-hidden", kpi.gradient)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className={cn("text-xl font-bold mt-0.5 tabular-nums", kpi.color)}>{kpi.value}</p>
                </div>
                <div className={cn("p-2 rounded", kpi.bg)}>
                  <kpi.icon size={16} className={kpi.color} />
                </div>
              </div>
            </CardContent>
          </Card>
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
            <Card className="border-0 shadow-card">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold mt-0.5 tabular-nums">{kpi.value}</p>
              </CardContent>
            </Card>
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
          <Card key={kpi.label} className="border-0 shadow-card">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-lg font-bold mt-0.5 tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-3">
        <span>📊</span>
        <span>Gire o dispositivo para visualizar os gráficos melhor</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area chart - evolution */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40"><CardTitle className="text-sm font-semibold flex items-center gap-2"><div className="w-1.5 h-4 rounded-full bg-primary" />Evolução Mensal</CardTitle></CardHeader>
          <CardContent>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40"><CardTitle className="text-sm font-semibold flex items-center gap-2"><div className="w-1.5 h-4 rounded-full bg-amber-500" />Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
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
                      <span className="font-semibold shrink-0">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Forecast */}
      <CashFlowForecast transactions={transactions} />

      {/* Category bar chart */}
      {catBarData.length > 0 && (
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40"><CardTitle className="text-sm font-semibold flex items-center gap-2"><div className="w-1.5 h-4 rounded-full bg-violet-500" />Gastos por Categoria — Detalhe</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catBarData} barSize={24} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                  {catBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Real vs Planejado */}
      {realVsPlanned.length > 0 && (
        <Card className="border-0 shadow-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" /> Real vs Planejado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Chart */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div style={{ minWidth: Math.max(300, realVsPlanned.length * 60) }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rvChartData} barGap={4} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Realizado" fill="#f97316" radius={[4, 4, 0, 0]} />
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
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-2 py-1.5 font-medium">
                        {r.category}
                        {r.semOrcamento && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] py-0 text-muted-foreground">Sem orçamento</Badge>
                        )}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums">{r.orcado > 0 ? formatCurrency(r.orcado) : '—'}</td>
                      <td className="text-right px-2 py-1.5 tabular-nums font-medium">{formatCurrency(r.realizado)}</td>
                      <td className={cn("text-right px-2 py-1.5 font-semibold tabular-nums",
                        r.desvio <= 0 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {r.desvio <= 0 ? '' : '+'}{formatCurrency(r.desvio)}
                      </td>
                      <td className={cn("text-right px-2 py-1.5 font-semibold tabular-nums",
                        r.semOrcamento ? 'text-muted-foreground' :
                        r.pct <= 100 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {r.semOrcamento ? '—' : `${r.pct}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="px-2 py-2">Total</td>
                    <td className="text-right px-2 py-2 tabular-nums">{formatCurrency(rvTotalOrcado)}</td>
                    <td className="text-right px-2 py-2 tabular-nums">{formatCurrency(rvTotalReal)}</td>
                    <td className={cn("text-right px-2 py-2 font-bold tabular-nums",
                      rvTotalDesvio <= 0 ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      {rvTotalDesvio <= 0 ? '' : '+'}{formatCurrency(rvTotalDesvio)}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums">
                      {rvTotalOrcado > 0 ? `${Math.round((rvTotalReal / rvTotalOrcado) * 100)}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card className="border-0 shadow-card overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/40"><CardTitle className="text-sm font-semibold flex items-center gap-2"><div className="w-1.5 h-4 rounded-full bg-emerald-500" />Detalhamento de Transações</CardTitle></CardHeader>
        <CardContent className="p-0">
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y divide-border">
            {periodTx.slice(0, 20).map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium truncate max-w-[180px]">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category || '—'} · {t.date?.split('-').reverse().join('/')}</p>
                </div>
                <p className={cn("text-sm font-semibold shrink-0",
                  t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                </p>
              </div>
            ))}
            {periodTx.length > 20 && (
              <p className="text-center text-xs text-muted-foreground py-3">Exibindo 20 de {periodTx.length} transações</p>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Categoria</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Tipo</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {periodTx.slice(0, 20).map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{t.date?.split('-').reverse().join('/')}</td>
                    <td className="px-4 py-2.5 max-w-[180px] truncate">{t.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{t.category || '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border",
                        t.type === 'income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        t.type === 'expense' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-violet-50 text-violet-700 border-violet-200'
                      )}>
                        {t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento'}
                      </span>
                    </td>
                    <td className={cn("px-4 py-2.5 text-right font-bold whitespace-nowrap tabular-nums",
                      t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                    )}>
                      {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {periodTx.length > 20 && (
              <p className="text-center text-xs text-muted-foreground py-3">Exibindo 20 de {periodTx.length} transações</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}