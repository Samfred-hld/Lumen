import { supabase } from '@/api/supabaseClient';
import { getPrefix } from './helpers';

const ALL_LS_KEYS = ['cards', 'rules', 'templates', 'salaryConfig', 'extraCats',
  'paymentMethods', 'dashSections', 'suggestionsLog', 'financings',
  'onboarded', 'lastRecurringGen', 'quickDraft', 'theme'];

const ENTITIES_TO_CLEAR = ['transactions', 'budgets', 'goals', 'cards', 'rules', 'templates', 'settings', 'user_configs'];

let _clearing = false;
export function isClearingInProgress() { return _clearing; }

export async function deleteEntityBatch(entity, filterFn) {
  for (let offset = 0; offset < 10000; offset += 1000) {
    const { data, error } = await supabase
      .from(entity)
      .select('id')
      .range(offset, offset + 999);

    if (error || !data?.length) break;

    const ids = filterFn ? data.filter(filterFn).map(r => r.id) : data.map(r => r.id);
    if (!ids.length) continue;

    await supabase.from(entity).delete().in('id', ids);
  }
}

export async function clearAllData(onProgress) {
  _clearing = true;
  try {
    localStorage.setItem('lumen_clearing', '1');

    let step = 0;
    const total = ENTITIES_TO_CLEAR.length;

    for (const entity of ENTITIES_TO_CLEAR) {
      step++;
      if (onProgress) onProgress(step, total, entity);
      await deleteEntityBatch(entity);
    }

    // Clear localStorage
    const prefix = getPrefix();
    for (const key of ALL_LS_KEYS) {
      localStorage.removeItem(prefix + key);
    }
  } finally {
    localStorage.removeItem('lumen_clearing');
    _clearing = false;
  }
}

export { ENTITIES_TO_CLEAR, ALL_LS_KEYS };
