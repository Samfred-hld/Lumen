import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, AlertCircle, X, CreditCard, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { getCards, suggestCategoryFromRules } from '@/lib/store';
import { detectInstallment, isRefundOrPayment } from '@/lib/transactionDetectors';
import { normalizeStr } from '@/lib/stringUtils';
import { parseAmount, parseAmountWithSign } from '@/lib/amountParser';
import { base44 } from '@/api/base44Client';

// ══════════════════════════════════════════
// Date Utilities
// ══════════════════════════════════════════

/**
 * Determine the invoice month (YYYY-MM) for a transaction date based on the card's closing day.
 * - If the transaction day > closingDay → next month's invoice
 * - Otherwise → current month's invoice
 * Returns 'YYYY-MM' string.
 */
function getInvoiceMonth(dateStr, closingDay) {
  if (!closingDay || !dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = parseInt(d);
  const closeDay = parseInt(closingDay);

  if (day > closeDay) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Add months to an ISO date string (YYYY-MM-DD).
 */
function addMonthsISO(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// ══════════════════════════════════════════
// Categorization
// ══════════════════════════════════════════

/**
 * Auto-categorize using rules + historical transactions.
 */
function autoCategorize(description, existingTransactions = []) {
  const suggested = suggestCategoryFromRules(description);
  if (suggested) return suggested;

  const descNorm = normalizeStr(description);
  const similar = existingTransactions.filter(t => {
    const tNorm = normalizeStr(t.description || '');
    return tNorm === descNorm || tNorm.includes(descNorm) || descNorm.includes(tNorm);
  });

  if (similar.length) {
    const freq = {};
    similar.forEach(t => { if (t.category) freq[t.category] = (freq[t.category] || 0) + 1; });
    const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }

  return '';
}

// ══════════════════════════════════════════
// Duplicate Detection Helpers
// ══════════════════════════════════════════

/**
 * Build an index of existing installment transactions for fast lookup.
 * Returns Map<cleanTitle_norm, Set<installmentCurrent>>.
 */
function buildInstallmentIndex(transactions) {
  const index = new Map();
  for (const t of transactions) {
    if (!t.isInstallment) continue;
    const base = normalizeStr(
      (t.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
    );
    if (!index.has(base)) index.set(base, new Set());
    index.get(base).add(t.installmentCurrent);
  }
  return index;
}

/**
 * Check if a transaction already exists (exact match).
 */
function findExactDuplicate(row, transactions, selectedCardId) {
  const descNorm = normalizeStr(
    row.txType === 'installment' ? row.cleanTitle : row.description
  );

  for (const t of transactions) {
    // Different card → skip
    if (t.cardId && selectedCardId && t.cardId !== selectedCardId) continue;

    const tDescNorm = normalizeStr(
      t.isInstallment
        ? (t.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
        : (t.description || '')
    );

    if (tDescNorm !== descNorm) continue;
    if (Math.round(Math.abs(t.value || 0) * 100) !== Math.round(row.value * 100)) continue;

    // For installments, also match the installment index
    if (row.txType === 'installment' && t.isInstallment) {
      if (t.installmentCurrent !== row.installmentIndex) continue;
    }

    // Exact date match
    if (t.date === row.date) return true;

    // For installments, match by invoiceMonth if available
    if (row.txType === 'installment' && t.invoiceMonth && row.invoiceMonth) {
      if (t.invoiceMonth === row.invoiceMonth) return true;
    }
  }
  return false;
}

/**
 * Find a fuzzy duplicate (±3 days, same description + value).
 */
function findSuspectDuplicate(row, transactions, selectedCardId) {
  const descNorm = normalizeStr(
    row.txType === 'installment' ? row.cleanTitle : row.description
  );

  for (const t of transactions) {
    if (t.cardId && selectedCardId && t.cardId !== selectedCardId) continue;

    const tDescNorm = normalizeStr(
      t.isInstallment
        ? (t.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
        : (t.description || '')
    );

    if (tDescNorm !== descNorm) continue;
    if (Math.round(Math.abs(t.value || 0) * 100) !== Math.round(row.value * 100)) continue;

    // For installments, skip if different index
    if (row.txType === 'installment' && t.isInstallment) {
      if (t.installmentCurrent !== row.installmentIndex) continue;
    }

    // Fuzzy date: ±3 days
    if (t.date && row.date) {
      const tTime = new Date(t.date + 'T12:00:00').getTime();
      const rTime = new Date(row.date + 'T12:00:00').getTime();
      const diffDays = Math.abs(tTime - rTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) return true;
    }
  }
  return false;
}

/**
 * Check if an installment already exists in the system by cleanTitle + index.
 */
function isInstallmentAlreadyImported(row, installmentIndex) {
  const base = normalizeStr(row.cleanTitle);
  const indices = installmentIndex.get(base);
  if (!indices) return false;
  return indices.has(row.installmentIndex);
}

/**
 * Find which installments of a series are missing before the current one.
 */
function findMissingInstallments(row, installmentIndex) {
  if (row.txType !== 'installment') return [];
  const base = normalizeStr(row.cleanTitle);
  const indices = installmentIndex.get(base);
  if (!indices) {
    // No existing installments → all before current are missing
    const missing = [];
    for (let i = 1; i < row.installmentIndex; i++) missing.push(i);
    return missing;
  }
  const missing = [];
  for (let i = 1; i < row.installmentIndex; i++) {
    if (!indices.has(i)) missing.push(i);
  }
  return missing;
}

// ══════════════════════════════════════════
// CSV Parsing
// ══════════════════════════════════════════

function parseCSV(text, cardClosingDay = null, existingTransactions = []) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  let sep = ',';
  if (lines[0].includes('\t')) sep = '\t';
  else if (lines[0].includes(';')) sep = ';';

  // Strip BOM and quotes from headers
  const rawHeaders = lines[0].replace(/^\uFEFF/, '').split(sep)
    .map(h => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());

  const dateIdx = rawHeaders.findIndex(h => /^(data|date|dt|fecha)/.test(h));
  const descIdx = rawHeaders.findIndex(h => /descri|hist|memo|detail|lança|establ|comercio|title|name/.test(h));
  const valIdx = rawHeaders.findIndex(h => /^(valor|value|amount|vl|importe|total|debit)/.test(h));

  // Credit/Debit separate columns (Bradesco, Itaú)
  const creditIdx = rawHeaders.findIndex(h => /crédito|credit|entrada/.test(h));
  const debitIdx = rawHeaders.findIndex(h => /débito|debit|saída|saida/.test(h));
  const hasSplitColumns = creditIdx !== -1 && debitIdx !== -1 && valIdx === -1;

  // Validate required columns
  if (descIdx === -1 && valIdx === -1) {
    return { error: 'Colunas obrigatórias não encontradas. Verifique se o CSV tem colunas de Descrição e Valor.' };
  }

  const rows = [];
  const seenInternally = new Set();

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const cells = [];
    let cell = '', inQ = false;
    const line = lines[i] + sep;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j + 1] === '"') {
          cell += '"';
          j++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === sep && !inQ) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }

    if (cells.length < 2) continue;
    const date = (dateIdx >= 0 ? cells[dateIdx] : cells[0]) || '';
    const desc = (descIdx >= 0 ? cells[descIdx] : cells[1]) || '';
    if (!desc.trim()) continue;

    // Skip total/saldo/subtotal lines
    if (/^(total|saldo|subtotal|balance|sub\s*total|fechamento)/i.test(desc.trim())) continue;

    // Extract value from split columns or single column
    let rawV;
    if (hasSplitColumns) {
      const debitRaw = (debitIdx >= 0 ? cells[debitIdx] : '') || '';
      const creditRaw = (creditIdx >= 0 ? cells[creditIdx] : '') || '';
      const debitVal = parseAmount(debitRaw);
      const creditVal = parseAmount(creditRaw);
      rawV = String(debitVal - creditVal);
    } else {
      rawV = (valIdx >= 0 ? cells[valIdx] : cells[2]) || '';
    }

    // Parse value with sign detection
    const { value: absValue, isNegative: isNegativeInSource } = parseAmountWithSign(rawV);

    // Skip lines with zero value unless explicitly "0" or "0,00"
    const isExplicitZero = /^\s*0([.,]0+)?\s*$/.test(rawV.replace(/[^\d.,]/g, ''));
    if (absValue === 0 && !isExplicitZero) continue;

    // Skip duplicate header rows
    const dateCell = (dateIdx >= 0 ? cells[dateIdx] : cells[0]) || '';
    if (/^(data|date|dt|fecha)/i.test(dateCell.trim())) continue;

    // Date normalization
    let isoDate = '';
    const cleanDate = date.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
      const [d, m, y] = cleanDate.split('/');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
      isoDate = cleanDate.slice(0, 10);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(cleanDate)) {
      const [d, m, y] = cleanDate.split('-');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(cleanDate)) {
      const [d, m, y] = cleanDate.split('/');
      const fullYear = parseInt(y) > 30 ? `19${y}` : `20${y}`;
      isoDate = `${fullYear}-${m}-${d}`;
    } else {
      isoDate = new Date().toISOString().split('T')[0];
    }

    // Validate date
    const testDate = new Date(isoDate + 'T12:00:00');
    if (isNaN(testDate.getTime())) {
      isoDate = new Date().toISOString().split('T')[0];
    }

    // Date range warning
    let dateWarning = false;
    const finalDateObj = new Date(isoDate + 'T12:00:00');
    const limitFuture = new Date();
    limitFuture.setFullYear(limitFuture.getFullYear() + 1);
    if (finalDateObj < new Date('2000-01-01T12:00:00') || finalDateObj > limitFuture) {
      dateWarning = true;
    }

    // Internal duplicate detection (within same CSV)
    const dupeKey = `${isoDate}|${normalizeStr(desc)}|${Math.round(absValue * 100)}`;
    if (seenInternally.has(dupeKey)) continue;
    seenInternally.add(dupeKey);

    // Detect transaction type
    let txType = isNegativeInSource ? 'income' : 'normal';
    let installmentIndex = null;
    let installmentTotal = null;
    let cleanTitle = desc;

    const descLower = desc.toLowerCase();
    if (!isNegativeInSource && isRefundOrPayment(desc, absValue)) {
      txType = 'refund';
    } else if (!isNegativeInSource) {
      const inst = detectInstallment(desc);
      if (inst) {
        txType = 'installment';
        installmentIndex = inst.index;
        installmentTotal = inst.total;
        cleanTitle = inst.cleanTitle;
      }
    }

    // Auto-categorize
    const category = autoCategorize(desc, existingTransactions);

    // Invoice month: determine which billing cycle this belongs to
    const invoiceMonth = getInvoiceMonth(isoDate, cardClosingDay);

    rows.push({
      date: isoDate,           // Original purchase date (preserved)
      invoiceMonth,            // 'YYYY-MM' for billing cycle (null if no card)
      description: desc,
      cleanTitle,
      value: absValue,
      category,
      selected: true,
      _dateWarning: dateWarning,
      _zeroValue: absValue === 0 && isExplicitZero,
      txType,
      installmentIndex,
      installmentTotal,
      _duplicate: false,
      _duplicateSeries: false,
      _duplicateSuspect: false,
      _missingInstallments: [], // indices of installments missing before this one
    });
  }
  return rows;
}

// ══════════════════════════════════════════
// Component
// ══════════════════════════════════════════

export default function CSVImport({ open, onClose, onImport, transactions = [], importing = false }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [rows, setRows] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [importCount, setImportCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importStats, setImportStats] = useState(null);
  const fileRef = useRef(null);

  const cards = getCards();
  const cats = getCategories();

  const handleFile = (file) => {
    if (!file) return;

    const processText = (text) => {
      const card = selectedCard && selectedCard !== 'none'
        ? cards.find(c => c.id === selectedCard)
        : null;
      const closingDay = card?.closingDay || null;
      const parsed = parseCSV(text, closingDay, transactions);

      if (parsed && parsed.error) {
        alert(parsed.error);
        return;
      }

      // Build installment index for fast lookup
      const installmentIdx = buildInstallmentIndex(transactions);

      // Enrich with duplicate detection
      const selectedCardId = selectedCard && selectedCard !== 'none' ? selectedCard : null;

      const enriched = parsed.map(row => {
        const isDupe = findExactDuplicate(row, transactions, selectedCardId);
        const isSuspect = !isDupe && findSuspectDuplicate(row, transactions, selectedCardId);

        // For installments: check if this specific installment already exists
        let isSeriesDuplicate = false;
        let missingInstallments = [];
        if (row.txType === 'installment') {
          isSeriesDuplicate = isInstallmentAlreadyImported(row, installmentIdx);
          missingInstallments = findMissingInstallments(row, installmentIdx);
        }

        return {
          ...row,
          _duplicate: isDupe,
          _duplicateSeries: isSeriesDuplicate,
          _duplicateSuspect: !isDupe && !isSeriesDuplicate && isSuspect,
          _missingInstallments: missingInstallments,
        };
      });

      // Determine selection: duplicates disabled, installments with issues get warnings
      const withSelection = enriched.map((row) => {
        // Exact duplicate or already imported → disabled
        if (row._duplicate || row._duplicateSeries) return { ...row, selected: false };

        // Refund/income → selected by default
        if (row.txType === 'refund' || row.txType === 'income') return { ...row, selected: true };

        // Installment with missing predecessors → selected but with warning
        if (row.txType === 'installment') {
          return { ...row, selected: true };
        }

        return { ...row, selected: true };
      });

      setRows(withSelection);
      setStep('preview');
    };

    // Encoding fallback: UTF-8 first, then ISO-8859-1
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        if (text.includes('\uFFFD')) {
          const reader2 = new FileReader();
          reader2.onload = (e2) => {
            try {
              processText(e2.target.result);
            } catch {
              alert('Erro ao processar arquivo. Verifique o formato CSV.');
            }
          };
          reader2.readAsText(file, 'ISO-8859-1');
          return;
        }
        processText(text);
      } catch {
        alert('Erro ao processar arquivo. Verifique o formato CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

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

    const transactionsToCreate = [];

    for (const r of selected) {
      if (r.txType === 'installment') {
        // Only create the single installment from the CSV row.
        // Future installments will be imported from future CSVs.
        const totalValue = r.value * r.installmentTotal; // best estimate

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
          installmentTotalValue: totalValue,
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
    setSelectedCard('');
    setImportCount(0);
    setProgress({ current: 0, total: 0 });
    setImportStats(null);
    setIsImportingLocal(false);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            Importar Fatura de Cartão (CSV)
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {cards.length > 0 && (
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CreditCard size={14} /> Cartão de Crédito
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Selecione o cartão ANTES de fazer upload — isso ajusta as transações para o ciclo de fatura correto.
                </p>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o cartão" />
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
            )}

            {cards.length > 0 && (!selectedCard || selectedCard === 'none') && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={13} />
                <span>
                  Sem cartão selecionado, as transações não serão associadas a um ciclo de fatura.
                </span>
              </div>
            )}

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-sm">Arraste o arquivo CSV aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </div>

            <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground">
              <p className="font-semibold mb-1">💡 Formato esperado:</p>
              <p>Colunas: <strong>Data</strong>, <strong>Descrição/Title</strong>, <strong>Valor/Amount</strong></p>
              <p>Formatos de data aceitos: DD/MM/AAAA ou AAAA-MM-DD</p>
              <p>Separadores: vírgula (,), ponto e vírgula (;) ou TAB</p>
              <p className="mt-1 text-amber-600">⚠️ Valores positivos = despesas (fatura de cartão). Negativos = receitas/estornos.</p>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-3 overflow-hidden flex flex-col flex-1">
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
            <div className="flex-1 overflow-y-auto border rounded-lg">
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
                  {rows.map((r, i) => {
                    const isDisabled = r._duplicate || r._duplicateSeries;

                    let rowBg = '';
                    if (r._duplicate) rowBg = 'bg-red-50/50 dark:bg-red-950/20';
                    else if (r._duplicateSeries) rowBg = 'bg-purple-50/50 dark:bg-purple-950/20';
                    else if (r._duplicateSuspect) rowBg = 'bg-yellow-50/50 dark:bg-yellow-950/20';
                    else if (r.txType === 'refund' || r.txType === 'income') rowBg = 'bg-emerald-50/50 dark:bg-emerald-950/20';
                    else if (r._missingInstallments?.length > 0) rowBg = 'bg-orange-50/30 dark:bg-orange-950/10';

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
                          {r._dateWarning && <span title="Data fora do intervalo esperado">⚠️ </span>}
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
                          {r.txType === 'installment' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200">
                              <Layers size={9} /> {r.installmentIndex}/{r.installmentTotal}
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
              <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-xs text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300">
                <p className="font-semibold">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Atenção: {missingCount} série(s) de parcelas possuem parcelas anteriores não importadas.
                  As parcelas faltantes estão listadas em cada linha. Você pode prosseguir —
                  as parcelas anteriores poderão ser importadas de faturas passadas.
                </p>
              </div>
            )}

            {seriesDupeCount > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2 text-xs text-purple-700 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300">
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
