// ══════════════════════════════════════════
// LÚMEN — Amount Parsing Utilities
// ══════════════════════════════════════════
// Handles Brazilian (1.234,56), US (1,234.56), accounting ((1.234,56)),
// and plain numeric formats. Always returns a number.

/**
 * Parse a numeric string that may use BR, US, or accounting format.
 * Returns a signed number (negative for accounting parentheses).
 * Returns 0 for empty/invalid input.
 */
export function parseAmount(raw) {
  if (raw == null) return 0;
  const s = String(raw).replace(/[^\d.,\-()]/g, '').trim();
  if (!s || s === '-') return 0;

  // Accounting format: (1.234,56) = negative
  const isAccountingNegative = /^\(.*\)$/.test(s);
  const clean = s.replace(/[()]/g, '');

  const hasDot = clean.includes('.');
  const hasComma = clean.includes(',');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  let num;
  if (hasDot && hasComma) {
    // Whoever comes last is the decimal separator
    num = lastComma > lastDot
      ? clean.replace(/\./g, '').replace(',', '.')  // BR: 1.234,56
      : clean.replace(/,/g, '');                      // US: 1,234.56
  } else if (hasComma && !hasDot) {
    // 2 digits after comma → decimal (BR), 3 digits → thousands (US)
    const afterComma = clean.split(',').pop() || '';
    num = afterComma.length <= 2
      ? clean.replace(',', '.')
      : clean.replace(',', '');
  } else {
    num = clean;
  }

  const result = Math.abs(parseFloat(num)) || 0;
  return isAccountingNegative ? -result : result;
}

/**
 * Parse amount and also return the original sign from the source.
 * Returns { value: number (always positive), isNegative: boolean }
 */
export function parseAmountWithSign(raw) {
  if (raw == null) return { value: 0, isNegative: false };
  const s = String(raw).replace(/[^\d.,\-()]/g, '').trim();
  if (!s || s === '-') return { value: 0, isNegative: false };

  const isAccountingNegative = /^\(.*\)$/.test(s);
  const clean = s.replace(/[()]/g, '');

  // Check for explicit negative sign
  const hasExplicitNegative = clean.startsWith('-');
  const absClean = clean.replace(/^-/, '');

  const hasDot = absClean.includes('.');
  const hasComma = absClean.includes(',');
  const lastDot = absClean.lastIndexOf('.');
  const lastComma = absClean.lastIndexOf(',');

  let num;
  if (hasDot && hasComma) {
    num = lastComma > lastDot
      ? absClean.replace(/\./g, '').replace(',', '.')
      : absClean.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    const afterComma = absClean.split(',').pop() || '';
    num = afterComma.length <= 2
      ? absClean.replace(',', '.')
      : absClean.replace(',', '');
  } else {
    num = absClean;
  }

  const value = Math.abs(parseFloat(num)) || 0;
  const isNegative = isAccountingNegative || hasExplicitNegative;
  return { value, isNegative };
}
