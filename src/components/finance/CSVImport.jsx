import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, AlertCircle, CreditCard, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { useCards } from '@/hooks/useData';
import { lsGet, lsSet } from '@/lib/store';
import { readFileWithEncoding, parseCSV as parseCSVFull, hasEssentialColumns } from '@/lib/csvParser';
import { enrichWithDedup } from '@/lib/csvDedup';
import { detectBankProfile } from '@/lib/csvProfile';
import ColumnMapper from './ColumnMapper';

// ══════════════════════════════════════════
// Component
// ══════════════════════════════════════════

export default function CSVImport({ open, onClose, onImport, transactions = [], importing = false }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('upload'); // upload | mapping | preview | done
  const [rows, setRows] = useState([]);
  const [selectedCard, setSelectedCard] = useState(() => lsGet('csvImport_lastCard', ''));
  const [importCount, setImportCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importStats, setImportStats] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [parseWarnings, setParseWarnings] = useState([]);
  const [parseStats, setParseStats] = useState(null);
  const [detectedBank, setDetectedBank] = useState(null);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [pendingText, setPendingText] = useState(null); // Store raw text for remapping
  const fileRef = useRef(null);

  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const cats = getCategories();

  // Persist card selection
  const handleCardChange = useCallback((val) => {
    setSelectedCard(val);
    lsSet('csvImport_lastCard', val);
  }, []);

  const processText = useCallback((text, columnMapping = null) => {
    const card = selectedCard && selectedCard !== 'none'
      ? cards.find(c => c.id === selectedCard)
      : null;
    const closingDay = card?.closingDay || null;

    // Auto-detect bank profile from headers
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.replace(/^\uFEFF/, '').split(sep).map(h => h.replace(/^["'\s]+|["'\s]+$/g, ''));

    let profileMapping = null;
    let profileSkipPatterns = [];
    let positiveIsExpense = true; // default: positivo = despesa (Nubank/C6)
    if (!columnMapping) {
      const { key, profile } = detectBankProfile(headers);
      setDetectedBank(key === 'generic' ? null : { key, name: profile.name });
      profileSkipPatterns = profile.skipPatterns || [];
      positiveIsExpense = profile.positiveIsExpense ?? true;

      if (key !== 'generic') {
        // Use profile for column mapping
        profileMapping = {};
        if (profile.dateIdx >= 0) profileMapping.dateIdx = profile.dateIdx;
        if (profile.descIdx >= 0) profileMapping.descIdx = profile.descIdx;
        if (profile.valIdx >= 0) profileMapping.valIdx = profile.valIdx;
        if (profile.hasSplitColumns) {
          profileMapping.creditIdx = profile.creditIdx;
          profileMapping.debitIdx = profile.debitIdx;
          profileMapping.valIdx = -1; // força hasSplitColumns no parseCSV
        }
      }
    } else {
      setDetectedBank(null);
    }

    const result = parseCSVFull(text, {
      cardClosingDay: closingDay,
      existingTransactions: transactions,
      columnMapping: columnMapping || profileMapping,
      skipPatterns: columnMapping ? [] : profileSkipPatterns,
      positiveIsExpense: columnMapping ? true : positiveIsExpense,
    });

    // Handle errors
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      setParseWarnings([]);
      setParseStats(null);
      return;
    }

    setParseErrors([]);
    setParseWarnings(result.warnings);
    setParseStats(result.stats);

    // Enrich with duplicate detection
    const selectedCardId = selectedCard && selectedCard !== 'none' ? selectedCard : null;
    const enriched = enrichWithDedup(result.rows, transactions, selectedCardId);

    if (enriched.length === 0) {
      setParseErrors(['Nenhuma transação válida encontrada no CSV. Verifique o formato do arquivo.']);
      return;
    }

    setRows(enriched);
    setStep('preview');
  }, [selectedCard, cards, transactions]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    // Exigir seleção de cartão — sem cartão, invoiceMonth e cardId nunca são preenchidos
    if (!selectedCard || selectedCard === 'none') {
      setParseErrors(['Selecione um cartão de crédito antes de importar. Sem cartão, as transações não serão associadas a um ciclo de fatura.']);
      return;
    }

    setParseErrors([]);
    setParseWarnings([]);

    try {
      const { text, encoding } = await readFileWithEncoding(file);

      // Store text for potential remapping
      setPendingText(text);

      // Quick check: can we find essential columns? (uses same logic as full parser)
      const firstLine = text.split(/\r?\n/)[0] || '';
      const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
      const rawHeaders = firstLine.replace(/^\uFEFF/, '').split(sep).map(h => h.replace(/^["'\s]+|["'\s]+$/g, ''));

      if (!hasEssentialColumns(rawHeaders)) {
        // Can't auto-detect — show manual mapping
        setPendingText(text);
        setShowManualMapping(true);
        setStep('mapping');
        return;
      }

      processText(text);
    } catch (err) {
      setParseErrors([`Erro ao ler arquivo: ${err.message || 'Formato desconhecido'}`]);
    }
  }, [processText, selectedCard]);

  const handleManualMapping = useCallback((mapping) => {
    setShowManualMapping(false);
    if (pendingText) {
      processText(pendingText, mapping);
    }
  }, [pendingText, processText]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const toggleRow = (idx) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (r._duplicate || r._duplicateSeries) return r;
      return { ...r, selected: !r.selected };
    }));
  };

  const toggleAll = () => {
    setRows(prev => {
      const selectable = prev.filter(r => !r._duplicate && !r._duplicateSeries);
      const allSelected = selectable.every(r => r.selected);
      return prev.map(r => {
        if (r._duplicate || r._duplicateSeries) return r;
        return { ...r, selected: !allSelected };
      });
    });
  };

  const updateCategory = (idx, cat) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, category: cat } : r));
  };

  const handleImport = async () => {
    const selected = rows.filter(r => r.selected);
    const card = selectedCard && selectedCard !== 'none' ? cards.find(c => c.id === selectedCard) : null;
    const paymentMethod = card ? `Crédito - ${card.name}` : 'Crédito';

    // Gerar um seriesId único por série de parcelas (mesmo cleanTitle + mesmo installmentTotal)
    const seriesIdMap = new Map();
    for (const r of selected) {
      if (r.txType === 'installment') {
        const key = `${r.cleanTitle}::${r.installmentTotal}`;
        if (!seriesIdMap.has(key)) {
          seriesIdMap.set(key, Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
        }
      }
    }

    const transactionsToCreate = [];

    for (const r of selected) {
      if (r.txType === 'installment') {
        // Each row is already a single installment from the expanded series
        const seriesKey = `${r.cleanTitle}::${r.installmentTotal}`;
        transactionsToCreate.push({
          description: `${r.cleanTitle} (${r.installmentIndex}/${r.installmentTotal})`,
          date: r.date,
          invoiceMonth: r.invoiceMonth,
          value: r.value,
          type: 'expense',
          category: r.category || 'Outros',
          paymentMethod,
          cardId: selectedCard && selectedCard !== 'none' ? selectedCard : null,
          isFixed: false,
          isInstallment: true,
          installmentCount: r.installmentTotal,
          installmentCurrent: r.installmentIndex,
          installmentTotalValue: r.value * r.installmentTotal,
          installmentSeriesId: seriesIdMap.get(seriesKey),
        });
      } else {
        const txEntityType = (r.txType === 'income' || r.txType === 'refund') ? 'income' : 'expense';
        transactionsToCreate.push({
          description: r.description,
          date: r.date,
          invoiceMonth: r.invoiceMonth,
          value: r.value,
          type: txEntityType,
          category: r.category || 'Outros',
          paymentMethod,
          cardId: selectedCard && selectedCard !== 'none' ? selectedCard : null,
          isFixed: false,
          isInstallment: false,
        });
      }
    }

    // Stats
    const normalCount = selected.filter(r => r.txType === 'normal' || r.txType === 'income' || r.txType === 'refund').length;
    const installmentRows = selected.filter(r => r.txType === 'installment');
    const seriesCountStats = new Set(installmentRows.map(r => r.cleanTitle)).size;
    const totalValueImported = transactionsToCreate.reduce((s, t) => s + (t.value || 0), 0);

    setIsImportingLocal(true);
    setProgress({ current: 0, total: transactionsToCreate.length });

    let imported = 0;
    try {
      await onImport(transactionsToCreate, (current) => {
        setProgress({ current, total: transactionsToCreate.length });
      });
      imported = transactionsToCreate.length;
    } catch {
      // Partial import handled by parent
    }

    setIsImportingLocal(false);
    setImportCount(imported);
    setImportStats({
      normal: normalCount,
      series: seriesCountStats,
      parcels: installmentRows.length,
      totalValue: totalValueImported,
    });
    setStep('done');

    setRows(prev => prev.map(r => ({ ...r, _imported: r.selected })));
  };

  const reset = () => {
    setStep('upload');
    setRows([]);
    setImportCount(0);
    setProgress({ current: 0, total: 0 });
    setImportStats(null);
    setIsImportingLocal(false);
    setParseErrors([]);
    setParseWarnings([]);
    setParseStats(null);
    setDetectedBank(null);
    setShowManualMapping(false);
    setPendingText(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Computed values ──
  const selectableRows = rows.filter(r => !r._duplicate && !r._duplicateSeries);
  const selectedCount = selectableRows.filter(r => r.selected).length;
  const totalValue = rows.filter(r => r.selected).reduce((s, r) => s + r.value, 0);
  const dupeCount = rows.filter(r => r._duplicate).length;
  const seriesDupeCount = rows.filter(r => r._duplicateSeries).length;
  const suspectCount = rows.filter(r => r._duplicateSuspect).length;
  const instCount = rows.filter(r => r.txType === 'installment').length;
  const refundCount = rows.filter(r => r.txType === 'refund' || r.txType === 'income').length;
  const missingCount = rows.filter(r => r._missingInstallments?.length > 0).length;

  // Group structure — only recalculates when txType/cleanTitle change (file load)
  const groupStructure = React.useMemo(() => {
    const groups = [];
    let i = 0;
    while (i < rows.length) {
      const r = rows[i];
      if (r.txType === 'installment') {
        const seriesTitle = r.cleanTitle;
        const indices = [];
        while (i < rows.length && rows[i].txType === 'installment' && rows[i].cleanTitle === seriesTitle) {
          indices.push(i);
          i++;
        }
        groups.push({ type: 'installment_series', title: seriesTitle, indices });
      } else {
        groups.push({ type: 'single', index: i });
        i++;
      }
    }
    return groups;
  }, [rows.length, rows.map(r => r.cleanTitle + r.txType).join('|')]);

  // Grouped rows — combines stable structure with volatile row state
  const groupedRows = React.useMemo(() => {
    return groupStructure.map(g => {
      if (g.type === 'installment_series') {
        const items = g.indices.map(i => ({ row: rows[i], globalIdx: i }));
        return {
          ...g,
          items,
          totalValue: items.reduce((s, it) => s + it.row.value, 0),
          selectedCount: items.filter(it => it.row.selected).length,
          dupeCount: items.filter(it => it.row._duplicateSeries || it.row._duplicate).length,
          perValue: items[0]?.row.value,
          total: items[0]?.row.installmentTotal,
        };
      }
      return { ...g, item: { row: rows[g.index], globalIdx: g.index } };
    });
  }, [rows, groupStructure]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            Importar Fatura de Cartão (CSV)
            {detectedBank && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {detectedBank.name} detectado
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {cardsLoading ? (
              <div className="flex items-center gap-2 bg-muted/50 rounded px-3 py-2 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" />
                <span>Carregando cartões...</span>
              </div>
            ) : cards.length > 0 ? (
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CreditCard size={14} /> Cartão de Crédito
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Selecione o cartão ANTES de fazer upload — isso ajusta as transações para o ciclo de fatura correto.
                </p>
                <Select value={selectedCard} onValueChange={handleCardChange}>
                  <SelectTrigger className="mt-1" disabled={cardsLoading}>
                    <SelectValue placeholder={cardsLoading ? "Carregando cartões..." : "Selecione o cartão"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum cartão</SelectItem>
                    {cards.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-3 rounded" style={{ background: c.color }} />
                          {c.name}
                          <span className="text-muted-foreground text-[10px]">fecha dia {c.closingDay}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {cards.length > 0 && (!selectedCard || selectedCard === 'none') && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                <AlertCircle size={13} />
                <span>
                  <strong>Obrigatório:</strong> Selecione um cartão de crédito antes de fazer upload.
                  Sem cartão, o mês da fatura (invoiceMonth) e o vínculo com o cartão (cardId) não serão preenchidos.
                </span>
              </div>
            )}

            <div
              className={cn(
                "border-2 border-dashed rounded p-10 text-center transition-colors",
                cardsLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={e => { if (!cardsLoading) { e.preventDefault(); setDragOver(true); } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { if (!cardsLoading) handleDrop(e); }}
              onClick={() => { if (!cardsLoading) fileRef.current?.click(); }}
            >
              <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-sm">{cardsLoading ? 'Aguarde, carregando cartões...' : 'Arraste o arquivo CSV aqui'}</p>
              <p className="text-xs text-muted-foreground mt-1">{cardsLoading ? '' : 'ou clique para selecionar'}</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" disabled={cardsLoading} onChange={e => handleFile(e.target.files?.[0])} />
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                {parseErrors.map((err, i) => (
                  <p key={i} className="flex items-start gap-1.5">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground">
              <p className="font-semibold mb-1">💡 Formato esperado:</p>
              <p>Colunas: <strong>Data</strong>, <strong>Descrição/Title</strong>, <strong>Valor/Amount</strong></p>
              <p>Formatos aceitos: DD/MM/AAAA, AAAA-MM-DD, MM/DD/AAAA</p>
              <p>Separadores: vírgula (,), ponto e vírgula (;) ou TAB</p>
              <p>Bancos detectados: Nubank, Inter, Bradesco, Itaú, C6 Bank, XP</p>
              <p className="mt-1 text-red-600 font-semibold">⚠️ Selecione um cartão de crédito antes do upload — obrigatório para calcular o mês da fatura.</p>
            </div>
          </div>
        )}

        {/* ── Step: Manual Mapping ── */}
        {step === 'mapping' && (
          <div className="space-y-3">
            {pendingText && (() => {
              const firstLine = pendingText.split(/\r?\n/)[0] || '';
              const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
              const headers = firstLine.replace(/^\uFEFF/, '').split(sep).map(h => h.replace(/^["'\s]+|["'\s]+$/g, ''));
              return (
                <ColumnMapper
                  headers={headers}
                  onApply={handleManualMapping}
                  onCancel={() => { reset(); }}
                />
              );
            })()}
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-3 overflow-hidden flex flex-col flex-1">
            {/* Parse stats */}
            {parseStats && (
              <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                <span>📊 {parseStats.parsed}/{parseStats.totalRawRows} linhas</span>
                <span>• Sep: {parseStats.separator}</span>
                <span>• Data: {parseStats.dateDetected}</span>
                {parseStats.skippedDupe > 0 && <span>• {parseStats.skippedDupe} dup internas</span>}
              </div>
            )}

            {/* Warnings */}
            {parseWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-[11px] text-amber-700">
                {parseWarnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
              </div>
            )}

            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{selectedCount} selecionadas</Badge>
              <Badge variant="destructive">{formatCurrency(totalValue)} total</Badge>
              {dupeCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1">
                  <AlertCircle size={10} /> {dupeCount} duplicada(s)
                </Badge>
              )}
              {seriesDupeCount > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 gap-1">
                  <Layers size={10} /> {seriesDupeCount} parcela(s) já importada(s)
                </Badge>
              )}
              {suspectCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                  <AlertTriangle size={10} /> {suspectCount} possível(is)
                </Badge>
              )}
              {missingCount > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 gap-1">
                  <AlertTriangle size={10} /> {missingCount} série(s) com parcela(s) anterior(es) faltando
                </Badge>
              )}
              {instCount > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
                  <Layers size={10} /> {instCount} parcela(s)
                </Badge>
              )}
              {refundCount > 0 && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  ↩ {refundCount} estorno(s)/receita(s)
                </Badge>
              )}
              <Button size="sm" variant="ghost" className="ml-auto text-xs h-7" onClick={toggleAll}>
                Inverter seleção
              </Button>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                  <tr>
                    <th className="p-2 text-left w-8">✓</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Fatura</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-left">Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group, gi) => {
                    if (group.type === 'installment_series') {
                      // Render installment series with header
                      return (
                        <React.Fragment key={`series-${gi}`}>
                          {/* Series header row */}
                          <tr className="border-t-2 border-blue-200 bg-blue-50/50">
                            <td colSpan={7} className="p-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-blue-600" />
                                <span className="font-bold text-blue-700">
                                  {group.title}
                                </span>
                                <span className="text-muted-foreground">
                                  — {group.total} parcelas × {formatCurrency(group.perValue)} = {formatCurrency(group.totalValue)} total
                                </span>
                                {group.dupeCount > 0 && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">
                                    {group.dupeCount} já importada(s)
                                  </Badge>
                                )}
                                <span className="ml-auto text-muted-foreground">
                                  {group.selectedCount}/{group.total} selecionadas
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* Individual installment rows */}
                          {group.items.map(({ row: r, globalIdx: i }) => {
                            const isDisabled = r._duplicate || r._duplicateSeries;
                            const label = r._seriesLabel;
                            let labelBadge = null;
                            if (label === 'retroativa') {
                              labelBadge = <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">retroativa</span>;
                            } else if (label === 'esta_fatura') {
                              labelBadge = <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">★ esta fatura</span>;
                            } else if (label === 'futura') {
                              labelBadge = <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">futura</span>;
                            }

                            return (
                              <tr
                                key={i}
                                className={cn(
                                  "border-t transition-colors",
                                  isDisabled ? 'bg-red-50/30 opacity-50' : 'hover:bg-muted/30 cursor-pointer',
                                  label === 'esta_fatura' && !isDisabled && 'bg-blue-50/30'
                                )}
                                onClick={() => !isDisabled && toggleRow(i)}
                              >
                                <td className="p-2 pl-6">
                                  <input
                                    type="checkbox"
                                    checked={r.selected}
                                    disabled={isDisabled}
                                    onChange={() => !isDisabled && toggleRow(i)}
                                    className="w-3.5 h-3.5 accent-primary"
                                  />
                                </td>
                                <td className="p-2 whitespace-nowrap text-xs">
                                  {r.date?.split('-').reverse().join('/')}
                                </td>
                                <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                                  {r.invoiceMonth ? r.invoiceMonth.split('-').reverse().join('/') : '—'}
                                </td>
                                <td className="p-2 max-w-[200px] truncate text-xs">
                                  <span className="text-muted-foreground">{r.installmentIndex}/{r.installmentTotal}</span>
                                  {' '}{r.cleanTitle}
                                </td>
                                <td className="p-2">
                                  {labelBadge}
                                  {r._duplicate && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 ml-1">
                                      <AlertCircle size={9} /> Duplicada
                                    </span>
                                  )}
                                  {r._duplicateSeries && !r._duplicate && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 ml-1">
                                      Já existe
                                    </span>
                                  )}
                                </td>
                                <td className={cn("p-2 text-right font-semibold tabular-nums text-red-500")}>
                                  -{formatCurrency(r.value)}
                                </td>
                                <td className="p-2" onClick={e => e.stopPropagation()}>
                                  <Select value={r.category} onValueChange={v => updateCategory(i, v)}>
                                    <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0 w-auto">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cats.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    }

                    // Single (non-installment) row
                    const { row: r, globalIdx: i } = group.item;
                    const isDisabled = r._duplicate || r._duplicateSeries;

                    let rowBg = '';
                    if (r._duplicate) rowBg = 'bg-red-50/50';
                    else if (r._duplicateSeries) rowBg = 'bg-purple-50/50';
                    else if (r._duplicateSuspect) rowBg = 'bg-yellow-50/50';
                    else if (r.txType === 'refund' || r.txType === 'income') rowBg = 'bg-emerald-50/50';
                    else if (r._missingInstallments?.length > 0) rowBg = 'bg-orange-50/30';

                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-t transition-colors",
                          rowBg,
                          !isDisabled && "cursor-pointer hover:bg-muted/30",
                          isDisabled && "opacity-50"
                        )}
                        onClick={() => !isDisabled && toggleRow(i)}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            disabled={isDisabled}
                            onChange={() => !isDisabled && toggleRow(i)}
                            className="w-3.5 h-3.5 accent-primary"
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap text-xs">
                          {r._dateWarning && <span title={r._dateWarningReason || 'Data fora do intervalo esperado'}>⚠️ </span>}
                          {r.date?.split('-').reverse().join('/')}
                        </td>
                        <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                          {r.invoiceMonth
                            ? r.invoiceMonth.split('-').reverse().join('/')
                            : '—'
                          }
                        </td>
                        <td className="p-2 max-w-[200px] truncate text-xs">{r.description}</td>
                        <td className="p-2">
                          {r._duplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                              <AlertCircle size={9} /> Duplicada
                            </span>
                          )}
                          {r._duplicateSeries && !r._duplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Parcela já importada
                            </span>
                          )}
                          {r._duplicateSuspect && !r._duplicate && !r._duplicateSeries && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                              <AlertTriangle size={9} /> Possível duplicata
                            </span>
                          )}
                          {r._missingInstallments?.length > 0 && !r._duplicate && !r._duplicateSeries && (
                            <span
                              title={`Parcelas anteriores faltando: ${r._missingInstallments.join(', ')}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300"
                            >
                              <AlertTriangle size={9} /> Faltam: {r._missingInstallments.join(', ')}
                            </span>
                          )}
                          {r.txType === 'refund' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              ↩ Estorno
                            </span>
                          )}
                          {r.txType === 'income' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Crédito
                            </span>
                          )}
                          {r.txType === 'normal' && !r._duplicate && !r._zeroValue && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Simples
                            </span>
                          )}
                          {r._zeroValue && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              Valor zero
                            </span>
                          )}
                        </td>
                        <td className={cn("p-2 text-right font-semibold tabular-nums",
                          r.txType === 'income' || r.txType === 'refund' ? 'text-emerald-600' : 'text-red-500')}>
                          {r.txType === 'income' || r.txType === 'refund' ? '+' : '-'}{formatCurrency(r.value)}
                        </td>
                        <td className="p-2" onClick={e => e.stopPropagation()}>
                          <Select value={r.category} onValueChange={v => updateCategory(i, v)}>
                            <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0 w-auto">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {cats.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info banners */}
            {missingCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-xs text-orange-700">
                <p className="font-semibold">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Atenção: {missingCount} série(s) de parcelas possuem parcelas anteriores não importadas.
                  As parcelas faltantes estão listadas em cada linha. Você pode prosseguir —
                  as parcelas anteriores poderão ser importadas de faturas passadas.
                </p>
              </div>
            )}

            {seriesDupeCount > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2 text-xs text-purple-700">
                <p className="font-semibold">
                  <Layers size={12} className="inline mr-1" />
                  {seriesDupeCount} parcela(s) já existem no sistema e foram desmarcadas.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={isImportingLocal}>Voltar</Button>
              <Button className="flex-1" onClick={handleImport} disabled={selectedCount === 0 || importing || isImportingLocal}>
                {isImportingLocal ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    {progress.total > 20 ? `Importando ${progress.current}/${progress.total}...` : 'Importando...'}
                  </>
                ) : (
                  <>
                    Importar {selectedCount} transações
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{importCount} transações importadas!</p>
              {importStats && (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {importStats.normal > 0 && (
                    <p>• {importStats.normal} transação(ões) simples</p>
                  )}
                  {importStats.series > 0 && (
                    <p>• {importStats.series} série(s) de parcelas ({importStats.parcels} parcela(s) importada(s))</p>
                  )}
                  <p className="font-semibold text-foreground mt-2">
                    Total: {formatCurrency(importStats.totalValue)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Fechar</Button>
              <Button className="flex-1" onClick={() => {
                handleClose();
                // Navigate to the invoice month of imported transactions
                const monthCounts = {};
                rows.filter(r => r._imported && r.invoiceMonth).forEach(r => {
                  monthCounts[r.invoiceMonth] = (monthCounts[r.invoiceMonth] || 0) + 1;
                });
                const bestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
                if (bestMonth) {
                  const [y, m] = bestMonth[0].split('-');
                  navigate(`/transactions?month=${parseInt(m)}&year=${y}`);
                } else {
                  // Fallback: use purchase date
                  const dateCounts = {};
                  rows.filter(r => r._imported).forEach(r => {
                    if (r.date) {
                      const ym = r.date.slice(0, 7);
                      dateCounts[ym] = (dateCounts[ym] || 0) + 1;
                    }
                  });
                  const fallback = Object.entries(dateCounts).sort((a, b) => b[1] - a[1])[0];
                  if (fallback) {
                    const [y, m] = fallback[0].split('-');
                    navigate(`/transactions?month=${parseInt(m)}&year=${y}`);
                  }
                }
              }}>
                Ver transações importadas
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}