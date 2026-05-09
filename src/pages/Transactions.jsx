import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, Upload, SlidersHorizontal, X, Repeat, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import TransactionModal from '@/components/finance/TransactionModal';
import CSVImport from '@/components/finance/CSVImport';
import QuickEntry from '@/components/finance/QuickEntry';
import SuggestionBanner from '@/components/finance/SuggestionBanner';
import InstallmentConfirm from '@/components/finance/InstallmentConfirm';
import Pagination from '@/components/ui/pagination';
import SwipeToDelete from '@/components/ui/swipe-to-delete';
import { formatCurrency, formatDate, filterByMonth, calcTotals, getTypeBg, getMonthKey, todayISO, formatSmartDate, isToday } from '@/lib/financeUtils';
import { useTransactionModal } from '@/lib/transactionModalStore';
import { MONTH_NAMES, MONTH_SHORT, getCategories } from '@/lib/categories';
import { getPaymentMethods } from '@/lib/store';
import { getCategoryIcon, getCategoryColor } from '@/lib/categories';
import { filterDuplicatesOnImport } from '@/lib/csvDedup';
import { cn } from '@/lib/utils';
import { addChangelogEntry } from '@/lib/store';
import { toast } from '@/components/ui/use-toast';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useTransactions, useGoals, useCards } from '@/hooks/useData';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

// Accent color per type
const TYPE_ACCENT = {
  income: 'border-l-emerald-500',
  expense: 'border-l-red-500',
  investment: 'border-l-violet-500',
};

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const paramMonth = searchParams.get('month');
  const paramYear = searchParams.get('year');
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation(
    paramMonth ? parseInt(paramMonth) - 1 : undefined,
    paramYear ? parseInt(paramYear) : undefined
  );
  const [showModal, setShowModal] = useState(false);
  const [defaultType, setDefaultType] = useState('expense');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterExpType, setFilterExpType] = useState('all'); // all | fixed | variable | installment
  const [filterPM, setFilterPM] = useState('all');
  const [filterValMin, setFilterValMin] = useState('');
  const [filterValMax, setFilterValMax] = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const categories = getCategories();
  const paymentMethods = getPaymentMethods();

  const importingRef = useRef(false);
  const qc = useQueryClient();
  const { data: transactions = [], refetch } = useTransactions(2000, importingRef);
  const { data: goals = [] } = useGoals();
  const { data: cards = [] } = useCards();

  const monthTx = filterByMonth(transactions, currentYear, currentMonth);
  const totals = calcTotals(monthTx);

  // Meses com transações (para indicador visual)
  const monthsWithData = React.useMemo(() => {
    const set = new Set();
    transactions.forEach(t => {
      const key = t.invoiceMonth || (t.date ? t.date.slice(0, 7) : null);
      if (key) set.add(key);
    });
    return set;
  }, [transactions]);

  // Transações fora do mês atual (aviso)
  const currentMonthKey = getMonthKey(currentYear, currentMonth);
  const otherMonthsCount = transactions.length - transactions.filter(t =>
    t.invoiceMonth ? t.invoiceMonth === currentMonthKey : t.date?.startsWith(currentMonthKey)
  ).length;

  const filtered = monthTx.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    const matchCat = filterCat === 'all' || t.category === filterCat;
    // Sub-filtros de despesa (só aplicáveis a expenses)
    // Bug 2A fix: trata isInstallment/isFixed undefined como false
    const isInstallment = t.isInstallment === true;
    const isFixed = t.isFixed === true;
    let matchExpType = true;
    if (filterExpType !== 'all' && t.type === 'expense') {
      if (filterExpType === 'fixed') matchExpType = isFixed;
      else if (filterExpType === 'variable') matchExpType = !isFixed && !isInstallment;
      else if (filterExpType === 'installment') matchExpType = isInstallment;
    } else if (filterExpType !== 'all' && t.type !== 'expense') {
      // Bug 2B fix: sub-filtros de despesa não excluem outros tipos quando filterType='all'
      matchExpType = true;
    }
    // Payment method filter
    let matchPM = true;
    if (filterPM !== 'all') {
      if (filterPM.startsWith('card:')) {
        const cardId = filterPM.replace('card:', '');
        matchPM = t.cardId === cardId;
      } else {
        matchPM = t.paymentMethod === filterPM;
      }
    }
    // Value range filter
    const absVal = Math.abs(t.value || 0);
    const matchValMin = !filterValMin || absVal >= parseFloat(filterValMin);
    const matchValMax = !filterValMax || absVal <= parseFloat(filterValMax);
    return matchSearch && matchType && matchCat && matchExpType && matchPM && matchValMin && matchValMax;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedTx = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterType, filterCat, filterExpType, filterPM, filterValMin, filterValMax, currentMonth, currentYear]);

  // Bug 2C fix: reset sub-filtro de despesa ao mudar para tipo incompatível
  useEffect(() => {
    if (filterType === 'income' || filterType === 'investment') {
      setFilterExpType('all');
    }
  }, [filterType]);

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.Transaction.update(editing.id, data);
      addChangelogEntry({ action: 'update', entityType: 'transação', entityName: data.description });
    } else {
      await base44.entities.Transaction.create(data);
      addChangelogEntry({ action: 'create', entityType: 'transação', entityName: data.description });
    }
    refetch();
    setShowModal(false);
    setEditing(null);
  };

  // Count active advanced filters
  const advFilterCount = (filterCat !== 'all' ? 1 : 0) + (filterExpType !== 'all' ? 1 : 0) + (filterPM !== 'all' ? 1 : 0) + (filterValMin ? 1 : 0) + (filterValMax ? 1 : 0);

  const clearAdvFilters = () => {
    setFilterCat('all');
    setFilterExpType('all');
    setFilterPM('all');
    setFilterValMin('');
    setFilterValMax('');
  };

  const handleDelete = async (id) => {
    const tx = transactions.find(t => t.id === id);
    if (tx?.isInstallment && tx?.installmentSeriesId) {
      setConfirmDelete(tx);
      return;
    }
    await deleteSingle(id);
  };

  const deleteSingle = async (id) => {
    const tx = transactions.find(t => t.id === id);
    await base44.entities.Transaction.delete(id);
    addChangelogEntry({ action: 'delete', entityType: 'transação', entityName: tx?.description });
    refetch();
    if (tx) {
      const { id: _id, createdAt, ...txData } = tx;
      toast({
        title: 'Transação excluída',
        description: tx.description,
        action: (
          <button
            onClick={async () => {
              await base44.entities.Transaction.create(txData);
              addChangelogEntry({ action: 'create', entityType: 'transação', entityName: `(desfeita) ${tx.description}` });
              refetch();
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
          >
            Desfazer
          </button>
        ),
      });
    }
  };

  const deleteSeries = async (seriesId) => {
    const seriesTx = transactions.filter(t => t.installmentSeriesId === seriesId);
    await Promise.all(seriesTx.map(tx => base44.entities.Transaction.delete(tx.id)));
    addChangelogEntry({ action: 'delete', entityType: 'série de parcelas', entityName: `${seriesTx.length} parcelas` });
    refetch();
    toast({ title: 'Série excluída', description: `${seriesTx.length} parcelas removidas` });
  };

  const handleCSVImport = async (txList, onProgress) => {
    if (isImporting) return;
    setIsImporting(true);
    importingRef.current = true; // Pausa subscribe durante importação em lote
    try {
      // 10A — Validação: rejeita itens sem campos obrigatórios
      const valid = txList.filter(tx =>
        tx.description?.trim() &&
        tx.date &&
        typeof tx.value === 'number' &&
        tx.value >= 0 &&
        tx.type
      );

      if (valid.length === 0) {
        toast({ title: 'Nenhuma transação válida para importar', variant: 'destructive' });
        return;
      }

      // Dedup unified — uses csvDedup module (single source of truth)
      const { deduped, skipped } = filterDuplicatesOnImport(valid, transactions);
      if (skipped > 0) {
        toast({ title: `${skipped} transação(ões) ignorada(s)`, description: 'Já existiam no sistema.' });
      }

      if (deduped.length === 0) {
        toast({ title: 'Nenhuma transação nova para importar' });
        return;
      }

      // Gap 4 — Lotes internos com callback de progresso
      const BATCH_SIZE = 20;
      let imported = 0;
      try {
        for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
          const batch = deduped.slice(i, i + BATCH_SIZE);
          await base44.entities.Transaction.bulkCreate(batch);
          imported += batch.length;
          onProgress?.(imported);
        }
      } catch (err) {
        importingRef.current = false;
        await new Promise(resolve => setTimeout(resolve, 800));
        await refetch();
        toast({
          title: 'Importação pode estar incompleta',
          description: 'Houve um erro durante o envio. Verifique as transações importadas e reimporte se necessário.',
          variant: 'destructive',
        });
        return;
      }

      addChangelogEntry({ action: 'create', entityType: 'lote CSV', entityName: `${imported} transações` });

      // Atualiza cache otimisticamente para exibição imediata
      qc.setQueryData(['transactions'], (old = []) => {
        const existingIds = new Set(old.map(t => t.id).filter(Boolean));
        const newOnes = deduped.filter(t => !t.id || !existingIds.has(t.id));
        return [...newOnes, ...old].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      });

      // Refetch em background para sincronizar IDs reais do banco
      await new Promise(resolve => setTimeout(resolve, 400));
      importingRef.current = false; // Reativa subscribe
      refetch(); // sem await — atualiza em background
      setShowCSVImport(false);
    } catch (err) {
      importingRef.current = false;
      toast({ title: 'Erro ao importar CSV', description: err?.message || 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      importingRef.current = false;
    }
  };

  const handleEdit = (t) => {
    setEditing(t);
    setShowModal(true);
  };

  const handleDuplicate = async (t) => {
    const { id, createdAt, ...rest } = t;
    await base44.entities.Transaction.create({
      ...rest,
      date: new Date().toISOString().split('T')[0],
      isInstallment: false,
      installmentCount: null,
      installmentCurrent: null,
      installmentSeriesId: null,
      installmentTotalValue: null,
    });
    addChangelogEntry({ action: 'create', entityType: 'transação', entityName: `(duplicada) ${t.description}` });
    refetch();
  };

  // Listen for global keyboard shortcut to open new transaction modal
  useEffect(() => {
    const unsub = useTransactionModal.subscribe(({ isOpen, defaultType }) => {
      if (isOpen) {
        setEditing(null);
        setDefaultType(defaultType);
        setShowModal(true);
      }
    });
    return unsub;
  }, []);

  const TYPE_LABEL = { income: 'Receita', expense: 'Despesa', investment: 'Investimento', all: 'Todos' };

  const handleExportExcel = () => {
    const rows = filtered.map(t => ({
      'Data': t.date ? t.date.split('-').reverse().join('/') : '',
      'Descrição': t.description || '',
      'Categoria': t.category || '',
      'Tipo': t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento',
      'Valor': t.value || 0,
      'Cartão': t.cardId ? (cards.find(c => c.id === t.cardId)?.name || '') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');
    const monthKey = getMonthKey(currentYear, currentMonth);
    XLSX.writeFile(wb, `lumen-transacoes-${monthKey}.xlsx`);
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Controle todos os seus lançamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border rounded px-2 py-1">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-muted rounded" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium px-2 min-w-[110px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-muted rounded" aria-label="Próximo mês"><ChevronRight size={14} /></button>
            {/* Indicador de meses com dados */}
            <div className="flex gap-0.5 ml-1" title={`Dados em ${monthsWithData.size} mês(es)`}>
              {Array.from(monthsWithData).sort().slice(-6).map(ym => {
                const [y, m] = ym.split('-');
                const isCurrent = ym === currentMonthKey;
                return (
                  <button
                    key={ym}
                    onClick={() => {
                      const targetMonth = parseInt(m) - 1;
                      const targetYear = parseInt(y);
                      // Navega até o mês alvo
                      const diff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
                      if (diff !== 0) navigate(diff);
                    }}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      isCurrent ? "bg-primary scale-125" : "bg-primary/30 hover:bg-primary/60"
                    )}
                    title={`${MONTH_SHORT[parseInt(m) - 1]} ${y}`}
                  />
                );
              })}
              {monthsWithData.size > 6 && (
                <span className="text-[8px] text-muted-foreground ml-0.5">+{monthsWithData.size - 6}</span>
              )}
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={14} className="mr-1" /> Novo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCSVImport(true)} disabled={isImporting}>
            <Upload size={14} className="mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} className="mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        <span className="px-3.5 py-2 rounded gradient-emerald text-emerald-700 text-sm font-semibold shadow-card tabular-nums border border-emerald-200/50">
          ↑ Receitas: {formatCurrency(totals.income)}
        </span>
        <span className="px-3.5 py-2 rounded gradient-red text-red-600 text-sm font-semibold shadow-card tabular-nums border border-red-200/50">
          ↓ Despesas: {formatCurrency(totals.expense)}
        </span>
        <span className="px-3.5 py-2 rounded gradient-violet text-violet-600 text-sm font-semibold shadow-card tabular-nums border border-violet-200/50">
          ◆ Investido: {formatCurrency(totals.investment)}
        </span>
      </div>

      {/* Aviso de transações em outros meses */}
      {otherMonthsCount > 0 && monthTx.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
          <span className="font-semibold">📅</span>
          <span>
            Nenhuma transação em {MONTH_NAMES[currentMonth]}, mas há <strong>{otherMonthsCount}</strong> transação(ões) em outros meses.
            Use as setas ← → para navegar.
          </span>
        </div>
      )}

      {/* Suggestion Banner */}
      <SuggestionBanner
        currentMonth={currentMonth}
        currentYear={currentYear}
        transactions={transactions}
        onCreateTransaction={handleSave}
      />

      {/* Quick Entry */}
      <QuickEntry onSave={handleSave} />

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9"
              data-shortcut-search
              aria-label="Buscar transações"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="investment">Investimentos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={advFilterCount > 0 ? "default" : "outline"}
            size="sm"
            className={cn("h-9 gap-1.5", advFilterCount > 0 && "bg-primary")}
            onClick={() => setShowAdvFilters(!showAdvFilters)}
          >
            <SlidersHorizontal size={14} />
            Filtros
            {advFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-white/20">
                {advFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Expense sub-filters (only when type=expense or all) */}
        {filterType !== 'income' && filterType !== 'investment' && (
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: 'all', label: 'Todas', icon: null },
              { value: 'fixed', label: 'Fixas', icon: null },
              { value: 'variable', label: 'Variáveis', icon: null },
              { value: 'installment', label: 'Parceladas', icon: null },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterExpType(filterExpType === opt.value ? 'all' : opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition-all border",
                  filterExpType === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showAdvFilters && (
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Payment Method */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pagamento</label>
                  <Select value={filterPM} onValueChange={setFilterPM}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {paymentMethods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      {cards.length > 0 && cards.map(c => (
                        <SelectItem key={`card:${c.id}`} value={`card:${c.id}`}>
                          💳 {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Value Range */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Valor (R$)</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Mín"
                      value={filterValMin}
                      onChange={e => setFilterValMin(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Máx"
                      value={filterValMax}
                      onChange={e => setFilterValMax(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
              {advFilterCount > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {filterCat !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                        {getCategoryIcon(filterCat)} {filterCat}
                        <button onClick={() => setFilterCat('all')} className="hover:text-destructive" aria-label="Limpar filtro de categoria"><X size={10} /></button>
                      </span>
                    )}
                    {filterPM !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold">
                        {filterPM.startsWith('card:') ? '💳 ' : ''}{filterPM.startsWith('card:') ? cards.find(c => c.id === filterPM.replace('card:', ''))?.name : filterPM}
                        <button onClick={() => setFilterPM('all')} className="hover:text-destructive" aria-label="Limpar filtro de pagamento"><X size={10} /></button>
                      </span>
                    )}
                    {filterValMin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
                        ≥ {formatCurrency(parseFloat(filterValMin))}
                        <button onClick={() => setFilterValMin('')} className="hover:text-destructive" aria-label="Limpar filtro de valor mínimo"><X size={10} /></button>
                      </span>
                    )}
                    {filterValMax && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
                        ≤ {formatCurrency(parseFloat(filterValMax))}
                        <button onClick={() => setFilterValMax('')} className="hover:text-destructive" aria-label="Limpar filtro de valor máximo"><X size={10} /></button>
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={clearAdvFilters}>
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction list */}
      <Card className="border-0 shadow-card overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded bg-muted/50 flex items-center justify-center">
                <Search size={24} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar os filtros ou adicione uma nova transação</p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-border/60">
              {paginatedTx.map((t, i) => (
                <SwipeToDelete key={t.id} onDelete={() => handleDelete(t.id)} className="lg:hidden">
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-all duration-150 border-l-[3px]",
                    TYPE_ACCENT[t.type] || 'border-l-gray-300'
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold truncate">{t.description}</p>
                        {t.isFixed && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                            <Repeat size={9} /> Fixas
                          </span>
                        )}
                        {t.isInstallment && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200/50">
                            {t.installmentCurrent}/{t.installmentCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {isToday(t.date) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span>{formatSmartDate(t.date)}</span>
                        </div>
                        {t.category && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${getCategoryColor(t.category)}18`,
                              color: getCategoryColor(t.category),
                            }}
                          >
                            {getCategoryIcon(t.category)} {t.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={cn("text-sm font-bold tabular-nums",
                        t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600')}>
                        {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                      </span>
                      {(t.isFixed || t.isInstallment) && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {t.isFixed ? 'Recorrente' : 'Parcelado'}
                        </span>
                      )}
                    </div>
                  </div>
                </SwipeToDelete>
              ))}
              {/* Desktop: full rows */}
              {paginatedTx.map((t, i) => (
                <div
                  key={`desktop-${t.id}`}
                  className={cn(
                    "hidden lg:flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-all duration-150 group animate-fade-in border-l-[3px]",
                    TYPE_ACCENT[t.type] || 'border-l-gray-300'
                  )}
                  style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{t.description}</p>
                      {t.isFixed && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                          <Repeat size={9} /> Fixas
                        </span>
                      )}
                      {t.isInstallment && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200/50">
                          {t.installmentCurrent}/{t.installmentCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {isToday(t.date) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                        <span>{formatSmartDate(t.date)}</span>
                      </div>
                      {t.category && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${getCategoryColor(t.category)}18`,
                            color: getCategoryColor(t.category),
                          }}
                        >
                          {getCategoryIcon(t.category)} {t.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{t.paymentMethod || '—'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-bold tabular-nums",
                      t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                    )}>
                      {t.type !== 'income' ? '-' : '+'}{formatCurrency(t.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {t.isFixed ? 'Recorrente' : t.isInstallment ? 'Parcelado' : t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Investimento'}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button onClick={() => handleDuplicate(t)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Duplicar">
                      <Copy size={13} />
                    </button>
                    <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Editar">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600" aria-label="Excluir">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-border/40">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
        transaction={editing}
        defaultType={defaultType}
        goals={goals}
      />

      <CSVImport
        open={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onImport={handleCSVImport}
        transactions={transactions}
        importing={isImporting}
      />

      <InstallmentConfirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirmSingle={() => confirmDelete && deleteSingle(confirmDelete.id)}
        onConfirmAll={() => confirmDelete && deleteSeries(confirmDelete.installmentSeriesId)}
        transaction={confirmDelete}
      />
    </div>
  );
}