// ══════════════════════════════════════════
// LÚMEN — Retroactive Invoice Month Fix
// ══════════════════════════════════════════
// One-time migration: preenche invoiceMonth e cardId em transações existentes
// que foram importadas sem esses campos.
//
// COMO USAR:
// 1. Abra o console do navegador (F12 → Console)
// 2. Cole: await window.__fixNullInvoiceMonth()
// 3. Aguarde a conclusão — vai mostrar quantas transações foram atualizadas

import { supabase } from '@/api/supabaseClient';
import { getCards } from '@/lib/store/cards';
import { getInvoiceMonth } from '@/lib/csvParser';

/**
 * Preenche invoiceMonth em transações de cartão que não possuem.
 * Também tenta inferir cardId a partir do paymentMethod.
 *
 * @returns {{ updated: number, skipped: number, errors: string[] }}
 */
export async function fixNullInvoiceMonth() {
  console.log('[Migration] Iniciando correção retroativa de invoiceMonth...');

  const cards = getCards();
  if (cards.length === 0) {
    console.warn('[Migration] Nenhum cartão cadastrado. Abortando.');
    return { updated: 0, skipped: 0, errors: ['Nenhum cartão cadastrado'] };
  }

  // Build card lookup: id → card, and name → card (from paymentMethod)
  const cardById = new Map(cards.map(c => [c.id, c]));
  const cardByName = new Map();
  for (const c of cards) {
    cardByName.set(c.name.toLowerCase(), c);
    cardByName.set(`crédito - ${c.name}`.toLowerCase(), c);
  }

  // Fetch all transactions (up to 5000)
  let allTx = [];
  try {
    const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false }).limit(5000);
    allTx = txData;
  } catch (err) {
    console.error('[Migration] Erro ao buscar transações:', err);
    return { updated: 0, skipped: 0, errors: [err.message] };
  }

  console.log(`[Migration] ${allTx.length} transações encontradas.`);

  const toUpdate = [];
  let skipped = 0;

  for (const tx of allTx) {
    // Skip if already has invoiceMonth
    if (tx.invoiceMonth) {
      skipped++;
      continue;
    }

    // Try to find the card
    let card = null;
    if (tx.cardId && cardById.has(tx.cardId)) {
      card = cardById.get(tx.cardId);
    } else if (tx.paymentMethod) {
      card = cardByName.get(tx.paymentMethod.toLowerCase());
    }

    // Skip if no card found or no closingDay
    if (!card || !card.closingDay) {
      skipped++;
      continue;
    }

    // Calculate invoiceMonth from date + closingDay
    if (!tx.date) {
      skipped++;
      continue;
    }

    const invoiceMonth = getInvoiceMonth(tx.date, card.closingDay);
    if (!invoiceMonth) {
      skipped++;
      continue;
    }

    const patch = { invoiceMonth };
    // Also fix cardId if missing
    if (!tx.cardId && card.id) {
      patch.cardId = card.id;
    }

    toUpdate.push({ id: tx.id, patch });
  }

  console.log(`[Migration] ${toUpdate.length} transações para atualizar, ${skipped} já OK.`);

  // Update in batches of 20
  let updated = 0;
  const errors = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    for (const { id, patch } of batch) {
      try {
        await supabase.from('transactions').update(patch).eq('id', id);
        updated++;
      } catch (err) {
        errors.push(`ID ${id}: ${err.message}`);
      }
    }
    console.log(`[Migration] ${updated}/${toUpdate.length} atualizadas...`);
  }

  console.log(`[Migration] Concluído. ${updated} atualizadas, ${errors.length} erros.`);
  if (errors.length > 0) {
    console.warn('[Migration] Erros:', errors);
  }

  return { updated, skipped, errors };
}

// Expose globally for console usage
if (typeof window !== 'undefined') {
  window.__fixNullInvoiceMonth = fixNullInvoiceMonth;
}
