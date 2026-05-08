// ══════════════════════════════════════════
// LÚMEN — Fix null invoiceMonth retroactively
// ══════════════════════════════════════════
// One-time utility to correct transactions imported without invoiceMonth/cardId.

import { base44 } from '@/api/base44Client';
import { getInvoiceMonth } from '@/lib/csvParser';
import { getCards } from '@/lib/store';

/**
 * Fix transactions with missing invoiceMonth.
 * @param {function} onProgress - Callback: ({ current, total }) => void
 * @returns {{ fixed: number, skipped: number, needsReview: object[] }}
 */
export async function fixNullInvoiceMonth(onProgress) {
  const transactions = await base44.entities.Transaction.list('-date', 5000);
  const cards = getCards();

  const toFix = transactions.filter(t => !t.invoiceMonth);
  let fixed = 0, skipped = 0;
  const needsReview = [];

  for (let i = 0; i < toFix.length; i++) {
    const t = toFix[i];
    onProgress?.({ current: i + 1, total: toFix.length });

    // Resolve cardId
    let cardId = t.cardId;
    if (!cardId && t.paymentMethod) {
      const matched = cards.find(c =>
        t.paymentMethod.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) cardId = matched.id;
    }

    const card = cards.find(c => c.id === cardId);
    if (!card) {
      needsReview.push(t);
      continue;
    }

    const invoiceMonth = getInvoiceMonth(t.date, card.closingDay);
    if (!invoiceMonth) {
      needsReview.push(t);
      continue;
    }

    await base44.entities.Transaction.update(t.id, { invoiceMonth, cardId });
    fixed++;
  }

  return { fixed, skipped, needsReview };
}
