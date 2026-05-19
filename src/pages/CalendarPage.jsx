import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { ChevronLeft, ChevronRight, Plus, X, CreditCard, Calendar, Download, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, filterByMonth, calcTotals, getDaysInMonth, getFirstDayOfMonth } from '@/lib/financeUtils';
import { getInvoiceMonth as getInvoiceMonthStr } from '@/lib/csvParser';
import { MONTH_NAMES, MONTH_SHORT, DAY_NAMES } from '@/lib/categories';
import TransactionModal from '@/components/finance/TransactionModal';
import { cn } from '@/lib/utils';
// store imports removed — using useCards() hook instead
import { getCategoryIcon } from '@/lib/categories';
import MsIcon from '@/components/ui/ms-icon';
import { useTransactions, useGoals, useCards } from '@/hooks/useData';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// ═══ Invoice month helper ═══
/**
 * Billing cycle wrapper — converts csvParser's "YYYY-MM" string to { year, month } (0-indexed).
 */
function getInvoiceMonth(dateStr, closingDay) {
  const key = getInvoiceMonthStr(dateStr, closingDay);
  if (!key) return null;
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

// ═══ CSV Export ═══
function exportCalendarCSV(transactions, cards, month, year) {
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });
  const rows = transactions.map(t => {
    const c = t.cardId ? cardMap[t.cardId] : null;
    return [
      `"${new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      t.type === 'income' ? 'Receita' : t.type === 'investment' ? 'Investimento' : 'Despesa',
      formatCurrency(Math.abs(t.value)),
      `"${c ? 'Crédito - ' + c.name : t.paymentMethod || ''}"`,
    ].join(';');
  });
  const csv = '\uFEFF' + ['Data;Descrição;Categoria;Tipo;Valor;Pagamento', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calendario_${MONTH_SHORT[month]}_${year}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CalendarPage() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [newTxDate, setNewTxDate] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [cardStatementCard, setCardStatementCard] = useState(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: transactions = [], refetch } = useTransactions(500);
  const { data: goals = [] } = useGoals();
  const { data: cards = [] } = useCards();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  const monthTx = filterByMonth(transactions, currentYear, currentMonth);
  const monthTotals = calcTotals(monthTx);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Group transactions by day
  const txByDay = {};
  monthTx.forEach(t => {
    const day = parseInt(t.date?.split('-')[2]);
    if (!txByDay[day]) txByDay[day] = [];
    txByDay[day].push(t);
  });

  // ═══ Credit card events for this month ═══
  const cardEventsByDay = {};
  cards.forEach(card => {
    const closing = parseInt(card.closingDay);
    const due = parseInt(card.dueDay);
    if (closing >= 1 && closing <= daysInMonth) {
      if (!cardEventsByDay[closing]) cardEventsByDay[closing] = [];
      cardEventsByDay[closing].push({ type: 'closing', card });
    }
    if (due >= 1 && due <= daysInMonth) {
      if (!cardEventsByDay[due]) cardEventsByDay[due] = [];
      cardEventsByDay[due].push({ type: 'due', card });
    }
  });

  const selectedDayTx = selectedDay ? (txByDay[selectedDay] || []) : [];
  const selectedDayTotals = calcTotals(selectedDayTx);
  const selectedDayCardEvents = selectedDay ? (cardEventsByDay[selectedDay] || []) : [];

  const handleDayClick = (day) => {
    const newDay = day === selectedDay ? null : day;
    setSelectedDay(newDay);
    if (isMobile && newDay && (txByDay[newDay] || []).length > 0) {
      setSheetOpen(true);
    }
  };

  const handleAddOnDay = (day) => {
    const paddedDay = String(day).padStart(2, '0');
    const paddedMonth = String(currentMonth + 1).padStart(2, '0');
    setNewTxDate(`${currentYear}-${paddedMonth}-${paddedDay}`);
    setEditingTx(null);
    setShowTxModal(true);
  };

  const handleEditTx = (tx) => {
    setEditingTx(tx);
    setNewTxDate(null);
    setShowTxModal(true);
  };

  const handleDeleteTx = async (id) => {
    if (!confirm('Excluir esta transação?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    refetch();
  };

  const handleSaveTx = async (data) => {
    if (editingTx) {
      await supabase.from('transactions').update(data).eq('id', editingTx.id);
    } else {
      await supabase.from('transactions').insert({ ...data, date: newTxDate || data.date }).select().single();
    }
    refetch();
    setEditingTx(null);
    setShowTxModal(false);
  };

  // ═══ Card statement helpers ═══
  const getCardStatementTxs = (card) => {
    return transactions.filter(t => {
      if (t.cardId !== card.id || t.type !== 'expense') return false;
      const inv = getInvoiceMonth(t.date, card.closingDay);
      return inv && inv.year === currentYear && inv.month === currentMonth;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  };

  const getCardInvoiceLabel = (tx) => {
    if (!tx.cardId || tx.type !== 'expense') return null;
    const card = cards.find(c => c.id === tx.cardId);
    if (!card) return null;
    const inv = getInvoiceMonth(tx.date, card.closingDay);
    if (!inv) return null;
    const txMonth = parseInt(tx.date?.split('-')[1]) - 1;
    if (inv.month !== txMonth || inv.year !== parseInt(tx.date?.split('-')[0])) {
      return `Fatura ${MONTH_SHORT[inv.month]}/${inv.year}`;
    }
    return null;
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visualize seus lançamentos por dia</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Monthly totals in header */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700">+{formatCurrency(monthTotals.income)}</span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">-{formatCurrency(monthTotals.expense)}</span>
            {monthTotals.creditCard > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">
                Cartão: {formatCurrency(monthTotals.creditCard)}
              </span>
            )}
            <span className={cn("text-xs font-bold px-2 py-1 rounded", monthTotals.balance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {monthTotals.balance >= 0 ? '+' : ''}{formatCurrency(monthTotals.balance)}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportCalendarCSV(monthTx, cards, currentMonth, currentYear)}>
            <Download size={13} className="mr-1" /> CSV
          </Button>
          <div className="flex items-center gap-1 bg-card border rounded px-2 py-1">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-muted rounded" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium px-3 min-w-[130px] text-center">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-muted rounded" aria-label="Próximo mês"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Card events legend */}
      {cards.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-400" />
            <span>Fechamento do cartão</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-400" />
            <span>Vencimento da fatura</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-card overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayTx = txByDay[day] || [];
                  const dayCardEvents = cardEventsByDay[day] || [];
                  const isToday = isCurrentMonth && today.getDate() === day;
                  const isSelected = selectedDay === day;
                  const hasIncome = dayTx.some(t => t.type === 'income');
                  const hasExpense = dayTx.some(t => t.type === 'expense');
                  const hasInvestment = dayTx.some(t => t.type === 'investment');
                  const hasCardClosing = dayCardEvents.some(e => e.type === 'closing');
                  const hasCardDue = dayCardEvents.some(e => e.type === 'due');
                  const total = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.value : -t.value), 0);
                  const txCount = dayTx.length;
                  const eventCount = dayCardEvents.length;

                  // Tooltip text
                  const tooltipParts = [];
                  tooltipParts.push(`${day} de ${MONTH_NAMES[currentMonth]}`);
                  if (txCount > 0) tooltipParts.push(`${txCount} transação${txCount > 1 ? 'ões' : 'ão'}`);
                  if (hasCardClosing) tooltipParts.push('fechamento de cartão');
                  if (hasCardDue) tooltipParts.push('vencimento de fatura');
                  if (txCount === 0 && eventCount === 0) tooltipParts.push('Sem lançamentos');

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      title={tooltipParts.join(' — ')}
                      className={cn(
                        "relative flex flex-col items-center justify-start p-1 pt-1.5 rounded text-xs transition-all min-h-[60px] sm:min-h-[72px]",
                        isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted",
                        (txCount > 0 || eventCount > 0) && "cursor-pointer"
                      )}
                      aria-label={tooltipParts.join('. ')}
                    >
                      <span className={cn("font-semibold text-sm leading-none mb-1", isToday && !isSelected && "text-primary")}>{day}</span>
                      {(txCount > 0 || eventCount > 0) ? (
                        <>
                          <div className="flex gap-0.5 mb-0.5 flex-wrap justify-center">
                            {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            {hasInvestment && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                            {hasCardClosing && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            {hasCardDue && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                          </div>
                          {txCount > 0 && (
                            <span className={cn(
                              "text-[10px] leading-none font-medium",
                              isSelected ? "text-primary-foreground/80" : total >= 0 ? "text-emerald-600" : "text-red-500"
                            )}>
                              {total >= 0 ? '+' : ''}{formatCurrency(total)}
                            </span>
                          )}
                          {eventCount > 0 && txCount === 0 && (
                            <CreditCard size={10} className={cn(isSelected ? "text-primary-foreground/60" : "text-muted-foreground")} />
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/50 mt-1 hidden sm:block">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day detail panel — desktop only */}
        <div className="hidden lg:block space-y-3">
          {selectedDay ? (
            <Card className="border-0 shadow-card overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedDay} de {MONTH_NAMES[currentMonth]}
                    {selectedDayTx.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        ({selectedDayTx.length} transação{selectedDayTx.length > 1 ? 'ões' : 'ão'})
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleAddOnDay(selectedDay)}>
                      <Plus size={12} className="mr-1" /> Novo
                    </Button>
                    <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-muted rounded text-muted-foreground" aria-label="Fechar">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Card events */}
                {selectedDayCardEvents.length > 0 && (
                  <div className="space-y-1.5">
                    {selectedDayCardEvents.map((evt, i) => (
                      <button
                        key={i}
                        onClick={() => setCardStatementCard(evt.card)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded text-xs border w-full text-left transition-colors hover:opacity-80 cursor-pointer",
                          evt.type === 'closing' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                        )}
                      >
                        <CreditCard size={14} />
                        <div className="flex-1">
                          <span className="font-semibold">{evt.card.name}</span>
                          <span className="ml-1 opacity-70">
                            — {evt.type === 'closing' ? 'Fechamento da fatura' : 'Vencimento da fatura'}
                          </span>
                        </div>
                        {evt.type === 'due' && evt.card.limit > 0 && (
                          <Badge variant="outline" className="text-[10px]">Limite: {formatCurrency(evt.card.limit)}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {selectedDayTx.length === 0 && selectedDayCardEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Nenhum lançamento</p>
                    <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => handleAddOnDay(selectedDay)}>
                      Adicionar
                    </Button>
                  </div>
                ) : selectedDayTx.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50 rounded p-2 text-center">
                        <p className="text-emerald-700 font-semibold">{formatCurrency(selectedDayTotals.income)}</p>
                        <p className="text-emerald-600/70">Receitas</p>
                      </div>
                      <div className="bg-red-50 rounded p-2 text-center">
                        <p className="text-red-700 font-semibold">{formatCurrency(selectedDayTotals.expense)}</p>
                        <p className="text-red-600/70">Despesas</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedDayTx.map(t => {
                        const invoiceLabel = getCardInvoiceLabel(t);
                        return (
                          <div key={t.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded group">
                            <div className={cn(
                              "w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0",
                              t.type === 'income' ? 'bg-emerald-100 text-emerald-700' :
                              t.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'
                            )}>
                              {(t.description || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{t.description}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {t.category ? <><MsIcon name={getCategoryIcon(t.category)} size={12} className="align-middle" /> {t.category}</> : '—'}
                                </span>
                                {t.paymentMethod && (
                                  <span className="text-[10px] text-muted-foreground">• {t.paymentMethod}</span>
                                )}
                                {invoiceLabel && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-semibold">
                                    <MsIcon name="calendar_today" size={12} className="align-middle" /> {invoiceLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-semibold shrink-0",
                              t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                            )}>
                              {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                            </span>
                            {/* Edit / Delete buttons */}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleEditTx(t)}
                                className="p-1 hover:bg-blue-50 rounded text-muted-foreground hover:text-blue-600"
                                aria-label="Editar"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(t.id)}
                                className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600"
                                aria-label="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Calendar size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Clique em um dia para ver os lançamentos</p>
              </CardContent>
            </Card>
          )}

          {/* Month summary */}
          <Card className="border-0 shadow-card overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo do Mês</p>
              <div className="flex justify-between text-sm">
                <span>Receitas</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(monthTotals.income)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Despesas</span>
                <span className="font-semibold text-red-500">{formatCurrency(monthTotals.expense)}</span>
              </div>
              {monthTotals.creditCard > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground ml-2 text-xs">↳ Cartão de Crédito</span>
                  <span className="font-semibold text-amber-600 text-xs">{formatCurrency(monthTotals.creditCard)}</span>
                </div>
              )}
              {monthTotals.investment > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Investimentos</span>
                  <span className="font-semibold text-violet-500">{formatCurrency(monthTotals.investment)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold">Saldo</span>
                <span className={cn("font-bold", monthTotals.balance >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatCurrency(monthTotals.balance)}
                </span>
              </div>

              {/* Upcoming card events */}
              {cards.length > 0 && (() => {
                const remaining = [];
                for (let d = (selectedDay || today.getDate()) + 1; d <= daysInMonth; d++) {
                  const evts = cardEventsByDay[d] || [];
                  evts.forEach(e => remaining.push({ ...e, day: d }));
                  if (remaining.length >= 4) break;
                }
                if (remaining.length === 0) return null;
                return (
                  <div className="border-t pt-2 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próximos Cartões</p>
                    {remaining.map((evt, i) => (
                      <button
                        key={i}
                        onClick={() => setCardStatementCard(evt.card)}
                        className="flex items-center gap-2 text-xs w-full text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                      >
                        <CreditCard size={12} className={evt.type === 'closing' ? 'text-blue-500' : 'text-amber-500'} />
                        <span className="text-muted-foreground">{evt.day}/{String(currentMonth + 1).padStart(2, '0')}</span>
                        <span className="font-medium truncate flex-1">{evt.card.name}</span>
                        <span className={cn("text-[10px]", evt.type === 'closing' ? 'text-blue-600' : 'text-amber-600')}>
                          {evt.type === 'closing' ? 'Fecha' : 'Vence'}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile: Day detail as bottom Sheet */}
      {isMobile && selectedDay && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="px-4 pb-safe rounded-t-2xl max-h-[70dvh]">
            <SheetHeader>
              <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
              <SheetTitle className="text-left">
                {selectedDay
                  ? new Date(currentYear, currentMonth, selectedDay)
                      .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'Detalhes do dia'}
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto mt-3 space-y-2">
              {/* Card events */}
              {selectedDayCardEvents.length > 0 && (
                <div className="space-y-1.5">
                  {selectedDayCardEvents.map((evt, i) => (
                    <button
                      key={i}
                      onClick={() => { setSheetOpen(false); setCardStatementCard(evt.card); }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded text-xs border w-full text-left transition-colors hover:opacity-80 cursor-pointer",
                        evt.type === 'closing' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                      )}
                    >
                      <CreditCard size={14} />
                      <div className="flex-1">
                        <span className="font-semibold">{evt.card.name}</span>
                        <span className="ml-1 opacity-70">
                          — {evt.type === 'closing' ? 'Fechamento da fatura' : 'Vencimento da fatura'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedDayTx.length === 0 && selectedDayCardEvents.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">Nenhum lançamento</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => { setSheetOpen(false); handleAddOnDay(selectedDay); }}>
                    Adicionar
                  </Button>
                </div>
              ) : selectedDayTx.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 rounded p-2 text-center">
                      <p className="text-emerald-700 font-semibold">{formatCurrency(selectedDayTotals.income)}</p>
                      <p className="text-emerald-600/70">Receitas</p>
                    </div>
                    <div className="bg-red-50 rounded p-2 text-center">
                      <p className="text-red-700 font-semibold">{formatCurrency(selectedDayTotals.expense)}</p>
                      <p className="text-red-600/70">Despesas</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedDayTx.map(t => {
                      const invoiceLabel = getCardInvoiceLabel(t);
                      return (
                        <div key={t.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <div className={cn(
                            "w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0",
                            t.type === 'income' ? 'bg-emerald-100 text-emerald-700' :
                            t.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'
                          )}>
                            {(t.description || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{t.description}</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                {t.category ? <><MsIcon name={getCategoryIcon(t.category)} size={12} className="align-middle" /> {t.category}</> : '—'}
                              </span>
                              {invoiceLabel && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-semibold">
                                  <MsIcon name="calendar_today" size={12} className="align-middle" /> {invoiceLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-semibold shrink-0",
                            t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                          )}>
                            {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Transaction Modal (create + edit) */}
      <TransactionModal
        open={showTxModal}
        onClose={() => { setShowTxModal(false); setEditingTx(null); }}
        onSave={handleSaveTx}
        transaction={editingTx}
        goals={goals}
      />

      {/* Card Statement Dialog */}
      <Dialog open={!!cardStatementCard} onOpenChange={() => setCardStatementCard(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} />
              {cardStatementCard?.name} — Fatura
            </DialogTitle>
          </DialogHeader>
          {cardStatementCard && (() => {
            const stmtTxs = getCardStatementTxs(cardStatementCard);
            const stmtTotal = stmtTxs.reduce((s, t) => s + Math.abs(t.value), 0);
            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-muted/50 rounded p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total da fatura</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(stmtTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="text-sm font-semibold">Dia {cardStatementCard.dueDay}</p>
                  </div>
                </div>
                {stmtTxs.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">Sem transações nesta fatura</p>
                ) : (
                  <div className="space-y-1.5">
                    {stmtTxs.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.description}</p>
                          <p className="text-muted-foreground">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {t.category}</p>
                        </div>
                        <span className="font-semibold text-red-500 shrink-0 ml-2">{formatCurrency(t.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
