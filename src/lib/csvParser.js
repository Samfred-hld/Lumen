// ══════════════════════════════════════════
// LÚMEN — CSV Parser Engine
// ══════════════════════════════════════════
// Parsing puro, sem React. Responsabilidades:
// 1. Detecção de encoding (BOM + heurística)
// 2. Parsing de CSV com aspas multiline e separadores variáveis
// 3. Detecção e normalização de formato de data
// 4. Detecção de tipo de transação (parcela, estorno, normal)
// 5. Auto-categorização via regras + histórico
// 6. Detecção de duplicatas internas (dentro do mesmo CSV)

import { normalizeStr } from './stringUtils';
import { parseAmount, parseAmountWithSign } from './amountParser';
import { detectInstallment, isRefundOrPayment } from './transactionDetectors';
import { suggestCategoryFromRules } from './store';

// ══════════════════════════════════════════
// 1. Encoding Detection
// ══════════════════════════════════════════

/**
 * Detect encoding from an ArrayBuffer.
 * Checks BOM first, then tries UTF-8 validity, then falls back to Windows-1252.
 * Returns a TextDecoder-compatible encoding string.
 */
export function detectEncoding(buffer) {
  const bytes = new Uint8Array(buffer);

  // BOM detection
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8';
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le';
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';

  // Try UTF-8 — check if all sequences are valid
  let isValidUtf8 = true;
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      i++;
    } else if (bytes[i] >= 0xC2 && bytes[i] <= 0xDF) {
      if (i + 1 >= bytes.length || bytes[i + 1] < 0x80 || bytes[i + 1] > 0xBF) { isValidUtf8 = false; break; }
      i += 2;
    } else if (bytes[i] >= 0xE0 && bytes[i] <= 0xEF) {
      if (i + 2 >= bytes.length || bytes[i + 1] < 0x80 || bytes[i + 1] > 0xBF || bytes[i + 2] < 0x80 || bytes[i + 2] > 0xBF) { isValidUtf8 = false; break; }
      i += 3;
    } else if (bytes[i] >= 0xF0 && bytes[i] <= 0xF4) {
      if (i + 3 >= bytes.length || bytes[i + 1] < 0x80 || bytes[i + 1] > 0xBF || bytes[i + 2] < 0x80 || bytes[i + 2] > 0xBF || bytes[i + 3] < 0x80 || bytes[i + 3] > 0xBF) { isValidUtf8 = false; break; }
      i += 4;
    } else {
      isValidUtf8 = false;
      break;
    }
  }
  if (isValidUtf8) return 'utf-8';

  // Heuristic: bytes 0x80-0x9F suggest Windows-1252 (not ISO-8859-1)
  let hasWin1252 = false;
  for (let j = 0; j < bytes.length; j++) {
    if (bytes[j] >= 0x80 && bytes[j] <= 0x9F) { hasWin1252 = true; break; }
  }
  return hasWin1252 ? 'windows-1252' : 'iso-8859-1';
}

/**
 * Read a File object and return decoded text with proper encoding detection.
 * Returns { text, encoding }.
 */
export async function readFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();
  const encoding = detectEncoding(buffer);
  const text = new TextDecoder(encoding).decode(buffer);
  return { text, encoding };
}

// ══════════════════════════════════════════
// 2. CSV Text Parsing (multiline-safe)
// ══════════════════════════════════════════

/**
 * Detect the most likely CSV separator from the first few lines.
 * Returns ',' , ';' , or '\t'.
 */
export function detectSeparator(text) {
  // Sample first 5 lines
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
  let commaCount = 0, semicolonCount = 0, tabCount = 0;
  let inQuotes = false;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    if (ch === ',') commaCount++;
    else if (ch === ';') semicolonCount++;
    else if (ch === '\t') tabCount++;
  }
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

/**
 * Parse CSV text into a 2D array of cells.
 * Handles quoted fields with commas, newlines, and escaped quotes.
 * Returns string[][] (rows of cells).
 */
export function parseCSVText(text, separator) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < len && text[i + 1] === '"') {
        // Escaped quote ""
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === separator && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // Handle CRLF and LF
      if (ch === '\r' && i + 1 < len && text[i + 1] === '\n') i++;
      currentRow.push(currentField);
      currentField = '';
      // Skip empty rows (only whitespace/separators)
      if (currentRow.length > 0 && currentRow.some(c => c.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += ch;
    }
  }

  // Last field/row (file may not end with newline)
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0 && currentRow.some(c => c.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Strip BOM from the beginning of text.
 */
export function stripBOM(text) {
  return text.replace(/^\uFEFF/, '');
}

// ══════════════════════════════════════════
// 3. Date Detection & Normalization
// ══════════════════════════════════════════

/**
 * Detect the date format from a sample of date strings.
 * Returns { format, separator, order } where:
 *   format: 'DMY' | 'MDY' | 'YMD'
 *   separator: '/' | '-' | '.'
 *   order: function(dateStr) → 'YYYY-MM-DD' (ISO)
 */
export function detectDateFormat(dateSamples) {
  if (!dateSamples || dateSamples.length === 0) {
    return { format: 'DMY', separator: '/', order: normalizeDMY };
  }

  // Clean and filter samples
  const samples = dateSamples
    .map(s => (s || '').trim())
    .filter(s => s.length >= 6)
    .slice(0, 30);

  let dmyCount = 0, mdyCount = 0, ymdCount = 0;
  let sep = '/';

  for (const s of samples) {
    // Detect separator
    if (s.includes('/')) sep = '/';
    else if (s.includes('-')) sep = '-';
    else if (s.includes('.')) sep = '.';

    const parts = s.split(sep);
    if (parts.length !== 3) continue;

    const [a, b, c] = parts.map(p => parseInt(p, 10));

    // YYYY-MM-DD
    if (a > 1900 && a < 2100 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      ymdCount++;
      continue;
    }

    // If first part > 12, must be DD/MM/YYYY
    if (a > 12 && a <= 31 && b >= 1 && b <= 12) {
      dmyCount++;
      continue;
    }

    // If second part > 12, must be MM/DD/YYYY
    if (b > 12 && b <= 31 && a >= 1 && a <= 12) {
      mdyCount++;
      continue;
    }

    // Ambiguous (both <= 12) — default to DMY (Brazilian)
    dmyCount++;
  }

  // Determine winner
  if (ymdCount > dmyCount && ymdCount > mdyCount) {
    return { format: 'YMD', separator: sep, order: normalizeYMD };
  }
  if (mdyCount > dmyCount) {
    return { format: 'MDY', separator: sep, order: normalizeMDY };
  }
  return { format: 'DMY', separator: sep, order: normalizeDMY };
}

/** Normalize DD/MM/YYYY → YYYY-MM-DD */
function normalizeDMY(dateStr) {
  const clean = dateStr.trim();
  const sep = clean.includes('/') ? '/' : clean.includes('-') ? '-' : '.';
  const parts = clean.split(sep);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(p => p.trim());
  const year = y.length === 2 ? (parseInt(y) > 30 ? `19${y}` : `20${y}`) : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Normalize MM/DD/YYYY → YYYY-MM-DD */
function normalizeMDY(dateStr) {
  const clean = dateStr.trim();
  const sep = clean.includes('/') ? '/' : clean.includes('-') ? '-' : '.';
  const parts = clean.split(sep);
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(p => p.trim());
  const year = y.length === 2 ? (parseInt(y) > 30 ? `19${y}` : `20${y}`) : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Normalize YYYY-MM-DD → YYYY-MM-DD (already ISO) */
function normalizeYMD(dateStr) {
  const clean = dateStr.trim();
  const sep = clean.includes('/') ? '/' : clean.includes('-') ? '-' : '.';
  const parts = clean.split(sep);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(p => p.trim());
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Normalize a date string to ISO format using detected format info.
 * Falls back to YYYY-MM-DD if already ISO, or today if completely unparseable.
 */
export function normalizeDate(dateStr, dateFormat) {
  if (!dateStr || !dateStr.trim()) return null;

  const clean = dateStr.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }

  // Use detected format
  if (dateFormat?.order) {
    const result = dateFormat.order(clean);
    if (result) {
      // Validate the resulting date
      const testDate = new Date(result + 'T12:00:00');
      if (!isNaN(testDate.getTime())) return result;
    }
  }

  // Fallback: try all formats
  const formats = [normalizeDMY, normalizeMDY, normalizeYMD];
  for (const fn of formats) {
    const result = fn(clean);
    if (result) {
      const testDate = new Date(result + 'T12:00:00');
      if (!isNaN(testDate.getTime())) return result;
    }
  }

  return null; // Caller decides fallback (today)
}

/**
 * Check if a date is suspiciously outside expected range.
 * Returns { warning: boolean, reason: string|null }
 */
export function validateDateRange(isoDate) {
  if (!isoDate) return { warning: true, reason: 'Data inválida' };
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d.getTime())) return { warning: true, reason: 'Data inválida' };

  const now = new Date();
  const limitFuture = new Date(now);
  limitFuture.setFullYear(limitFuture.getFullYear() + 1);
  const limitPast = new Date('2000-01-01T12:00:00');

  if (d < limitPast) return { warning: true, reason: 'Data muito antiga' };
  if (d > limitFuture) return { warning: true, reason: 'Data no futuro' };
  return { warning: false, reason: null };
}

// ══════════════════════════════════════════
// 4. Column Detection
// ══════════════════════════════════════════

/**
 * Detect column indices from headers.
 * Returns { dateIdx, descIdx, valIdx, creditIdx, debitIdx, hasSplitColumns }
 */
export function detectColumns(headers) {
  const h = headers.map(x => (x || '').toLowerCase().trim());

  const dateIdx = h.findIndex(x => /^(data|date|dt|fecha|posted|transaction\s*date)/.test(x));
  const descIdx = h.findIndex(x => /descri|hist|memo|detail|lança|establ|comercio|title|name|merchant|estabelecimento/.test(x));
  const valIdx = h.findIndex(x => /^(valor|value|amount|vl|importe|total|debito|débito|debit)$/.test(x));

  // Credit/Debit separate columns (Bradesco, Itaú, Inter)
  const creditIdx = h.findIndex(x => /crédito|credit|entrada|receita/.test(x));
  const debitIdx = h.findIndex(x => /débito|debit|saída|saida|despesa/.test(x));
  const hasSplitColumns = creditIdx !== -1 && debitIdx !== -1 && valIdx === -1;

  return { dateIdx, descIdx, valIdx, creditIdx, debitIdx, hasSplitColumns };
}

/**
 * Validate that required columns were found.
 * Returns { valid, error } where error is a user-friendly message.
 */
export function validateColumns(colInfo) {
  if (colInfo.descIdx === -1 && colInfo.valIdx === -1 && !colInfo.hasSplitColumns) {
    return {
      valid: false,
      error: 'Colunas obrigatórias não encontradas. O CSV precisa ter colunas de Descrição e Valor. Use o mapeamento manual se necessário.',
    };
  }
  return { valid: true, error: null };
}

// ══════════════════════════════════════════
// 5. Invoice Month Calculation
// ══════════════════════════════════════════

/**
 * Determine the invoice month (YYYY-MM) for a transaction date based on the card's closing day.
 * If the transaction day > closingDay → next month's invoice.
 * Returns 'YYYY-MM' string or null.
 */
export function getInvoiceMonth(dateStr, closingDay) {
  if (!closingDay || !dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  const day = parseInt(d);
  const closeDay = parseInt(closingDay);

  if (day > closeDay) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ══════════════════════════════════════════
// 6. Auto-Categorization
// ══════════════════════════════════════════

/**
 * Auto-categorize using rules + historical transactions.
 * Pure function — no side effects.
 */
export function autoCategorize(description, existingTransactions = []) {
  // 1. User rules (highest priority)
  const suggested = suggestCategoryFromRules(description);
  if (suggested) return suggested;

  // 2. Historical matching (fuzzy)
  const descNorm = normalizeStr(description);
  if (!descNorm) return '';

  // Build a frequency map from matching transactions
  const freq = new Map();
  for (const t of existingTransactions) {
    if (!t.category) continue;
    const tNorm = normalizeStr(t.description || '');
    if (tNorm === descNorm || tNorm.includes(descNorm) || descNorm.includes(tNorm)) {
      freq.set(t.category, (freq.get(t.category) || 0) + 1);
    }
  }

  if (freq.size === 0) return '';
  // Return the most frequent category
  let best = '', bestCount = 0;
  for (const [cat, count] of freq) {
    if (count > bestCount) { best = cat; bestCount = count; }
  }
  return best;
}

// ══════════════════════════════════════════
// 7. Internal Duplicate Detection (within CSV)
// ══════════════════════════════════════════

/**
 * Build a dedup key for internal CSV deduplication.
 * Uses normalized description + date + rounded value.
 */
function buildDedupeKey(isoDate, description, value) {
  return `${isoDate}|${normalizeStr(description)}|${Math.round(value * 100)}`;
}

// ══════════════════════════════════════════
// 8. Full Parse Pipeline
// ══════════════════════════════════════════

/**
 * Parse CSV text into structured transaction rows.
 *
 * @param {string} text - Raw CSV text (already decoded)
 * @param {object} options
 * @param {number|null} options.cardClosingDay - Card's closing day for invoice month calc
 * @param {Array} options.existingTransactions - Existing transactions for auto-categorization
 * @param {string|null} options.dateFormatOverride - Force date format ('DMY'|'MDY'|'YMD'), skip auto-detect
 * @param {object|null} options.columnMapping - Manual column mapping { dateIdx, descIdx, valIdx }
 * @returns {{ rows: Array, errors: string[], warnings: string[], stats: object }}
 */
export function parseCSV(text, options = {}) {
  const {
    cardClosingDay = null,
    existingTransactions = [],
    dateFormatOverride = null,
    columnMapping = null,
  } = options;

  const errors = [];
  const warnings = [];
  const cleanText = stripBOM(text);

  // Detect separator
  const separator = detectSeparator(cleanText);

  // Parse into rows
  const rawRows = parseCSVText(cleanText, separator);
  if (rawRows.length === 0) {
    return { rows: [], errors: ['Arquivo CSV vazio ou inválido.'], warnings: [], stats: {} };
  }
  if (rawRows.length === 1) {
    return { rows: [], errors: ['O CSV tem apenas o cabeçalho. Nenhuma transação encontrada.'], warnings: [], stats: {} };
  }

  // Header row
  const rawHeaders = rawRows[0].map(h => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());

  // Column detection
  const colInfo = columnMapping
    ? { ...detectColumns(rawHeaders), ...columnMapping, hasSplitColumns: false }
    : detectColumns(rawHeaders);

  // Re-validate hasSplitColumns if manual mapping provided credit/debit
  if (columnMapping?.creditIdx !== undefined && columnMapping?.debitIdx !== undefined && columnMapping?.valIdx === undefined) {
    colInfo.hasSplitColumns = true;
    colInfo.creditIdx = columnMapping.creditIdx;
    colInfo.debitIdx = columnMapping.debitIdx;
  }

  const colValidation = validateColumns(colInfo);
  if (!colValidation.valid) {
    return { rows: [], errors: [colValidation.error], warnings: [], stats: {} };
  }

  // Date format detection
  let dateFormat;
  if (dateFormatOverride) {
    const fnMap = { DMY: normalizeDMY, MDY: normalizeMDY, YMD: normalizeYMD };
    dateFormat = { format: dateFormatOverride, separator: '/', order: fnMap[dateFormatOverride] || normalizeDMY };
  } else {
    // Sample dates from the data rows (skip header)
    const dateSamples = rawRows.slice(1)
      .map(r => (colInfo.dateIdx >= 0 ? r[colInfo.dateIdx] : r[0]) || '')
      .filter(d => d.trim().length >= 6)
      .slice(0, 30);
    dateFormat = detectDateFormat(dateSamples);
  }

  // Parse data rows
  const dataRows = rawRows.slice(1);
  const rows = [];
  const seenInternally = new Set();
  let skippedEmpty = 0;
  let skippedTotal = 0;
  let skippedDupe = 0;
  let skippedZero = 0;
  let skippedInvalidDate = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i];

    // Skip rows with too few cells
    if (cells.length < 2) { skippedEmpty++; continue; }

    const dateRaw = (colInfo.dateIdx >= 0 ? cells[colInfo.dateIdx] : cells[0]) || '';
    const desc = (colInfo.descIdx >= 0 ? cells[colInfo.descIdx] : cells[1]) || '';

    // Skip empty descriptions
    if (!desc.trim()) { skippedEmpty++; continue; }

    // Skip total/saldo/subtotal lines
    if (/^(total|saldo|subtotal|balance|sub\s*total|fechamento|abertura)/i.test(desc.trim())) {
      skippedTotal++;
      continue;
    }

    // Skip duplicate header rows (some CSVs repeat headers)
    if (/^(data|date|dt|fecha)/i.test(dateRaw.trim())) {
      skippedEmpty++;
      continue;
    }

    // Extract value
    let rawV;
    if (colInfo.hasSplitColumns) {
      const debitRaw = (colInfo.debitIdx >= 0 ? cells[colInfo.debitIdx] : '') || '';
      const creditRaw = (colInfo.creditIdx >= 0 ? cells[colInfo.creditIdx] : '') || '';
      const debitVal = parseAmount(debitRaw);
      const creditVal = parseAmount(creditRaw);
      rawV = String(debitVal - creditVal);
    } else {
      rawV = (colInfo.valIdx >= 0 ? cells[colInfo.valIdx] : cells[2]) || '';
    }

    // Parse value
    const { value: absValue, isNegative: isNegativeInSource } = parseAmountWithSign(rawV);

    // Skip zero values (unless explicitly "0")
    const isExplicitZero = /^\s*0([.,]0+)?\s*$/.test(String(rawV).replace(/[^\d.,]/g, ''));
    if (absValue === 0 && !isExplicitZero) {
      skippedZero++;
      continue;
    }

    // Normalize date
    let isoDate = normalizeDate(dateRaw.trim(), dateFormat);
    if (!isoDate) {
      isoDate = new Date().toISOString().split('T')[0];
      skippedInvalidDate++;
      warnings.push(`Linha ${i + 2}: data "${dateRaw}" inválida, usando hoje.`);
    }

    // Date range validation
    const dateValidation = validateDateRange(isoDate);

    // Internal duplicate detection
    const dupeKey = buildDedupeKey(isoDate, desc, absValue);
    if (seenInternally.has(dupeKey)) {
      skippedDupe++;
      continue;
    }
    seenInternally.add(dupeKey);

    // Detect transaction type
    let txType = 'normal';
    let installmentIndex = null;
    let installmentTotal = null;
    let cleanTitle = desc;

    if (isNegativeInSource) {
      // Negative value in CSV = income/refund (bank convention)
      // Check if it's a refund vs regular income
      if (isRefundOrPayment(desc, absValue)) {
        txType = 'refund';
      } else {
        txType = 'income';
      }
    } else {
      // Positive value
      if (isRefundOrPayment(desc, absValue)) {
        txType = 'refund';
      } else {
        const inst = detectInstallment(desc);
        if (inst) {
          txType = 'installment';
          installmentIndex = inst.index;
          installmentTotal = inst.total;
          cleanTitle = inst.cleanTitle;
        }
      }
    }

    // Auto-categorize
    const category = autoCategorize(desc, existingTransactions);

    // Invoice month
    const invoiceMonth = getInvoiceMonth(isoDate, cardClosingDay);

    rows.push({
      date: isoDate,
      invoiceMonth,
      description: desc.trim(),
      cleanTitle,
      value: absValue,
      category,
      selected: true,
      _rowIndex: i + 2, // 1-indexed, accounting for header
      _dateWarning: dateValidation.warning,
      _dateWarningReason: dateValidation.reason,
      _zeroValue: absValue === 0 && isExplicitZero,
      txType,
      installmentIndex,
      installmentTotal,
      _duplicate: false,
      _duplicateSeries: false,
      _duplicateSuspect: false,
      _missingInstallments: [],
    });
  }

  // Summary stats
  const stats = {
    totalRawRows: dataRows.length,
    parsed: rows.length,
    skippedEmpty,
    skippedTotal,
    skippedDupe,
    skippedZero,
    skippedInvalidDate,
    dateDetected: dateFormat.format,
    separator: separator === ';' ? ';' : separator === '\t' ? 'TAB' : ',',
  };

  // Warn about skipped rows
  if (skippedDupe > 0) warnings.push(`${skippedDupe} linha(s) duplicada(s) dentro do CSV foram ignoradas.`);
  if (skippedInvalidDate > 0 && warnings.length === 0) warnings.push(`${skippedInvalidDate} linha(s) com data inválida.`);

  return { rows, errors, warnings, stats };
}
