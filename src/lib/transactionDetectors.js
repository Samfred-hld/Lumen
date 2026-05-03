// ══════════════════════════════════════════
// LÚMEN — Transaction Detection Utilities
// ══════════════════════════════════════════
// Auto-detect installment patterns and refunds from description text.

/**
 * Detect installment pattern in description.
 * Matches: "Product 03/12", "Product - Parcela 3/12", "Product (3/12)"
 * Returns: { isInstallment, index, total, cleanTitle } or null
 */
export function detectInstallment(description) {
  if (!description) return null;
  const s = description.trim();

  // Pattern: "Title - Parcela 3/12"
  let m = s.match(/^(.*?)\s*[-–]\s*[Pp]arcela\s+(\d+)\/(\d+)$/);
  if (m) {
    const idx = parseInt(m[2]), total = parseInt(m[3]);
    if (total > 1 && idx >= 1 && idx <= total) {
      return { isInstallment: true, index: idx, total, cleanTitle: m[1].trim() };
    }
  }

  // Pattern: "Title 03/12"
  m = s.match(/^(.*?)\s+(\d{2})\/(\d{2})$/);
  if (m) {
    const idx = parseInt(m[2]), total = parseInt(m[3]);
    if (total > 1 && idx >= 1 && idx <= total) {
      return { isInstallment: true, index: idx, total, cleanTitle: m[1].trim() };
    }
  }

  // Pattern: "Title (3/12)"
  m = s.match(/\((\d+)\/(\d+)\)\s*$/);
  if (m) {
    const idx = parseInt(m[1]), total = parseInt(m[2]);
    if (total > 1 && idx >= 1 && idx <= total) {
      return { isInstallment: true, index: idx, total, cleanTitle: s.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() };
    }
  }

  // Pattern: "Title 3x" (common in Brazil)
  m = s.match(/^(.*?)\s+(\d+)[xX]\s*$/);
  if (m) {
    const total = parseInt(m[2]);
    if (total > 1) {
      return { isInstallment: true, index: 1, total, cleanTitle: m[1].trim() };
    }
  }

  return null;
}

/**
 * Detect if a transaction is a refund, reversal, or payment.
 * Returns true if the description suggests it should be treated as income.
 * Does NOT use value sign — positive values are normal income, not refunds.
 */
export function isRefundOrPayment(description, value) {
  if (!description) return false;
  const s = description.toLowerCase();
  if (/\b(estorno|reembolso|cashback)\b/.test(s)) return true;
  if (/\b(pagamento)\b/.test(s) && /\b(cartão|fatura|crédito|credit)\b/.test(s)) return true;
  return false;
}

/**
 * Suggest installment parameters from description.
 * Returns { count, perValue } or null
 */
export function suggestInstallment(description, totalValue) {
  const detected = detectInstallment(description);
  if (!detected) return null;

  const count = detected.total;
  const perValue = Math.abs(totalValue) / count;

  return {
    count,
    perValue: Math.round(perValue * 100) / 100,
    index: detected.index,
    cleanTitle: detected.cleanTitle,
  };
}
