// ══════════════════════════════════════════
// LÚMEN — Auto-Categorization Correlations
// ══════════════════════════════════════════
// Built-in correlations for Brazilian invoice descriptions.
// These run in the background and are NOT shown in the Rules tab.
// User-defined rules always take priority over these.
//
// String correlations are in src/data/correlations.json (editable).
// Regex correlations remain here for precise word-boundary matching.

import STRING_CORRELATIONS from '../data/correlations.json';

// Regex entries — word-boundary matching for ambiguous terms
const REGEX_CORRELATIONS = [
  [/\b(SUPERMERCADO|MINIMERCADO|HIPERMERCADO|MERCADINHO)\b/i, 'Alimentação'],
  [/\bMERCADO\b(?!.*\b(FINANCEIRO|IMOBILIÁRIO|IMOBILIARIO|DE AÇÕES|DE ACÕES|CAPITAL|LIVRE|PAGO)\b)/i, 'Alimentação'],
  [/\b99\b|\b99TAXI\b/i, 'Transporte'],
  [/\bPOSTO\b/i, 'Combustível'],
  [/\bTIM\b/i, 'Telecomunicações'],
  [/\bOI\b/i, 'Telecomunicações'],
  [/\bNET\b/i, 'Telecomunicações'],
  [/\bLIGHT\b/i, 'Moradia'],
  [/\bGOL\b/i, 'Viagens'],
  [/\bAZUL\b/i, 'Viagens'],
  [/\bFARM\b/i, 'Vestuário'],
];

// Sort strings by length descending so longer matches take priority
const SORTED_STRING_CORRELATIONS = [...STRING_CORRELATIONS].sort((a, b) => b[0].length - a[0].length);

/**
 * Try to match a description against built-in correlations.
 * Returns the category string or null if no match.
 * @param {string} description - Transaction description
 */
export function matchCorrelation(description) {
  if (!description) return null;
  const desc = description.toUpperCase().trim();

  // 1. String matches (longer first)
  for (const [keyword, category] of SORTED_STRING_CORRELATIONS) {
    if (desc.includes(keyword)) {
      return category;
    }
  }

  // 2. Regex matches (precise boundaries)
  for (const [regex, category] of REGEX_CORRELATIONS) {
    if (regex.test(desc)) {
      return category;
    }
  }

  return null;
}
