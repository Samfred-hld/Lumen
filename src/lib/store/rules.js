import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { matchCorrelation } from '../autoCorrelations';
import { getLocal, setLocal } from './helpers';

export function getRules() { return getLocal('rules', []); }

export async function fetchRules() {
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setLocal('rules', data || []);
    setLocal('rules_syncedAt', Date.now());
    return data || [];
  } catch (err) {
    console.error('[Store] Erro em fetchRules:', err);
    return getRules();
  }
}

export function saveRules(rules) { setLocal('rules', rules); }

export async function addRule(rule) {
  const newRule = { keyword: rule.keyword || '', category: rule.category || '' };

  try {
    const { data, error } = await supabase
      .from('rules')
      .insert(newRule)
      .select();

    if (error) throw error;
    await fetchRules();
    return data || [];
  } catch (err) {
    console.error('[Store] Erro em addRule:', err);
    toast({ title: 'Erro ao salvar regra', variant: 'destructive' });
    return [];
  }
}

export async function deleteRule(id) {
  try {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchRules();
    return fetchRules();
  } catch (err) {
    console.error('[Store] Erro em deleteRule:', err);
    toast({ title: 'Erro ao excluir regra', variant: 'destructive' });
    return getRules();
  }
}

export function suggestCategoryFromRules(description) {
  const rules = getRules();
  const desc = (description || '').toLowerCase();
  for (const rule of rules) {
    if (desc.includes(rule.keyword.toLowerCase())) return rule.category;
  }
  const correlated = matchCorrelation(description);
  if (correlated) return correlated;
  return null;
}
