// ══════════════════════════════════════════
// LÚMEN — Cards (Base44 entity with localStorage cache)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { getLocal, setLocal, hasEntity, ensureEntity } from './helpers';

export function getCards() {
  return getLocal('cards', []);
}

// ── Fetch Cards ──
// Padrão cloud → localStorage:
// 1. Tenta buscar do Base44 (cloud).
// 2. Se a requisição SUCESSO (mesmo com []): cloud é fonte de verdade → atualiza localStorage.
// 3. Se a requisição FALHAR (erro de rede/API): usa localStorage como fallback.
// 4. Se cloud está vazia mas localStorage tem dados: migra local → cloud (first-time sync).
// 5. Salva syncedAt para rastrear a última sync bem-sucedida.
export async function fetchCards() {
  if (!(await ensureEntity('Card'))) return getCards();
  try {
    const cards = await base44.entities.Card.list('', 1000);
    // Cloud respondeu com sucesso — é a fonte de verdade, mesmo que vazio
    setLocal('cards', cards || []);
    setLocal('cards_syncedAt', Date.now());
    // Migrar dados locais se cloud está vazia (first-time sync)
    if (!cards?.length) {
      const local = getCards();
      if (local.length) {
        // Deduplicar por nome antes de migrar
        const seen = new Set();
        const unique = local.filter(c => {
          const key = (c.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        for (const c of unique) {
          await base44.entities.Card.create({
            name: c.name || '', color: c.color || '#3b82f6',
            limit: parseFloat(c.limit) || 0, closingDay: parseInt(c.closingDay) || 1,
            dueDay: parseInt(c.dueDay) || 10, brand: c.brand || 'other',
          });
        }
        const fresh = await base44.entities.Card.list('', 1000);
        setLocal('cards', fresh || []);
        setLocal('cards_syncedAt', Date.now());
        return fresh || [];
      }
    }
    return cards || [];
  } catch (err) {
    // Erro de rede/API — fallback para localStorage
    console.error('[Store] Erro em fetchCards:', err);
    return getCards();
  }
}

export function saveCards(cards) { setLocal('cards', cards); }

export async function addCard(card) {
  const newCard = {
    name: card.name || '', color: card.color || '#3b82f6',
    limit: parseFloat(card.limit) || 0, closingDay: parseInt(card.closingDay) || 1,
    dueDay: parseInt(card.dueDay) || 10, brand: card.brand || 'other',
  };

  if (hasEntity('Card')) {
    try {
      const created = await base44.entities.Card.create(newCard);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return created;
    } catch (err) {
      console.error('[Store] Erro em addCard (Base44):', err);
      toast({ title: 'Erro ao salvar cartão', description: 'Tente novamente ou verifique sua conexão.', variant: 'destructive' });
    }
  }

  // Fallback: localStorage
  const cards = getCards();
  const localCard = { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), ...newCard, createdAt: new Date().toISOString() };
  cards.push(localCard);
  setLocal('cards', cards);
  return localCard;
}

export async function updateCard(id, data) {
  if (hasEntity('Card')) {
    try {
      await base44.entities.Card.update(id, data);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return;
    } catch (err) {
      console.error('[Store] Erro em updateCard:', err);
      toast({ title: 'Erro ao atualizar cartão', description: 'Tente novamente.', variant: 'destructive' });
    }
  }
  const cards = getCards();
  const i = cards.findIndex(c => c.id === id);
  if (i !== -1) { cards[i] = { ...cards[i], ...data }; setLocal('cards', cards); }
}

export async function deleteCard(id) {
  if (hasEntity('Card')) {
    try {
      await base44.entities.Card.delete(id);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return;
    } catch (err) {
      console.error('[Store] Erro em deleteCard:', err);
      toast({ title: 'Erro ao excluir cartão', description: 'Tente novamente.', variant: 'destructive' });
    }
  }
  setLocal('cards', getCards().filter(c => c.id !== id));
}
