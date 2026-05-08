// ══════════════════════════════════════════
// LÚMEN — Bank CSV Profiles
// ══════════════════════════════════════════
// Pre-configured column mappings and parsing rules for known Brazilian bank exports.
// Used to auto-detect the bank and skip manual column mapping.

/**
 * @typedef {Object} BankProfile
 * @property {string} name - Display name
 * @property {function(string[]): boolean} detect - Returns true if headers match this bank
 * @property {number} dateIdx - Column index for date (-1 for auto)
 * @property {number} descIdx - Column index for description
 * @property {number} valIdx - Column index for value (-1 if using credit/debit split)
 * @property {number} creditIdx - Column index for credit values (-1 if not applicable)
 * @property {number} debitIdx - Column index for debit values (-1 if not applicable)
 * @property {string} dateFormat - 'DMY' | 'MDY' | 'YMD'
 * @property {boolean} positiveIsExpense - true if positive values = expense (Nubank convention)
 * @property {RegExp[]} skipPatterns - Row description patterns to skip
 */

const PROFILES = {
  nubank: {
    name: 'Nubank',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      // Nubank: "date", "title", "amount" (English headers)
      // or has "nubank" anywhere
      return h.some(x => /nubank/i.test(x)) ||
        (h.includes('date') && h.includes('title') && h.includes('amount'));
    },
    dateIdx: -1, // auto-detect by name
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'YMD', // Nubank uses YYYY-MM-DD
    positiveIsExpense: true, // Nubank: positive = expense, negative = payment
    skipPatterns: [/^pagamento\s+de\s+fatura/i, /^saldo\s+anterior/i],
    columnNames: { date: 'date', desc: 'title', val: 'amount' },
  },

  inter: {
    name: 'Inter',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      return h.some(x => /inter/i.test(x)) ||
        (h.includes('data') && h.includes('descrição') && (h.includes('valor') || h.includes('débito')));
    },
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: false,
    skipPatterns: [/^saldo\s+(anterior|atual|final)/i],
    columnNames: { date: 'data', desc: 'descrição', val: 'valor' },
  },

  bradesco: {
    name: 'Bradesco',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      return h.some(x => /bradesco/i.test(x)) ||
        (h.includes('data') && h.includes('histórico') && (h.includes('crédito') || h.includes('débito')));
    },
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    creditIdx: -1,
    debitIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: false,
    skipPatterns: [/^saldo\s+(anterior|atual|final)/i, /^s\.?a\.?\s+do\s+dia/i],
    columnNames: { date: 'data', desc: 'histórico', credit: 'crédito', debit: 'débito' },
  },

  itau: {
    name: 'Itaú',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      return h.some(x => /itau|itaú/i.test(x)) ||
        (h.includes('data') && h.includes('lançamento') && h.includes('valor'));
    },
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: false,
    skipPatterns: [/^saldo\s+(anterior|atual|final)/i],
    columnNames: { date: 'data', desc: 'lançamento', val: 'valor' },
  },

  c6bank: {
    name: 'C6 Bank',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      return h.some(x => /c6\s*bank|c6bank/i.test(x)) ||
        (h.includes('data') && h.includes('estabelecimento') && h.includes('valor'));
    },
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: true, // C6: positive = expense
    skipPatterns: [/^saldo\s+(anterior|atual|final)/i, /^fatura/i],
    columnNames: { date: 'data', desc: 'estabelecimento', val: 'valor' },
  },

  xp: {
    name: 'XP Investimentos',
    detect: (headers) => {
      const h = headers.map(x => (x || '').toLowerCase().trim());
      return h.some(x => /xp\s*invest|xp\s*cart/i.test(x));
    },
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: false,
    skipPatterns: [/^saldo/i],
    columnNames: { date: 'data', desc: 'descrição', val: 'valor' },
  },

  generic: {
    name: 'Genérico',
    detect: () => true, // Always matches as fallback
    dateIdx: -1,
    descIdx: -1,
    valIdx: -1,
    dateFormat: 'DMY',
    positiveIsExpense: false,
    skipPatterns: [],
    columnNames: null,
  },
};

/**
 * Detect which bank profile matches the CSV headers.
 * Returns the profile key and profile object.
 *
 * @param {string[]} rawHeaders - Original header row (already split)
 * @returns {{ key: string, profile: BankProfile }}
 */
export function detectBankProfile(rawHeaders) {
  const headers = rawHeaders.map(h => (h || '').toLowerCase().trim());

  // Try each profile (except generic) in order
  for (const [key, profile] of Object.entries(PROFILES)) {
    if (key === 'generic') continue;
    if (profile.detect(headers)) {
      return { key, profile: resolveProfile(profile, headers) };
    }
  }

  // Fallback to generic
  return { key: 'generic', profile: resolveProfile(PROFILES.generic, headers) };
}

/**
 * Resolve column indices from profile column names against actual headers.
 * Prioridade: match exato → palavra inteira → substring.
 */
function resolveProfile(profile, headers) {
  if (!profile.columnNames) return profile;

  const resolved = { ...profile };

  function findIdx(term) {
    if (!term) return -1;
    // 1. Match exato (case-insensitive)
    let idx = headers.findIndex(h => h.toLowerCase() === term.toLowerCase());
    if (idx !== -1) return idx;
    // 2. Match de palavra inteira
    const re = new RegExp(`\\b${term}\\b`, 'i');
    idx = headers.findIndex(h => re.test(h));
    if (idx !== -1) return idx;
    // 3. Substring — apenas como último recurso
    return headers.findIndex(h => h.toLowerCase().includes(term.toLowerCase()));
  }

  if (resolved.dateIdx === -1) resolved.dateIdx = findIdx(profile.columnNames.date);
  if (resolved.descIdx === -1) resolved.descIdx = findIdx(profile.columnNames.desc);
  if (resolved.valIdx === -1) resolved.valIdx = findIdx(profile.columnNames.val);
  if (profile.columnNames.credit) resolved.creditIdx = findIdx(profile.columnNames.credit);
  if (profile.columnNames.debit) resolved.debitIdx = findIdx(profile.columnNames.debit);

  // Check if we have split columns
  if (resolved.creditIdx !== undefined && resolved.creditIdx !== -1 &&
      resolved.debitIdx !== undefined && resolved.debitIdx !== -1 &&
      (resolved.valIdx === -1 || resolved.valIdx === undefined)) {
    resolved.hasSplitColumns = true;
  }

  return resolved;
}

/**
 * Get all profile names for display.
 * Returns Array<{ key, name }>.
 */
export function getBankProfileNames() {
  return Object.entries(PROFILES)
    .filter(([key]) => key !== 'generic')
    .map(([key, profile]) => ({ key, name: profile.name }));
}

export { PROFILES };
