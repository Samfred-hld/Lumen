import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { getLocal, setLocal } from './helpers';
import { toCamelCase, toSnakeCase } from '@/lib/utils';

export function getCards() {
  return getLocal('cards', []);
}

export async function fetchCards() {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = toCamelCase(data || []);
    setLocal('cards', mapped);
    setLocal('cards_syncedAt', Date.now());
    return mapped;
  } catch (err) {
    console.error('[Store] Erro em fetchCards:', err);
    return getCards();
  }
}

export function saveCards(cards) { setLocal('cards', cards); }

export async function addCard(card) {
  const newCard = {
    name: card.name || '',
    color: card.color || '#3b82f6',
    limit: parseFloat(card.limit) || 0,
    closing_day: parseInt(card.closingDay) || 1,
    due_day: parseInt(card.dueDay) || 10,
    brand: card.brand || 'other',
  };

  try {
    const { data, error } = await supabase
      .from('cards')
      .insert(newCard)
      .select()
      .single();

    if (error) throw error;
    await fetchCards();
    return data;
  } catch (err) {
    console.error('[Store] Erro em addCard:', err);
    toast({ title: 'Erro ao salvar cartão', description: 'Tente novamente.', variant: 'destructive' });
    return null;
  }
}

export async function updateCard(id, data) {
  try {
    const { error } = await supabase
      .from('cards')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    await fetchCards();
  } catch (err) {
    console.error('[Store] Erro em updateCard:', err);
    toast({ title: 'Erro ao atualizar cartão', variant: 'destructive' });
  }
}

export async function deleteCard(id) {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchCards();
  } catch (err) {
    console.error('[Store] Erro em deleteCard:', err);
    toast({ title: 'Erro ao excluir cartão', variant: 'destructive' });
  }
}
