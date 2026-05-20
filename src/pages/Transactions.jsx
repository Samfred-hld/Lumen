import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, Upload, X, FileSpreadsheet } from 'lucide-react';
import MsIcon from '@/components/ui/ms-icon';
import TransactionModal from '@/components/finance/TransactionModal';
import CSVImport from '@/components/finance/CSVImport';
import InstallmentConfirm from '@/components/finance/InstallmentConfirm';
import { Checkbox } from '@/components/ui/checkbox';
import Pagination from '@/components/ui/pagination';
import { formatCurrency, filterByMonth, calcTotals, getMonthKey } from '@/lib/financeUtils';
import { useTransactionModal } from '@/lib/transactionModalStore';
import { MONTH_NAMES, MONTH_SHORT, getCategories } from '@/lib/categories';
import { getPaymentMethods } from '@/lib/store';
import { filterDuplicatesOnImport } from '@/lib/csvDedup';
import { cn } from '@/lib/utils';
import { addChangelogEntry } from '@/lib/store';
import { toast } from '@/components/ui/use-toast';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useTransactions, useGoals, useCards } from '@/hooks/useData';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

import TransactionRow from '@/components/finance/TransactionRow';
import TransactionInlineForm from '@/components/finance/TransactionInlineForm';
import { KpiCard } from '@/components/dashboard/KpiCard';

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
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterExpType, setFilterExpType] = useState('all'); // all | fixed | variable | installment
  const [filterPM, setFilterPM] = useState('all');
  const [filterValMin, setFilterValMin] = useState('');
  const [filterValMax, setFilterValMax] = useState('');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
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
    return matchType && matchCat && matchExpType && matchPM && matchValMin && matchValMax;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedTx = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterType, filterCat, filterExpType, filterPM, filterValMin, filterValMax, currentMonth, currentYear]);

  // Bug 2C fix: reset sub-filtro de despesa ao mudar para tipo incompatível
  useEffect(() => {
    if (filterType === 'income' || filterType === 'investment') {
      setFilterExpType('all');
    }
  }, [filterType]);

  const handleSave = async (data) => {
    if (editing) {
      await supabase.from('transactions').update(data).eq('id', editing.id);
      addChangelogEntry({ action: 'update', entityType: 'transação', entityName: data.description });
    } else {
      await supabase.from('transactions').insert(data).select().single();
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
    await supabase.from('transactions').delete().eq('id', id);
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
              await supabase.from('transactions').insert(txData).select().single();
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
    await Promise.all(seriesTx.map(tx => supabase.from('transactions').delete().eq('id', tx.id)));
    addChangelogEntry({ action: 'delete', entityType: 'série de parcelas', entityName: `${seriesTx.length} parcelas` });
    refetch();
    toast({ title: 'Série excluída', description: `${seriesTx.length} parcelas removidas` });
  };

  // Selection Logic
  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === paginatedTx.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTx.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.length;
    if (count === 0) return;
    
    if (!window.confirm(`Deseja realmente excluir ${count} transações selecionadas?`)) return;

    try {
      // Usando bulk delete se disponível ou loop
      await Promise.all(selectedIds.map(id => supabase.from('transactions').delete().eq('id', id)));
      
      addChangelogEntry({ action: 'delete', entityType: 'lote de transações', entityName: `${count} registros` });
      toast({ title: `${count} transações excluídas`, description: 'A operação foi concluída com sucesso.' });
      
      setSelectedIds([]);
      refetch();
    } catch (err) {
      toast({ title: 'Erro ao excluir em massa', description: err.message, variant: 'destructive' });
    }
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
          await supabase.from('transactions').insert(batch);
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
    await supabase.from('transactions').insert({
      ...rest,
      date: new Date().toISOString().split('T')[0],
      isInstallment: false,
      installmentCount: null,
      installmentCurrent: null,
      installmentSeriesId: null,
      installmentTotalValue: null,
    }).select().single();
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
    <div className="py-xl space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-on-background">Transações</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Controle todos os seus lançamentos</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowCSVImport(true)} disabled={isImporting} className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg hover:bg-surface-low transition-all text-[11px] font-bold uppercase tracking-widest text-on-surface bg-surface shadow-sm">
              <Upload size={16} /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg hover:bg-surface-low transition-all text-[11px] font-bold uppercase tracking-widest text-on-surface bg-surface shadow-sm">
              <FileSpreadsheet size={16} /> EXCEL
            </button>
            <button onClick={() => { setEditing(null); setShowModal(true); }} className="lg:hidden flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg hover:bg-surface-low transition-all text-[11px] font-bold uppercase tracking-widest text-on-surface bg-surface shadow-sm">
              <Plus size={16} /> NOVA
            </button>
          </div>
          
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-surface-container rounded text-muted-foreground hover:text-on-background transition-colors mr-2"><ChevronLeft size={18} /></button>
            {MONTH_SHORT.map((monthStr, index) => {
              const isActive = index === currentMonth;
              const hasData = monthsWithData && monthsWithData.has ? monthsWithData.has(getMonthKey(currentYear, index)) : false;
              return (
                <button
                  key={index}
                  onClick={() => {
                    const diff = index - currentMonth;
                    if (diff !== 0) navigate(diff);
                  }}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-inverse-surface text-inverse-on-surface shadow-sm" 
                      : "text-muted-foreground hover:text-on-background hover:bg-surface-low"
                  )}
                >
                  {monthStr}
                  {hasData && !isActive && (
                    <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-surface-container rounded text-muted-foreground hover:text-on-background transition-colors ml-2"><ChevronRight size={18} /></button>
            
            <div className="h-4 w-[1px] bg-surface-border mx-2"></div>
            <span className="px-2 font-bold text-[11px] text-on-surface uppercase tracking-widest">{currentYear}</span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="RECEITAS" value={formatCurrency(totals.income)} icon="trending_up" variant="income" />
        <KpiCard label="DESPESAS" value={formatCurrency(totals.expense)} icon="trending_down" variant="expense" />
        <KpiCard label="SALDO EM CONTA" value={formatCurrency(totals.balance)} icon="account_balance_wallet" variant="balance" />
        <KpiCard label="FATURA CARTÃO" value={formatCurrency(totals.creditCard)} icon="credit_card" variant="investment" />
      </section>

      {/* Aviso de transações em outros meses */}
      {otherMonthsCount > 0 && monthTx.length < 3 && otherMonthsCount > monthTx.length && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
          <MsIcon name="calendar_today" size={14} className="font-semibold" />
          <span>
            Nenhuma transação em {MONTH_NAMES[currentMonth]}, mas há <strong>{otherMonthsCount}</strong> transação(ões) em outros meses.
            Use as setas ← → para navegar.
          </span>
        </div>
      )}

      {/* Bento Layout: Form + Filter/List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Novo Lançamento Form (Column Span 3) */}
        <section className="hidden lg:block lg:col-span-3 space-y-6">
          <TransactionInlineForm 
            onSave={handleSave} 
            goals={goals} 
            defaultType={defaultType} 
            transaction={editing}
            onCancel={() => setEditing(null)}
          />
        </section>

        {/* Transaction List & Filters (Column Span 9) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Filters */}
          <div className="bg-surface border border-surface-border p-3 space-y-3">
            {/* Row 1: Type pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setFilterType('all')} 
                className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterType === 'all' ? "bg-inverse-surface text-inverse-on-surface" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
              >TODOS</button>
              <button 
                onClick={() => setFilterType('income')} 
                className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterType === 'income' ? "bg-kpi-income text-white" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
              >RECEITAS</button>
              <button 
                onClick={() => setFilterType('expense')} 
                className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterType === 'expense' ? "bg-kpi-expense text-white" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
              >DESPESAS</button>
              <button 
                onClick={() => setFilterType('investment')} 
                className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterType === 'investment' ? "bg-info text-white" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
              >INVESTIMENTOS</button>
            </div>

            {/* Row 2: Expense sub-type + Category + Payment */}
            <div className="flex flex-wrap items-center gap-2">
              {filterType === 'expense' && (
                <>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setFilterExpType('all')} 
                      className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterExpType === 'all' ? "bg-inverse-surface text-inverse-on-surface" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
                    >TODAS</button>
                    <button 
                      onClick={() => setFilterExpType('fixed')}
                      className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterExpType === 'fixed' ? "bg-inverse-surface text-inverse-on-surface" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
                    >FIXAS</button>
                    <button 
                      onClick={() => setFilterExpType('variable')}
                      className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterExpType === 'variable' ? "bg-inverse-surface text-inverse-on-surface" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
                    >VARIÁVEIS</button>
                    <button 
                      onClick={() => setFilterExpType('installment')}
                      className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors", filterExpType === 'installment' ? "bg-inverse-surface text-inverse-on-surface" : "border border-surface-border text-muted-foreground hover:bg-surface-low")}
                    >PARCELADAS</button>
                  </div>
                  <div className="h-6 w-[1px] bg-surface-border hidden md:block"></div>
                </>
              )}
              
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-surface border border-surface-border text-[11px] font-bold uppercase tracking-wider text-on-surface py-1.5 px-2 rounded-lg outline-none min-w-0">
                <option value="all">Categoria</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterPM} onChange={e => setFilterPM(e.target.value)} className="bg-surface border border-surface-border text-[11px] font-bold uppercase tracking-wider text-on-surface py-1.5 px-2 rounded-lg outline-none min-w-0">
                <option value="all">Pagamento</option>
                {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                {cards.map(c => <option key={`card:${c.id}`} value={`card:${c.id}`}>{c.name}</option>)}
              </select>

              {/* Active filter count + clear */}
              {advFilterCount > 0 && (
                <button onClick={clearAdvFilters} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <X size={12} /> LIMPAR ({advFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* List Container */}
          <div className="bg-surface border border-surface-border">
            {/* Selection Bar / List Header */}
            <div className={cn(
              "flex items-center justify-between px-xs py-2 border-b border-surface-border transition-all",
              selectedIds.length > 0 ? "bg-primary/5" : "bg-surface"
            )}>
              <div className="flex items-center gap-sm">
                <div className="flex items-center px-1">
                  <Checkbox 
                    checked={paginatedTx.length > 0 && selectedIds.length === paginatedTx.length}
                    onCheckedChange={handleToggleAll}
                    className="border-surface-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                {selectedIds.length > 0 ? (
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Transações do Mês
                  </span>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedIds([])} 
                    className="text-[10px] font-bold text-muted-foreground hover:text-on-surface uppercase tracking-wider px-2 py-1 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <MsIcon name="delete" size={14} /> Excluir Seleção
                  </button>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 px-6 text-center flex flex-col items-center justify-center bg-surface-low/50">
                <div className="w-16 h-16 mb-5 rounded-full bg-surface shadow-sm border border-surface-border flex items-center justify-center">
                  <Search size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-1">Nenhuma transação encontrada</h3>
                <p className="text-sm text-muted-foreground max-w-[260px]">Ajuste os filtros de busca ou adicione um novo registro para começar.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {paginatedTx.map((t, i) => (
                    <TransactionRow
                      key={t.id}
                      t={t}
                      index={i}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      isSelected={selectedIds.includes(t.id)}
                      onSelect={handleSelectOne}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-surface-border bg-surface-low flex justify-center">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Modals & Helpers */}
      <TransactionModal
        open={showModal || (editing && window.innerWidth < 1024)} 
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