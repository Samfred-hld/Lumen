// ══════════════════════════════════════════
// LÚMEN — CSV Deduplication Engine
// ══════════════════════════════════════════
// Unified duplicate detection logic.
// Used by both CSVImport (preview) and Transactions.jsx (import guard).

import { normalizeStr } from './stringUtils';

// ══════════════════════════════════════════
// Dedup Index Builders
// ══════════════════════════════════════════

/**
 * Build an index of existing installment transactions for fast lookup.
 * Returns Map<cleanTitle_norm, Set<installmentCurrent>>.
 */
export function buildInstallmentIndex(transactions) {
  const index = new Map();
  for (const t of transactions) {
    if (!t.isInstallment) continue;
    const base = stripInstallmentSuffix(t.description || '');
    if (!index.has(base)) index.set(base, new Set());
    index.get(base).add(t.installmentCurrent);
  }
  return index;
}

/**
 * Build a fast lookup index for existing transactions.
 * Returns Map<dedupKey, Array<transaction>> where key = normalizedDesc|date|roundedValue.
 */
export function buildDedupIndex(transactions) {
  const index = new Map();
  for (const t of transactions) {
    const key = buildRowKey(t.description, t.date, t.value);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(t);
  }
  return index;
}

/**
 * Build a dedup key from raw fields.
 */
function buildRowKey(description, date, value) {
  return `${normalizeStr(description)}|${date || ''}|${Math.round(Math.abs(value || 0) * 100)}`;
}

/**
 * Strip installment suffix from description for base comparison.
 * Handles both "(1/4)" and "- Parcela 1/4" formats.
 */
export function stripInstallmentSuffix(desc) {
  return normalizeStr(desc || '')
    .replace(/\s*[-–]\s*parcela\s+\d+\/\d+\s*$/, '')
    .replace(/\s*\(\d+\/\d+\)\s*$/, '');
}

// ══════════════════════════════════════════
// Duplicate Detection Functions
// ══════════════════════════════════════════

/**
 * Check if a row is an exact duplicate of an existing transaction.
 * Matches: description (normalized) + date + value + installment index.
 *
 * @param {object} row - Parsed CSV row (from csvParser)
 * @param {Array} transactions - Existing transactions
 * @param {string|null} selectedCardId - Card ID filter (skip mismatched cards)
 * @returns {boolean}
 */
export function findExactDuplicate(row, transactions, selectedCardId = null) {
  const descNorm = row.txType === 'installment'
    ? stripInstallmentSuffix(row.cleanTitle || row.description)
    : normalizeStr(row.description);

  for (const t of transactions) {
    // Different card → skip
    if (t.cardId && selectedCardId && t.cardId !== selectedCardId) continue;

    const tDescNorm = t.isInstallment
      ? stripInstallmentSuffix(t.description)
      : normalizeStr(t.description);

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
 *
 * @param {object} row - Parsed CSV row
 * @param {Array} transactions - Existing transactions
 * @param {string|null} selectedCardId - Card ID filter
 * @returns {boolean}
 */
export function findSuspectDuplicate(row, transactions, selectedCardId = null) {
  const descNorm = row.txType === 'installment'
    ? stripInstallmentSuffix(row.cleanTitle || row.description)
    : normalizeStr(row.description);

  for (const t of transactions) {
    if (t.cardId && selectedCardId && t.cardId !== selectedCardId) continue;

    const tDescNorm = t.isInstallment
      ? stripInstallmentSuffix(t.description)
      : normalizeStr(t.description);

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
 *
 * @param {object} row - Parsed CSV row (must have txType='installment')
 * @param {Map} installmentIndex - From buildInstallmentIndex()
 * @returns {boolean}
 */
export function isInstallmentAlreadyImported(row, installmentIndex) {
  if (row.txType !== 'installment') return false;
  const base = normalizeStr(row.cleanTitle || row.description);
  const indices = installmentIndex.get(base);
  if (!indices) return false;
  return indices.has(row.installmentIndex);
}

/**
 * Find which installments of a series are missing before the current one.
 *
 * @param {object} row - Parsed CSV row (must have txType='installment')
 * @param {Map} installmentIndex - From buildInstallmentIndex()
 * @returns {number[]} - Array of missing installment indices
 */
export function findMissingInstallments(row, installmentIndex) {
  if (row.txType !== 'installment') return [];
  const base = normalizeStr(row.cleanTitle || row.description);
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
// Enrichment (batch duplicate detection)
// ══════════════════════════════════════════

/**
 * Enrich parsed rows with duplicate detection results.
 * This is the single entry point for all dedup logic.
 *
 * @param {Array} rows - Parsed rows from csvParser
 * @param {Array} transactions - Existing transactions
 * @param {string|null} selectedCardId - Card ID
 * @returns {Array} - Rows enriched with _duplicate, _duplicateSeries, _duplicateSuspect, _missingInstallments
 */
export function enrichWithDedup(rows, transactions, selectedCardId = null) {
  const installmentIdx = buildInstallmentIndex(transactions);

  return rows.map(row => {
    const isDupe = findExactDuplicate(row, transactions, selectedCardId);
    const isSeriesDupe = !isDupe && isInstallmentAlreadyImported(row, installmentIdx);
    const isSuspect = !isDupe && !isSeriesDupe && findSuspectDuplicate(row, transactions, selectedCardId);
    const missing = findMissingInstallments(row, installmentIdx);

    return {
      ...row,
      _duplicate: isDupe,
      _duplicateSeries: isSeriesDupe,
      _duplicateSuspect: isSuspect,
      _missingInstallments: missing,
      // Auto-deselect duplicates
      selected: !isDupe && !isSeriesDupe,
    };
  });
}

// ══════════════════════════════════════════
// Import-time Dedup (Transactions.jsx guard)
// ══════════════════════════════════════════

/**
 * Filter out transactions that already exist in the database.
 * Used during import in Transactions.jsx as a second-pass safety net.
 *
 * @param {Array} txList - Transactions to import
 * @param {Array} existingTransactions - Current database transactions
 * @returns {{ deduped: Array, skipped: number }}
 */
export function filterDuplicatesOnImport(txList, existingTransactions) {
  const deduped = [];
  let skipped = 0;

  for (const newTx of txList) {
    const isDupe = existingTransactions.some(existing => {
      // For installments, compare by base title
      const existingDesc = newTx.isInstallment
        ? stripInstallmentSuffix(existing.description || '')
        : normalizeStr(existing.description);
      const newDesc = newTx.isInstallment
        ? stripInstallmentSuffix(newTx.description || '')
        : normalizeStr(newTx.description);

      if (existingDesc !== newDesc) return false;
      if (existing.date !== newTx.date) return false;
      if (Math.round(Math.abs(existing.value || 0) * 100) !== Math.round(Math.abs(newTx.value || 0) * 100)) return false;
      if (newTx.isInstallment && existing.isInstallment) {
        return existing.installmentCurrent === newTx.installmentCurrent;
      }
      return true;
    });

    if (isDupe) skipped++;
    else deduped.push(newTx);
  }

  return { deduped, skipped };
}
