// ══════════════════════════════════════════
// LÚMEN — Cash Flow Forecast Component
// ══════════════════════════════════════════

import React, { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, filterByMonth, calcTotals, getLast6Months, getCurrentMonthKey, getMonthKey, toMonthKey } from '@/lib/financeUtils';
import { CAT_COLORS, MONTH_NAMES } from '@/lib/categories';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/useData';

export default function CashFlowForecast({ transactions }) {
  const { data: cardsData = [] } = useCards();
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
    const key = toMonthKey(d);
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
  const cards = cardsData;
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
    // Calculate card expenses for the billing period
    const invoicePrefix = getMonthKey(invoiceYear, invoiceMonth);
    const cardExpenses = transactions.filter(t =>
      t.cardId === card.id && t.type === 'expense' &&
      (t.invoiceMonth ? t.invoiceMonth === invoicePrefix : t.date?.startsWith(invoicePrefix))
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
                {forecast.map((f) => (
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
