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
import { base44 } from '@/api/base44Client';

/**
 * Calcula o mês da fatura com base no dia de fechamento.
 */
function getInvoiceMonth(dateStr, closingDay) {
  if (!closingDay || !dateStr) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = parseInt(d);
  const closeDay = parseInt(closingDay);

  if (day > closeDay) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  }
  return dateStr;
}

/**
 * Adiciona meses a uma data ISO (YYYY-MM-DD)
 */
function addMonthsISO(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Auto-categorize using rules + historical transactions
 */
function autoCategorize(description, existingTransactions = []) {
  // 1. Tenta regras do usuário (mantém comportamento atual)
  const suggested = suggestCategoryFromRules(description);
  if (suggested) return suggested;

  // 2. Usa as transações recebidas como prop (fonte de verdade)
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

  // 11.2 — Credit/Debit separate columns (Bradesco, Itaú)
  const creditIdx = rawHeaders.findIndex(h => /crédito|credit|entrada/.test(h));
  const debitIdx = rawHeaders.findIndex(h => /débito|debit|saída|saida/.test(h));
  const hasSplitColumns = creditIdx !== -1 && debitIdx !== -1 && valIdx === -1;

  // 7A — Validate required columns
  if (descIdx === -1 && valIdx === -1) {
    return { error: 'Colunas obrigatórias não encontradas. Verifique se o CSV tem colunas de Descrição e Valor.' };
  }

  const rows = [];
  const seenInternally = new Set();

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const cells = [];
    let cell = '', inQ = false;
    for (const ch of lines[i] + sep) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cells.push(cell.trim()); cell = ''; }
      else { cell += ch; }
    }

    if (cells.length < 2) continue;
    const date = (dateIdx >= 0 ? cells[dateIdx] : cells[0]) || '';
    const desc = (descIdx >= 0 ? cells[descIdx] : cells[1]) || '';
    if (!desc.trim()) continue;

    // 11.3 — Skip total/saldo/subtotal/balance lines
    if (/^(total|saldo|subtotal|balance|sub\s*total|fechamento)/i.test(desc.trim())) continue;

    // 11.2 — Extract value from split columns or single column
    let rawV;
    if (hasSplitColumns) {
      const debitRaw = (debitIdx >= 0 ? cells[debitIdx] : '') || '';
      const creditRaw = (creditIdx >= 0 ? cells[creditIdx] : '') || '';
      // Parse each separately, then compute debit - credit
      const debitVal = (function parseAmountSimple(raw) {
        const s = raw.replace(/[^\d.,\-\(\)]/g, '').trim();
        if (!s || s === '-') return 0;
        const isNeg = /^\(.*\)$/.test(s);
        const clean = s.replace(/[()]/g, '');
        const hasDot = clean.includes('.'), hasComma = clean.includes(',');
        let num;
        if (hasDot && hasComma) {
          num = clean.lastIndexOf(',') > clean.lastIndexOf('.')
            ? clean.replace(/\./g, '').replace(',', '.')
            : clean.replace(/,/g, '');
        } else if (hasComma && !hasDot) {
          const after = clean.split(',').pop() || '';
          num = after.length === 2 ? clean.replace(',', '.') : clean.replace(',', '');
        } else { num = clean; }
        const result = Math.abs(parseFloat(num)) || 0;
        return isNeg ? -result : result;
      })(debitRaw);
      const creditVal = (function parseAmountSimple(raw) {
        const s = raw.replace(/[^\d.,\-\(\)]/g, '').trim();
        if (!s || s === '-') return 0;
        const isNeg = /^\(.*\)$/.test(s);
        const clean = s.replace(/[()]/g, '');
        const hasDot = clean.includes('.'), hasComma = clean.includes(',');
        let num;
        if (hasDot && hasComma) {
          num = clean.lastIndexOf(',') > clean.lastIndexOf('.')
            ? clean.replace(/\./g, '').replace(',', '.')
            : clean.replace(/,/g, '');
        } else if (hasComma && !hasDot) {
          const after = clean.split(',').pop() || '';
          num = after.length === 2 ? clean.replace(',', '.') : clean.replace(',', '');
        } else { num = clean; }
        const result = Math.abs(parseFloat(num)) || 0;
        return isNeg ? -result : result;
      })(creditRaw);
      // Format as string so parseAmount below can handle it
      rawV = String(debitVal - creditVal);
    } else {
      rawV = (valIdx >= 0 ? cells[valIdx] : cells[2]) || '';
    }

    // 7C — Smart amount parsing (Brazilian + US + accounting formats)
    const value = (function parseAmount(raw) {
      const s = raw.replace(/[^\d.,\-\(\)]/g, '').trim();
      if (!s || s === '-') return 0;

      // Formato contábil: (1.234,56) = negativo
      const isAccountingNegative = /^\(.*\)$/.test(s);
      const clean = s.replace(/[()]/g, '');

      const hasDot = clean.includes('.');
      const hasComma = clean.includes(',');
      const lastDot = clean.lastIndexOf('.');
      const lastComma = clean.lastIndexOf(',');

      let num;
      if (hasDot && hasComma) {
        // Quem vem por último é o separador decimal
        num = lastComma > lastDot
          ? clean.replace(/\./g, '').replace(',', '.') // BR: 1.234,56
          : clean.replace(/,/g, ''); // US: 1,234.56
      } else if (hasComma && !hasDot) {
        // Se depois da vírgula tiver exatamente 2 dígitos → decimal (padrão BR)
        // Se tiver 3 dígitos → milhar (ex: 1,234 americano)
        const afterComma = clean.split(',').pop() || '';
        num = afterComma.length === 2
          ? clean.replace(',', '.')
          : clean.replace(',', '');
      } else {
        num = clean;
      }

      const result = Math.abs(parseFloat(num)) || 0;
      return isAccountingNegative ? -result : result;
    })(rawV);

    // 11.1 — Preserve source sign for type detection
    const isNegativeInSource = value < 0;
    const absValue = Math.abs(value);

    // 7B — Skip lines with zero value unless explicitly "0" or "0,00" in CSV
    const isExplicitZero = /^\s*0([.,]0+)?\s*$/.test(rawV.replace(/[^\d.,]/g, ''));
    if (absValue === 0 && !isExplicitZero) continue;

    // 11.5 — Skip duplicate header rows (date cell is not a valid date)
    const dateCell = (dateIdx >= 0 ? cells[dateIdx] : cells[0]) || '';
    if (/^(data|date|dt|fecha)/i.test(dateCell.trim())) continue;

    // Date normalization
    let isoDate = '';
    const clean = date.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('/');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      isoDate = clean.slice(0, 10);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('-');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(clean)) {
      const [d, m, y] = clean.split('/');
      const fullYear = parseInt(y) > 30 ? `19${y}` : `20${y}`; // heurística: >30 = século XX
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

    // 8B — Internal duplicate detection (within same CSV) — normalized
    const dupeKey = `${isoDate}|${normalizeStr(desc)}|${Math.round(absValue * 100)}`;
    if (seenInternally.has(dupeKey)) continue;
    seenInternally.add(dupeKey);

    // 11.1 — Detect transaction type (consider source sign)
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

    // Adjust date for invoice month
    let finalDate = isoDate;
    let dateAdjusted = false;
    if (cardClosingDay) {
      finalDate = getInvoiceMonth(isoDate, cardClosingDay);
      dateAdjusted = finalDate !== isoDate;
    }

    rows.push({
      date: finalDate,
      description: desc,
      cleanTitle,
      value: absValue,
      category,
      selected: true,
      _dateWarning: dateWarning,
      _dateAdjusted: dateAdjusted,
      _zeroValue: absValue === 0 && isExplicitZero,
      txType,
      installmentIndex,
      installmentTotal,
      _duplicate: false, // will be set later
      _duplicateSeries: false, // will be set later
      _duplicateSuspect: false, // will be set later
    });
  }
  return rows;
}

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

      // 7A — Check for parsing error
      if (parsed && parsed.error) {
        alert(parsed.error);
        return;
      }

      // 8A+8B — Duplicate detection: compare with existing transactions (normalized + cardId-aware)
      const enriched = parsed.map(row => {
        const selectedCardId = selectedCard && selectedCard !== 'none' ? selectedCard : null;
        let isDupe = false;
        let isSuspect = false;
        let isSeriesDuplicate = false;

        // Para installments, compara pelo cleanTitle (sem sufixo N/M);
        // para outros tipos, compara pela descrição exata
        const descToCompare = row.txType === 'installment'
          ? normalizeStr(row.cleanTitle)
          : normalizeStr(row.description);

        for (const t of transactions) {
          // Se ambos têm cardId definido e são diferentes, NÃO é duplicata
          const differentCard = t.cardId && selectedCardId && t.cardId !== selectedCardId;
          if (differentCard) continue;

          // Para transações existentes que são parcelas, remove sufixo (N/M) para comparar
          const tDescNorm = normalizeStr(
            t.isInstallment
              ? (t.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
              : (t.description || '')
          );
          const matchDesc = tDescNorm === descToCompare;
          const matchValue = Math.round(Math.abs(t.value || 0) * 100) === Math.round(row.value * 100);
          if (!matchDesc || !matchValue) continue;

          const matchDate = t.date === row.date;
          if (matchDate) {
            isDupe = true;
            break;
          }

          // Fuzzy date: ±3 dias → suspeita (não bloqueia, mas destaca)
          if (t.date && row.date) {
            const tTime = new Date(t.date + 'T12:00:00').getTime();
            const rTime = new Date(row.date + 'T12:00:00').getTime();
            const diffDays = Math.abs(tTime - rTime) / (1000 * 60 * 60 * 24);
            if (diffDays <= 3) {
              isSuspect = true;
            }
          }
        }

        // Verificação adicional: se é installment e já existe série com mesmo cleanTitle no banco
        if (row.txType === 'installment' && !isDupe) {
          const baseNorm = normalizeStr(row.cleanTitle);
          isSeriesDuplicate = transactions.some(t => {
            if (!t.isInstallment) return false;
            const tBase = normalizeStr(
              (t.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
            );
            return tBase === baseNorm &&
              Math.round(Math.abs(t.value || 0) * 100) === Math.round(row.value * 100);
          });
        }

        return {
          ...row,
          _duplicate: isDupe,
          _duplicateSeries: isSeriesDuplicate,
          _duplicateSuspect: !isDupe && !isSeriesDuplicate && isSuspect,
        };
      });

      // Group installments by cleanTitle to find series
      const seriesMap = {};
      enriched.forEach((row, idx) => {
        if (row.txType === 'installment' && !row._duplicate) {
          const key = row.cleanTitle.toLowerCase();
          if (!seriesMap[key] || row.installmentIndex < seriesMap[key].firstIndex) {
            seriesMap[key] = { firstIdx: idx, firstIndex: row.installmentIndex, total: row.installmentTotal };
          }
        }
      });

      const withSelection = enriched.map((row, idx) => {
        if (row._duplicate || row._duplicateSeries) return { ...row, selected: false };
        if (row.txType === 'refund') return { ...row, selected: true }; // estornos são receitas reais — selecionados por padrão
        if (row.txType === 'installment') {
          const key = row.cleanTitle.toLowerCase();
          const isFirst = seriesMap[key]?.firstIdx === idx;
          return { ...row, selected: isFirst };
        }
        return { ...row, selected: true };
      });

      setRows(withSelection);
      setStep('preview');
    };

    // 11.4 — Encoding fallback: UTF-8 first, then ISO-8859-1 if replacement chars detected
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Check for Unicode replacement character (U+FFFD)
        if (text.includes('\uFFFD')) {
          // Retry with ISO-8859-1
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
      // Don't allow toggling disabled rows (duplicatas, séries duplicadas e parcelas não-trigger)
      if (r._duplicate || r._duplicateSeries) return r;
      // For installments, only allow toggling the "trigger" row (first of series in CSV)
      if (r.txType === 'installment') {
        const key = r.cleanTitle.toLowerCase();
        const isFirst = prev.filter(x => x.txType === 'installment' && x.cleanTitle.toLowerCase() === key)
          .sort((a, b) => a.installmentIndex - b.installmentIndex)[0]?.installmentIndex === r.installmentIndex;
        if (!isFirst) return r;
      }
      return { ...r, selected: !r.selected };
    }));
  };

  const toggleAll = () => {
    setRows(prev => {
      const selectable = prev.filter(r => {
        if (r._duplicate || r._duplicateSeries) return false; // duplicatas e séries já existentes bloqueiam
        if (r.txType === 'installment') {
          const key = r.cleanTitle.toLowerCase();
          const isFirst = prev.filter(x => x.txType === 'installment' && x.cleanTitle.toLowerCase() === key)
            .sort((a, b) => a.installmentIndex - b.installmentIndex)[0]?.installmentIndex === r.installmentIndex;
          return isFirst;
        }
        return true;
      });
      const allSelected = selectable.every(r => r.selected);
      return prev.map(r => {
        if (selectable.includes(r)) return { ...r, selected: !allSelected };
        return r;
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
        // Create installment series from the detected index to the total
        // e.g., if CSV has "Compra 06/10", generate parcels 6,7,8,9,10
        const count = r.installmentTotal;
        const startIndex = r.installmentIndex; // where to start (e.g., 6)
        const remainingCount = count - startIndex + 1; // how many to create (e.g., 5)
        const perValue = r.value;
        const seriesId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const totalValue = perValue * count;

        for (let i = 0; i < remainingCount; i++) {
          const currentIndex = startIndex + i; // 6, 7, 8, 9, 10
          const txDate = i === 0 ? r.date : addMonthsISO(r.date, i);
          transactionsToCreate.push({
            description: `${r.cleanTitle} (${currentIndex}/${count})`,
            date: txDate,
            value: perValue,
            type: 'expense',
            category: r.category || 'Outros',
            paymentMethod,
            cardId: selectedCard && selectedCard !== 'none' ? selectedCard : null,
            isFixed: false,
            isInstallment: true,
            installmentCount: count,
            installmentCurrent: currentIndex,
            installmentSeriesId: seriesId,
            installmentTotalValue: totalValue,
          });
        }
      } else {
        // Mapeia txType para type da entidade — estornos/receitas viram income
        const txEntityType = (r.txType === 'income' || r.txType === 'refund') ? 'income' : 'expense';
        transactionsToCreate.push({
          description: r.description,
          date: r.date,
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

    // Count stats for summary
    const normalCount = selected.filter(r => r.txType === 'normal' || r.txType === 'income').length;
    const installmentSeriesSet = new Set();
    let installmentParcelCount = 0;
    rows.forEach(r => {
      if (r.txType === 'installment' && r.selected) {
        installmentSeriesSet.add(r.cleanTitle);
        installmentParcelCount++;
      }
    });
    const seriesCountStats = installmentSeriesSet.size;
    const totalParcelGenerated = transactionsToCreate.filter(t => t.isInstallment).length;
    const totalValueImported = transactionsToCreate.reduce((s, t) => s + (t.value || 0), 0);

    setIsImportingLocal(true);
    setProgress({ current: 0, total: transactionsToCreate.length });

    // Pass full array + progress callback to parent (batching happens there)
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
      parcels: totalParcelGenerated,
      totalValue: totalValueImported,
    });
    setStep('done');

    // Store stats for display
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

  // Helper: check if an installment row is the first (trigger) of its series in the CSV
  const isSeriesTrigger = (row, allRows) => {
    if (row.txType !== 'installment') return false;
    const key = row.cleanTitle.toLowerCase();
    const sameSeriesRows = allRows.filter(x => x.txType === 'installment' && x.cleanTitle.toLowerCase() === key);
    const minIndex = Math.min(...sameSeriesRows.map(x => x.installmentIndex));
    return row.installmentIndex === minIndex;
  };

  const selectableRows = rows.filter(r => {
    if (r._duplicate || r._duplicateSeries) return false; // duplicatas e séries já existentes bloqueiam
    if (r.txType === 'installment') return isSeriesTrigger(r, rows);
    return true; // refund, income, normal — todos selecionáveis
  });
  const selectedCount = selectableRows.filter(r => r.selected).length;
  const totalValue = rows.filter(r => r.selected).reduce((s, r) => s + r.value, 0);
  const dupeCount = rows.filter(r => r._duplicate || r._duplicateSeries).length;
  const suspectCount = rows.filter(r => r._duplicateSuspect).length;
  const instCount = rows.filter(r => r.txType === 'installment').length;
  const refundCount = rows.filter(r => r.txType === 'refund').length;
  const seriesCount = new Set(rows.filter(r => r.txType === 'installment' && r.selected).map(r => r.cleanTitle)).size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            Importar Fatura de Cartão (CSV)
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {cards.length > 0 && (
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CreditCard size={14} /> Cartão de Crédito
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Selecione o cartão ANTES de fazer upload — isso ajusta as datas para o mês correto da fatura.
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
                  Sem cartão selecionado, as datas não serão ajustadas para o mês da fatura.
                  As transações irão para o mês da compra.
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
              <p>Colunas: <strong>Data</strong>, <strong>Descrição/Histórico</strong>, <strong>Valor</strong></p>
              <p>Formatos de data aceitos: DD/MM/AAAA ou AAAA-MM-DD</p>
              <p>Separadores: vírgula (,), ponto e vírgula (;) ou TAB</p>
              <p className="mt-1 text-amber-600">⚠️ Valores positivos serão tratados como despesas (fatura de cartão)</p>
            </div>
          </div>
        )}

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
              {suspectCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                  <AlertTriangle size={10} /> {suspectCount} possível(is)
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
              {seriesCount > 0 && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                  ✨ {seriesCount} série(s) a criar
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
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-left">Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isDisabled = r._duplicate || r._duplicateSeries || (r.txType === 'installment' && !isSeriesTrigger(r, rows));
                    // refund NÃO é mais disabled — usuário pode desmarcar se quiser
                    let rowBg = '';
                    if (r._duplicate) rowBg = 'bg-red-50/50 dark:bg-red-950/20';
                    else if (r._duplicateSeries) rowBg = 'bg-purple-50/50 dark:bg-purple-950/20';
                    else if (r._duplicateSuspect) rowBg = 'bg-yellow-50/50 dark:bg-yellow-950/20';
                    else if (r.txType === 'refund') rowBg = 'bg-emerald-50/50 dark:bg-emerald-950/20';
                    else if (r.txType === 'installment' && !isSeriesTrigger(r, rows)) rowBg = 'bg-blue-50/30 dark:bg-blue-950/10';

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
                          {!r._dateAdjusted && !r._dateWarning && cards.length > 0 && (
                            <span title="Data sem ajuste de fatura — selecione um cartão para corrigir">⚠️ </span>
                          )}
                          {r.date?.split('-').reverse().join('/')}
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
                              Série já existe
                            </span>
                          )}
                          {r._duplicateSuspect && !r._duplicate && !r._duplicateSeries && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                              <AlertTriangle size={9} /> Possível duplicata
                            </span>
                          )}
                          {r.txType === 'refund' && (
                            <span
                              title="Detectado como estorno/receita — será importado como Receita. Desmarque se não quiser importar."
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"
                            >
                              ↩ Estorno/Receita
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
                          r.txType === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                          {r.txType === 'income' ? '+' : '-'}{formatCurrency(r.value)}
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

            {/* Info banner for installments */}
            {seriesCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
                <p className="font-semibold">
                  <Layers size={12} className="inline mr-1" />
                  Parcelas detectadas: a 1ª parcela de cada série encontrada no CSV está selecionada.
                  As parcelas restantes ({rows.filter(r => r.txType === 'installment' && !isSeriesTrigger(r, rows)).length}) serão geradas automaticamente a partir do mês correspondente.
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
                    {seriesCount > 0 && ` (${seriesCount} séries)`}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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
                    <p>• {importStats.series} série(s) de parcelas ({importStats.parcels} parcelas no total)</p>
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
                // Navigate to the month with most imported transactions
                const dateCounts = {};
                rows.filter(r => r._imported).forEach(r => {
                  if (r.date) {
                    const ym = r.date.slice(0, 7); // YYYY-MM
                    dateCounts[ym] = (dateCounts[ym] || 0) + 1;
                  }
                });
                const bestMonth = Object.entries(dateCounts).sort((a, b) => b[1] - a[1])[0];
                if (bestMonth) {
                  const [y, m] = bestMonth[0].split('-');
                  navigate(`/transactions?month=${parseInt(m)}&year=${y}`);
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
